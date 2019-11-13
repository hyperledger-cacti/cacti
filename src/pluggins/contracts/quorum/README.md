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