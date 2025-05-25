# Celda Cross-Chain Multi-Hop Router Contracts

This folder contains three smart contracts—**L1Celda**, **FujiCelda**, and **ExternalCelda**—that together enable **multi-hop, programmable cross-chain token swaps and actions** across Avalanche L1, Avalanche Fuji, and external EVM chains. 

The design is inspired by the [Tesseract Protocol's Cell contracts](https://github.com/tesseract-protocol/smart-contracts/blob/main/src/Cell.sol), but built to fit the specific bridging and messaging standards of each supported ecosystem. Much like the [Cell contracts](https://github.com/tesseract-protocol/smart-contracts/blob/main/src/Cell.sol) these contracts can perform 3 functionalities:

1. Initiate a multi-hop operation (acting as the first hop).

2. Receive tokens/messages as a hop in the chain.

3. Forward (sendAndCall-style) to another chain, if the payload indicates more hops.


---

## Table of Contents

- [Overview](#overview)
- [Workflow Example](#workflow-example)
    - [Diagram: Multi-hop Swap L1 → Fuji → External](#diagram-multi-hop-swap-l1--fuji--external)
- [Contract Functionalities](#contract-functionalities)
- [Key Differences](#key-differences)
- [Protocols Used](#protocols-used)
- [Structuring and Design Inspiration](#structuring-and-design-inspiration)
- [Security Considerations](#security-considerations)
- [Development Notes](#development-notes)

---

## Overview

These contracts serve as **cross-chain routers** that enable programmable, atomic, and composable actions (like swaps or further bridging) across chains by forwarding tokens and encoded instructions as a payload between contracts. Each contract is tailored to the messaging/bridging protocol of its respective domain:

- **L1Celda:** For Avalanche L1, uses ICM/ICTT (Tesseract Teleporter stack)
- **FujiCelda:** For Avalanche Fuji C-Chain, dynamically uses ICM/ICTT or CCIP depending on the destination
- **ExternalCelda:** For any external EVM chain, uses Chainlink CCIP

The contracts are **multi-hop aware**: they can initiate, receive, and forward complex cross-chain operations, enabling scenarios like "swap on L1, bridge to Fuji, swap again, bridge to Polygon, and finally deliver" in a single atomic workflow.

---

## Workflow Example

### Multi-hop Swap: Avalanche L1 → Fuji → External Chain

1. **User initiates a swap on Avalanche L1** by calling `L1Celda.initiate()` with a payload describing the full route (all hops, swaps, recipients, etc.).
2. `L1Celda` (on Avalanche L1) optionally performs an on-chain swap, then calls `IERC20TokenTransferrer.sendAndCall` to bridge tokens and the payload to Fuji.
3. **FujiCelda** (on Avalanche Fuji) receives tokens and payload (via Teleporter), performs its routing logic (optional swap), then checks the next hop:
    - If the next hop is another Avalanche chain, forwards via ICM/ICTT.
    - If the next hop is an external chain, it packages the payload and tokens and sends them using Chainlink CCIP.
4. **ExternalCelda** (on an external EVM chain like Polygon, Arbitrum, etc.) receives tokens and payload via CCIP, processes any final swap, and delivers tokens to the end recipient.

#### Diagram: Multi-hop Swap L1 → Fuji → External

```
+-----------+   ICM/ICTT    +-----------+   CCIP    +-------------------+
|  L1Celda  | ------------> | FujiCelda | ------->  |  ExternalCelda    |
| (Avalanche|               |  (Fuji)   |           | (Polygon, etc.)   |
+-----------+               +-----------+           +-------------------+
      |                          |                       |
   [initiate]                [receive]                 [receive]
      |                          |                       |
   (swap?)                  (swap/forward)           (swap/finalize)
      |                          |                       |
      +---payload+tokens-------->+---payload+tokens----->+
```

**Legend:**  
- Solid arrows = cross-chain message and token transfer  
- Each contract decodes the payload, performs a swap if needed, then either finalizes or forwards based on hop data

---

## Contract Functionalities

All three contracts provide:

- **Multi-Hop Initiation:**  
  Start a complex cross-chain flow by specifying all hops in the payload.

- **Cross-Chain Receiving:**  
  Accept tokens and a payload from the bridge protocol, decode instructions, and process accordingly.

- **Routing & Forwarding:**  
  After local processing (and optional DEX swap), determine the next hop and forward tokens and updated payload using the correct protocol for the destination.

- **Composable Swaps:**  
  Each contract includes a `_maybeSwap` function that can be customized to integrate with local DEXes, enabling swap-on-receipt at any hop.

- **Atomic Delivery:**  
  On the final hop, tokens are delivered to the final recipient.

---

## Key Differences

| Feature              | L1Celda                | FujiCelda          | ExternalCelda         |
|----------------------|------------------------|--------------------|-----------------------|
| Chain                | Avalanche L1           | Avalanche Fuji     | External EVM (Polygon, Arbitrum, etc.) |
| Bridge Protocol      | ICM/ICTT (Teleporter)  | ICM/ICTT **or** CCIP (dynamic) | CCIP (Chainlink)      |
| Initiation           | sendAndCall (ICTT)     | sendAndCall (ICTT) or ccipSend  | ccipSend (CCIP)       |
| Receiving Function   | receiveTokensAndPayload| receiveTokensAndPayload, ccipReceive | ccipReceive (CCIP)   |
| Forwarding           | Always ICTT            | ICTT if AVA hop, CCIP if external | Always CCIP           |
| Swap Functionality   | Yes                    | Yes                | Yes                   |

---

## Protocols Used

- **ICM/ICTT:**
    - Used for bridging tokens (ICTT) and payloads (ICM) between Avalanche subnets and L1.
    - Provides a `sendAndCall` interface, triggering a destination contract's handler with tokens and message.

- **Chainlink CCIP:**
    - Used for messaging and token transfer to/from external EVM chains.
    - Uses `ccipSend` to send `EVM2AnyMessage` structs (with tokens + payload), and `ccipReceive` for delivery.

---

## Structuring and Design Inspiration

- **Inspired by [Tesseract's Cell contract](https://github.com/tesseract-protocol/smart-contracts/blob/main/src/Cell.sol):**
    - The Cell pattern provides a composable, multi-hop cross-chain routing engine.
    - Each "hop" can perform arbitrary logic (swap, forward, deliver).
    - These contracts modularize Cell's logic to be protocol- and chain-specific, improving code clarity and extensibility.

- **Key Architectural Features:**
    - Each contract can both initiate and receive multi-hop flows.
    - Routing is data-driven: the payload fully describes the workflow, enabling arbitrary cross-chain action chaining.
    - Supports seamless DEX integration and future extensions.

---

## Security Considerations

- **Bridging Entry Points:**  
  Only the respective bridge routers (ICTT Token Transferrer or CCIP Router) are permitted to call the receiving functions (guarded by `msg.sender` checks).
- **Payload Validation:**  
  Always validate payload length and contents before acting.
- **Token Approvals:**  
  Approvals to bridge/router contracts are done just-in-time and can be zeroed after use for extra safety.

---

## Development Notes

- **ICM/ICTT Integration:**  
  Uses [`IERC20TokenTransferrer`](https://github.com/tesseract-protocol/smart-contracts/blob/main/src/interfaces/IERC20TokenTransferrer.sol) for bridging and message passing.
- **CCIP Integration:**  
  Uses [`IRouterClient` and Client.EVM2AnyMessage`](https://github.com/smartcontractkit/ccip-contracts) interfaces for secure, composable cross-chain actions.
- **DEX Integration:**  
  The `_maybeSwap` function is left as a stub for you to integrate with your preferred DEX aggregator or router.

---

## Example Usage

1. **User calls `L1Celda.initiate()` with:**  
    - token, amount, and a fully-specified `CeldaPayload` (including all hops, swap data, and final recipient).
2. **L1Celda**:  
    - (Optionally) swaps locally, then forwards tokens + payload via ICTT to Fuji.
3. **FujiCelda**:  
    - Receives on Fuji, processes (swap/forward), then either:
        - Sends via ICTT to another Avalanche chain, or
        - Sends via CCIP to an external EVM chain.
4. **ExternalCelda**:  
    - Receives via CCIP, processes (swap), delivers to user.

---

## References

- [Tesseract Protocol Smart Contracts](https://github.com/tesseract-protocol/smart-contracts)
- [Chainlink CCIP Docs](https://docs.chain.link/ccip/)
- [Chainlink CCIP Contracts on npm](https://www.npmjs.com/package/@chainlink/contracts-ccip)

---