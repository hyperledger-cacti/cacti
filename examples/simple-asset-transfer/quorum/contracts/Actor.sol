pragma solidity ^0.5.1;

contract Actor {

    enum ActorTypes {
        PARTICIPANT,
        VALIDATOR,
        FOREIGN_VALIDATOR
    }

    string public name;
    string public constKey;
    address public ethAddress;
    ActorTypes public actorType;
    string public host;
    uint32 public port;

    // TODO do we store key here?
    string public key;

    constructor(
        string memory _name,
        string memory _constKey,
        address _ethAddress,
        ActorTypes _actorType,
        string memory _host,
        uint32 _port
    )
        public
    {
        name = _name;
        constKey = _constKey;
        actorType = _actorType;
        ethAddress = _ethAddress;
        host = _host;
        port = _port;
    }

    function getActorDetails()
        public
        view
        returns (string memory, string memory, address, ActorTypes, string memory, uint32)
    {
        return (name, constKey, ethAddress, actorType, host, port);
    }
}
