// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/chainlink-contracts/src/v0.8/ccip/interfaces/IRouterClient.sol";

struct CeldaPayload {
    address[] hopRouters;
    uint64[] hopChainSelectors;
    uint8 currentHop;
    address finalRecipient;
    bytes[] swapDatas;
}

contract ExternalCelda {
    using SafeERC20 for IERC20;

    address public immutable ccipRouter;
    address public immutable allowedRouter;

    event Forwarded(address indexed toChain, address router, address token, uint256 amount, uint8 hopIndex);
    event Swap(address indexed tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);

    constructor(address _ccipRouter) {
        ccipRouter = _ccipRouter;
        allowedRouter = _ccipRouter;
    }

    function initiate(
        address token,
        uint256 amount,
        CeldaPayload memory payload
    ) external payable {
        require(amount > 0, "amount zero");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _route(token, amount, payload);
    }

    // CCIP router will call this function on the destination
    function ccipReceive(
        bytes32, // messageId (not used)
        Client.Any2EVMMessage calldata message
    ) external {
        require(msg.sender == allowedRouter, "Only CCIP router can call");
        // Only support single-token transfers for now
        require(message.destTokenAmounts.length == 1, "One token per hop supported");
        address token = message.destTokenAmounts[0].token;
        uint256 amount = message.destTokenAmounts[0].amount;
        CeldaPayload memory payload = abi.decode(message.data, (CeldaPayload));
        _route(token, amount, payload);
    }

    function _route(address token, uint256 amount, CeldaPayload memory payload) internal {
        uint8 hop = payload.currentHop;
        (address outToken, uint256 outAmount) = _maybeSwap(token, amount, payload.swapDatas[hop]);

        payload.currentHop += 1;
        if (payload.currentHop >= payload.hopRouters.length) {
            IERC20(outToken).safeTransfer(payload.finalRecipient, outAmount);
        } else {
            _sendAndCall(outToken, outAmount, payload);
        }
    }

    // Override for actual DEX logic. Dummy passthrough here.
    function _maybeSwap(address token, uint256 amount, bytes memory swapData)
        internal
        virtual
        returns (address, uint256)
    {
        // TODO: implement actual DEX logic, swapData could encode target DEX and trade params
        emit Swap(token, amount, token, amount);
        return (token, amount);
    }

    function _sendAndCall(address token, uint256 amount, CeldaPayload memory payload) internal {
        uint8 hop = payload.currentHop;
        uint64 destChainSelector = payload.hopChainSelectors[hop];
        address destRouter = payload.hopRouters[hop];

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(destRouter),
            data: abi.encode(payload),
            tokenAmounts: new Client.EVMTokenAmount[](1),
            extraArgs: "",
            feeToken: address(0)
        });
        message.tokenAmounts[0] = Client.EVMTokenAmount(token, amount);

        IERC20(token).approve(ccipRouter, amount);

        // Get fee
        uint256 fee = IRouterClient(ccipRouter).getFee(destChainSelector, message);
        require(msg.value >= fee, "Insufficient fee for CCIP");

        IRouterClient(ccipRouter).ccipSend{value: fee}(
            destChainSelector,
            message
        );
        emit Forwarded(destRouter, destRouter, token, amount, hop);
    }
}