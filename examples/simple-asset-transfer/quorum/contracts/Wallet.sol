pragma solidity ^0.5.1;


contract Wallet {

    struct AssetProperties {
        string property1;
        string property2;
    }

    struct Asset {
        string assetID;
        string dltID;
        string origins;
        AssetProperties properties;
        bool locked;
        string targetDltId;
        string receiverPK;
    }

    address public owner;
    mapping (bytes32 => Asset) assetMap;

    constructor() public {
        owner = msg.sender;
    }

    function getAsset(string memory assetID) public view returns (
        string memory dltID,
        string memory origins,
        string memory property1,
        string memory property2,
        bool locked,
        string memory targetDltId,
        string memory receiverPK
    )
    {
        require( bytes(assetMap[sha256(bytes(assetID))].assetID).length != 0 );
        Asset storage pA = assetMap[sha256(bytes(assetID))];
        dltID = pA.dltID;
        origins = pA.origins;
        property1 = pA.properties.property1;
        property2 = pA.properties.property2;
        locked = pA.locked;
        targetDltId = pA.targetDltId;
        receiverPK = pA.receiverPK;
    }

    function createAsset(
        string memory assetID,
        string memory origins,
        string memory property1,
        string memory property2
    )
        public
        onlyOwner
    {
        require(bytes(assetMap[sha256(bytes(assetID))].assetID).length == 0 );
        assetMap[sha256(bytes(assetID))] = Asset(
            assetID,
            "Accenture_DLT",
            origins,
            AssetProperties(property1, property2),
            false,
            "",
            ""
        );
    }

    function lockAsset(
        string memory assetID,
        string memory targetDltId,
        string memory receiverPK
    )
        public
        onlyOwner
    {
        require(bytes(assetMap[sha256(bytes(assetID))].assetID).length != 0 );
        Asset storage pA = assetMap[sha256(bytes(assetID))];
        pA.locked = true;
        pA.targetDltId = targetDltId;
        pA.receiverPK = receiverPK;
    }

    function setProperty(
        string memory assetID,
        string memory propertyName,
        string memory propertyValue
    )
        public
        onlyOwner
    {
        require(bytes(assetMap[sha256(bytes(assetID))].assetID).length != 0);
        Asset storage pA = assetMap[sha256(bytes(assetID))];
        if ( sha256(bytes(propertyName)) == sha256(bytes("property1")) ) {
            pA.properties.property1 = propertyValue;
        } else {
            pA.properties.property2 = propertyValue;
        }
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }
}
