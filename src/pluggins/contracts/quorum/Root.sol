pragma solidity ^0.5.1;

import "./Actor.sol";
import "./WalletProxy.sol";

contract Root is WalletProxy {

    address public owner;
    address[] public actors;
    mapping (address => address) public ethToActor;
    mapping (address => address) public ethToFValidator;
    uint constant signLen = 65; // ethereum signature length in bytes

    constructor() public {
        owner = msg.sender;
    }

    function registerActor(
        string memory _name,
        string memory _constKey,
        address _ethAddress,
        Actor.ActorTypes _actorType,
        string memory _host,
        uint32 _port
    )
        public
        onlyOwner
    {
        require(ethToActor[_ethAddress] == address(0));
        address newActor = address(
            new Actor(_name, _constKey, _ethAddress, _actorType, _host, _port)
        );
        ethToActor[_ethAddress] = newActor;
        if (_actorType == Actor.ActorTypes.FOREIGN_VALIDATOR) {
            ethToFValidator[_ethAddress] = newActor;
        }
        actors.push(newActor);
    }

    function removeActor(address _actor) public payable onlyOwner {
        addressRemoveByIndex(actors, addressIndexOf(actors, _actor));
        Actor actorToDelete = Actor(_actor);
        delete ethToActor[actorToDelete.ethAddress()];
    }

    function getAllActors() public view returns (address[] memory) {
        return actors;
    }

    function getMyActor() public view returns (address) {
        return ethToActor[msg.sender];
    }

    function addressIndexOf(address[] memory array, address value) private pure returns (uint) {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == value) return i;
        }
        return uint(-1);
    }

    function addressRemoveByIndex(address[] storage array, uint index) private {
        if (index >= array.length) return;

        for (uint i = index; i < array.length - 1; i++) {
            array[i] = array[i+1];
        }
        delete array[array.length - 1];
        array.length--;
    }

    function verify(string memory message, bytes memory signs)
        public
        view
        returns (bool[] memory)
    {
        bytes memory sign;
        uint len;
        assembly { len := mload(signs) }
        bool[] memory res = new bool[](len / signLen);
        uint index = 0;
        for (uint off = 0; off < len; off += signLen) {
            assembly {
                sign := add(signs, off)
                mstore(sign, 65) // signLen
            }
            address signer = recover(message, sign);
            res[index++] = ethToFValidator[signer] != address(0);
        }
        return res;
    }

    function recover(string memory message, bytes memory signature) public pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        // Check the signature length
        if (signature.length != signLen) {
            return address(0);
        }

        bytes32 hash = keccak256(bytes(message));

        // Divide the signature in r, s and v variables
        // ecrecover takes the signature parameters, and the only way to get them
        // currently is to use assembly.
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
        if (v < 27) {
            v += 27;
        }

        // If the version is correct return the signer address
        if (v != 27 && v != 28) {
            return (address(0));
        } else {
            return ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)), v, r, s);
        }
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }
}
