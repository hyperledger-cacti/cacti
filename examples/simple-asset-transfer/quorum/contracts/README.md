Root smart contract
===================

The contract keeps track of foreign validators (call them Actors) and their
ECC keys.


Constructor
-----------

Initializes the contract. Takes no parameters. No value is returned.


`registerActor` method
----------------------

Adds foreign validator credentials. These keys will be used in `verify` method
to check the signatures made by the validators. To store the values, creates
an `Actor` contract described below.

Takes the following parameters:
1. `name` - string name of the validator,
2. `constKey` - not used here,
3. `ethAddress` - ethereum address (first 20 bytes of keccak256 hash) of the
   public key.
4. `actorType` - must be `ActorTypes.FOREIGN_VALIDATOR`. See below for
   details,
5. `host` - not used here,
6. `port` - not used here.

No value is returned.


`getAllActors` method
---------------------

Returns `Actor` contract addresses registered so far. Takes no
parameters. Note, that this is a query method that does not make any updates.


`getMyActor` method
-------------------

Returns `Actor` contract address associated with the caller (i.e. having the
save `ethAddress` member as the callers address). Takes no parameters. Note,
that this is a query method that does not make any updates.


`verify` method
---------------

Verifies that the given message is signed by the known validators. Known
validators are those, whose public key is previously introduced through
`registerActor` method. Note, that this is a query method that does not make
any updates.

Takes the following parameters:
1. `message` - message string to verify signatures for. This is usually an
   asset in a JSON format.
2. `signs` - bytes array that is a join of signatures to check, each signature
   is 65 bytes.

Return a boolean array of verification results: each element is the
verification of the corresponding signature.


Actor smart contract
====================

The contract represents details of general actor. In our case, we use it to
store validator details only.


`ActorTypes` enum
-----------------

    enum ActorTypes {
        PARTICIPANT,
        VALIDATOR,
        FOREIGN_VALIDATOR
    }

Only `FOREIGN_VALIDATOR` is used.


Constructor
-----------

Initializes actor details to be stored.

Takes the following parameters:
1. `name` - string name of the validator,
2. `constKey` - not used here,
3. `ethAddress` - ethereum address (first 20 bytes of keccak256 hash) of the
   public key.
4. `actorType` - must be `ActorTypes.FOREIGN_VALIDATOR`. See above for
   details,
5. `host` - not used here,
6. `port` - not used here.

No value is returned.



`getActorDetails` method
------------------------

Returns the actor details as saved by the constructor. Note, that this is a
query method that does not make any updates.


Wallet smart contract
====================

The contract provides methods to create assets, read their state and lock
them.

`AssetProperties` structure
---------------------------

    struct AssetProperties {
        string property1;
        string property2;
    }


`Asset` structure
-----------------

    struct Asset {
        string assetID;
        string dltID;
        string origins;
        AssetProperties properties;
        bool locked;
        string targetDltId;
        string receiverPK;
    }

`createAsset` method
--------------------

Creates new asset. May be called only by the owner of this contract.

Takes the following parameters:
1. `assetID` - a string representing a unique asset ID managed by this contract,
2. `origins` - a string going directly to `origins` property of the new asset,
3. `property1` - a string going directly to `property1` property of the new
   asset's properties,
3. `property2` - a string going directly to `property2` property of the new
   asset's properties,

No value is returned.


`lockAsset` method
------------------

Locks the specified asset.

Takes the following parameters:
1. `assetID` - a string representing the asset being locked,
2. `targetDltId` is the DLT ID that the asset is locked for. This goes
   directly to asset's `targetDltID` property.
3. `receiverPk` and goes to `receiverPK` property of the asset.

No value is returned.


`setProperty` method
--------------------

Updates the specified property of the specified asset.

Takes the following parameters:
1. `assetID` - a string representing the asset being updated,
2. `propertyName` - a name of the property to be updated and may be one of
   * "`property1`"
   * "`property2`"
3. `propertyValue` - a string value that is assigned to the selected property.

No value is returned.


`getAsset` method
-----------------

Returns the given asset. Note, that this is a query method that does not make
any updates.

Takes `assetID` string as its argument.

Returns the Asset structure as an array of fields.
