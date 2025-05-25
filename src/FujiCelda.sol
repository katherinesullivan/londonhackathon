// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/icm-contracts/contracts/ictt/interfaces/IERC20TokenTransferrer.sol";
import "../lib/chainlink-contracts/src/v0.8/ccip/interfaces/IRouterClient.sol";

struct CeldaPayload {
    address[] hopRouters;
    bytes32[] hopBlockchainIDs;     // for AVA/ICTT hops
    address[] hopTokenTransferrers; // for AVA/ICTT hops
    uint64[] hopChainSelectors;     // for CCIP hops
    bool[] isAvalancheHop;          // true: use ICTT, false: use CCIP
    uint8 currentHop;
    address finalRecipient;
    bytes[] swapDatas;
}

contract FujiCelda {
    using SafeERC20 for IERC20;

    address public immutable icttTokenTransferrer;
    address public immutable ccipRouter;

    event Forwarded(address indexed toChain, address router, address token, uint256 amount, uint8 hopIndex);
    event Swap(address indexed tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);

    constructor(address _icttTokenTransferrer, address _ccipRouter) {
        icttTokenTransferrer = _icttTokenTransferrer;
        ccipRouter = _ccipRouter;
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

    // Called by bridge receiver (ICM/ICTT or CCIP)
    // For ICTT, this is called by the token transferrer (tokens already in contract)
    // For CCIP, this is called as ccipReceive (see below)
    function receiveTokensAndPayload(
        address token,
        uint256 amount,
        bytes calldata payloadData
    ) external {
        CeldaPayload memory payload = abi.decode(payloadData, (CeldaPayload));
        _route(token, amount, payload);
    }

    // Chainlink CCIP router will call this for cross-chain token+message receives
    function ccipReceive(
        bytes32, // messageId (not used)
        Client.Any2EVMMessage calldata message
    ) external {
        require(msg.sender == ccipRouter, "Only CCIP router can call");
        require(message.tokenAmounts.length == 1, "One token per hop supported");
        address token = message.tokenAmounts[0].token;
        uint256 amount = message.tokenAmounts[0].amount;
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
        address destRouter = payload.hopRouters[hop];

        if (payload.isAvalancheHop[hop]) {
            bytes32 destBlockchainID = payload.hopBlockchainIDs[hop];
            address destTransferrer = payload.hopTokenTransferrers[hop];
            IERC20(token).safeApprove(icttTokenTransferrer, amount);
            IERC20TokenTransferrer(icttTokenTransferrer).sendAndCall(
                destBlockchainID,
                destTransferrer,
                destRouter,
                abi.encode(payload),
                amount
            );
        } else {
            uint64 destChainSelector = payload.hopChainSelectors[hop];

            Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
                receiver: abi.encode(destRouter),
                data: abi.encode(payload),
                tokenAmounts: new Client.EVMTokenAmount[](1),
                extraArgs: "",
                feeToken: address(0)
            });
            message.tokenAmounts[0] = Client.EVMTokenAmount(token, amount);

            IERC20(token).safeApprove(ccipRouter, amount);

            // Get fee for CCIP
            uint256 fee = IRouterClient(ccipRouter).getFee(destChainSelector, message);
            require(msg.value >= fee, "Insufficient fee for CCIP");

            IRouterClient(ccipRouter).ccipSend{value: fee}(
                destChainSelector,
                message
            );
        }
        emit Forwarded(destRouter, destRouter, token, amount, hop);
    }
}