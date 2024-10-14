// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import "@mapprotocol/protocol/contracts/interface/ILightVerifier.sol";
import "@mapprotocol/protocol/contracts/utils/Utils.sol";
import "../interface/IEvent.sol";

library EvmDecoder {
    bytes32 constant MAP_MESSAGE_TOPIC = keccak256(bytes("MessageOut(uint256,uint256,bytes32,bytes,bytes)"));

    function decodeDataLog(
        ILightVerifier.txLog memory log
    ) internal pure returns (IEvent.dataOutEvent memory outEvent) {
        outEvent.fromChain = uint256(log.topics[1]);
        outEvent.toChain = uint256(log.topics[2]);

        (outEvent.orderId, outEvent.fromAddress, outEvent.messageData) = abi.decode(log.data, (bytes32, bytes, bytes));
    }
}
