WALLET smart contract
===================

The contract provides methods to create assets, read their state and lock them.

`AssetOrigin` structure
-----------------------

Defines the asset's origin.

    type AssetOrigin struct {
        OriginDltID   string `json:"origin_dlt_id"`
        OriginAssetID string `json:"origin_asset_id"`
    }


`AssetProperties` structure
---------------------------

Represents the other functional properties of the asset.

    type AssetProperties struct {
        Property1 string `json:"property1"`
        Property2 string `json:"property2"`
    }


`Asset` structure
-----------------

Represents the main object to be manipulated by the contract.

    type Asset struct {
        AssetID     string          `json:"asset_id"`
        DltID       string          `json:"dlt_id"`
        Origin      []AssetOrigin   `json:"origin"`
        Properties  AssetProperties `json:"properties"`
        Locked      bool            `json:"locked"`
        TargetDltID string          `json:"target_dlt_id"`
        ReceiverPK  string          `json:"receiver_pk"`
    }


`createAsset` method
--------------------

Creates new asset.

Takes an array of strings where
1. 1st element is an JSON representation of the `Asset` being created. Its
   'AssetID' property is used to reference the asset in future calls and must
   be unique across the assets of this contract. If not unique, the error is
   returned.

On success, the created asset is returned as a JSON string.


`lockAsset` method
------------------

Locks the specified asset.

Takes an array of strings where
1. 1st element is an `asset_id` of the asset being locked,
2. 2nd element is a `target_dlt_id` is the DLT ID that the asset is locked
   for. This goes directly to asset's `TargetDltID` property.
3. 3rd element is a `receiver_pk` and goes to `ReceiverPK` property of the asset.

On success, the locked asset is returned as a JSON string.


`setProperty` method
--------------------

Updates the specified property of the specified asset.

Takes an array of strings where
1. 1st element is an `asset_id` of the asset being updated,
2. 2nd element is the name of the property to be updated and may be one of
   * "`property1`"
   * "`property2`"
3. 3rd element is the value that is assigned to the selected property.

On success, the updated asset is returned as a JSON string.


`query` method
--------------

Returns the given asset. Note, that this is a query method that does not make
any updates.

Takes an array of strings where
1. 1st element is an `asset_id` of the asset being queried,

On success, the asset is returned as a JSON string.



MYCC smart contract
===================

The contract provides methods to keep track of foreign validators and their ECC keys.

`addPubKey` method
------------------

Adds public key of foreign validator. These keys will be used in `verify`
method to check the signatures made by the validators.

Takes an array of strings where
1. 1st element is the public key (ECC, compressed format, 66 hex digits),
2. 2nd element is the name of the validator.

On success, the updated the public key is returned as a JSON string.


`verify` method
---------------

Verifies that the given message is signed by the known validators. Known
validators are those, whose public key is previously introduced through
`addPubKey` method. Note, that this is a query method that does not make any
updates.

Takes an array of strings where
1. 1st element is a string to be verified. This is usually an asset in a JSON
   format.
2. 2nd is the public key of the validator, who signed it. The same format as
   before.
3. 3rd is the signature (64 bytes of 'r' and 'c' components).
4. Optionally, (2) and (3) may repeat multiple times.

Return a boolean array of verification results: each element is the
verification of a (public key, signature) pair from arguments.
