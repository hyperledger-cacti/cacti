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
