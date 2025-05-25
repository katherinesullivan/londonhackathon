// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/icm-contracts/contracts/ictt/interfaces/IERC20TokenTransferrer.sol";

struct CeldaPayload {
    address[] hopRouters;
    bytes32[] hopBlockchainIDs;
    address[] hopTokenTransferrers;
    uint8 currentHop;
    address finalRecipient;
    bytes[] swapDatas; // swap instructions per hop
}

contract L1Celda {
    using SafeERC20 for IERC20;

    address public immutable icttTokenTransferrer; // this should then be mutable and updatable with hop info

    event Forwarded(address indexed toChain, address router, address token, uint256 amount, uint8 hopIndex);
    event Swap(address indexed tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);

    constructor(address _icttTokenTransferrer) {
        icttTokenTransferrer = _icttTokenTransferrer;
    }

    function initiate(
        address token,
        uint256 amount,
        CeldaPayload memory payload
    ) external {
        require(amount > 0, "amount zero");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _route(token, amount, payload);
    }

    // Called by ICTT token transferrer bridge after cross-chain hop.
    // Tokens are already transferred to this contract by the bridge.
    function receiveTokensAndPayload(
        address token,
        uint256 amount,
        bytes calldata payloadData
    ) external {
        CeldaPayload memory payload = abi.decode(payloadData, (CeldaPayload));
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
        // For now, passthrough
        emit Swap(token, amount, token, amount);
        return (token, amount);
    }

    function _sendAndCall(address token, uint256 amount, CeldaPayload memory payload) internal {
        uint8 hop = payload.currentHop;
        bytes32 destBlockchainID = payload.hopBlockchainIDs[hop];
        address destTransferrer = payload.hopTokenTransferrers[hop];
        address destRouter = payload.hopRouters[hop];

        IERC20(token).safeApprove(icttTokenTransferrer, amount);
        IERC20TokenTransferrer(icttTokenTransferrer).sendAndCall(
            destBlockchainID,
            destTransferrer,
            destRouter,
            abi.encode(payload),
            amount
        );
        emit Forwarded(destRouter, destRouter, token, amount, hop);
    }
}