// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IMapoService {
    struct CallData {
        bytes target;
        bytes callData;
        uint256 gasLimit;
        uint256 value;
    }

    function transferOut(uint256 _toChain, CallData memory _callData) external payable returns (bool);
}

contract OmniDictionary is Ownable {
    address MapoService;

    mapping(string => string) public dictionary;

    mapping(address => bool) public whitelist;

    function setDictionaryEntry(string memory _key, string memory _val) external returns (bool) {
        require(whitelist[msg.sender], "access denied");
        dictionary[_key] = _val;
        return true;
    }

    //encode dictionary input (key,value) together with 'setDictionaryEntry' method
    function encodeDictionaryInput(string memory _key, string memory _val) public pure returns (bytes memory data) {
        data = abi.encodeWithSelector(OmniDictionary.setDictionaryEntry.selector, _key, _val);
    }

    //only whitelist address can acess dictionary setting method
    function setWhiteList(address _executeAddress) external onlyOwner {
        whitelist[_executeAddress] = true;
    }

    //set the underlying mapo ominichain service contract
    function setMapoService(address _IMapoService) external onlyOwner {
        MapoService = _IMapoService;
    }

    //send the custom dictionary input(_key, _value) to the target dictionary address spcified by '_target' on target chain specified by '_tochainId'
    function sendDictionaryInput(
        uint256 _tochainId,
        bytes memory _target,
        string memory _key,
        string memory _val
    ) external {
        bytes memory data = encodeDictionaryInput(_key, _val);

        IMapoService.CallData memory cData = IMapoService.CallData(_target, data, 50000, 0);

        require(IMapoService(MapoService).transferOut(_tochainId, cData), "send request failed");
    }
}
