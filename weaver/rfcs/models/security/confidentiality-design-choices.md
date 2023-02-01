<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Design Choices for End-to-End Confidentiality Mechanism

- RFC: 01-008-appendix
- Authors: Venkatraman Ramakrishna, Dhinakaran Vinayagamurthy, Sandeep Nishad, Krishnasuri Narayanam, Sikhar Patranabis
- Status: Proposed
- Since: 10-May-2022


## Summary

To fulfil the requirements described in the [end-to-end confidentiality spec](./confidentiality.md), the view contents returned by the source ledger must contain some authentication of the payload that can validate the plaintext contents as decrypted by the destination client. This allows the destination peers to validate the plaintext against tampering by the client. The solution for this was to add a hash of some form within the interoperation payload in the view.

## General Considerations

For private (confidential) portions of a view's contents:
- They should be encrypted with the receiver's public key.
- If they only need tamper protection, they should be hashed.
- If they need tamper protection and need to be authenticated by the receiver, they should be hashed and signed.

For public (non-confidential) portions of a view's contents:
- If they need to be authenticated by the receiver, they should be signed.
- If they only need tamper protection, they can be either hashed or signed.

## View Generation Options

There are different mechanisms and protocols for hash creation and verification. We will list all of these below, with comments on their security and usability. The following key is used:
- _DIM_: Destination Interoperation Module
- _DP_: Destination Peer
- _DC_: Destination Client
- _SIM_: Source Interoperation Module
- _SP_: Source Peer
- _M_: Message, i.e., confidential view contents
- _C_: Ciphertext, i.e., encrypted data
- _P_: Payload, i.e., of the view
- _Sigma_: Signature over view payload

_Note_: we will not explicitly mention the keys and certificates used to generate and verify digital signatures below. The fact that peers possess certificates and corresponding private keys for signing is implied.

### Protocol #1

Use SHA256 to hash the confidential view contents, and supply the hash as plaintext in the view.

SIM computes:
```
C = Encrypt(M)
P = C || SHA256Hash(M)
```
SP computes:
```
Sigma = Sign(P)
```
DC computes:
```
M' = Decrypt(C)
```
DIM computes:
```
Verify(Sigma, P) == TRUE
(C', H) = Parse(P)
Verify: H == SHA256Hash(M')
```
_Comments_: This protocol provides authenticity of message to the DIM, but the confidentiality vis-a-vis the relays and potential network eavesdroppers is weak since SHA256 doesn't provide ``semantic security'' guarantees that are expected from an encryption scheme. Semantic security provides assurance of M being confidential even if the message space is finite and known to an adversary. Hash functions like SHA256 don't (and are not expected to) provide this property.

### Protocol #2

Use SHA256 to hash the confidential view contents, sign the hash, and encrypt the hash, within thr view.

SP computes:
```
S = Sign(SHA256Hash(M))
C = Encrypt(M || S)
Sigma = Sign(C)
```
DC computes:
```
C' = Decrypt(C)
```
DIM computes:
```
Verify(Sigma, C) == TRUE
M' || S' = Parse(C')
Verify: S' == Sign(SHA256Hash(M'))
```
_Comments_: Because further data manipulation is required after signing, the view generation logic above cannot be done in an interoperation module, and instead must be done by the peer process that has signing privileges. Therefore, this protocol requires customization of the peer's signing process, which may involve modification of the DLT platform code. E.g., in Hyperledger Fabric, this can be done using a [custom ESCC](https://hyperledger-fabric.readthedocs.io/en/latest/pluggable_endorsement_and_validation.html). Overall, this is more intrusive and less usable than if all logic bar the final signature were restricted to the SIM.

### Protocol #3

Encrypt and hash (with SHA256) the confidential view contents, and encrypt and hash this pair again in order to increase the entropy of the final hash's preimage.

SIM computes:
```
C = Encrypt(M)
H = SHA256Hash(M)
C1 = C || H
C2 = Encrypt(C1)
H1 = SHA256Hash(C1)
P = C2 || H1
```
SP computes:
```
Sigma = Sign(P)
```
DC computes:
```
C2 || H1 = Parse(P)
C2` = Decrypt(C2)
C1' || H' = Parse(C2')
M' = Decrypt(C1')
```
DIM computes:
```
Verify(Sigma, P) == TRUE
Verify: H1 == SHA256Hash(C2')
Verify: H' == SHA256Hash(M')
```
_Comments_: Secure but somewhat convoluted and inefficient, as it required multiple encryptions and hashes, and the protocol requires no peer modification or custom signing logic.

### Protocol #4

Simplified and more efficient form of Protocol #3: append a random value to the message to increase entropy, and just do one round of encryption and hashing.

SIM computes:
```
M1 = M || r             ; 'r' is sampled randomly by SIM
C = Encrypt(M1)
H = SHA256Hash(M1)
P = C || H
```
SP computes:
```
Sigma = Sign(P)
```
DC computes:
```
C || H = Parse(P)
M1 = Decrypt(C)
```
DIM computes:
```
Verify(Sigma, P) == TRUE
M' || r' = Parse(M1)
Verify: H == SHA256Hash(M' || r')
```
_Comments_: Security is dependent on the randomness of the sampled value, and the protocol requires no peer modification or custom signing logic.

### Protocol #5

Specific variation of Protocol #4: use HMAC to hash the confidential view contents along with a randomly sampled value, and encrypt the random value in the view.

SIM computes:
```
M' = M || r             ; 'r' is sampled randomly by SIM
C = Encrypt(M')
P = C || HMAC(r, M)
```
SP computes:
```
Sigma = Sign(P)
```
DC computes:
```
M1 = Decrypt(C)
```
DIM computes:
```
Verify(Sigma, P) == TRUE
C' || H = Parse(P)
M2 || r' = Parse(M1)
Verify: H == HMAC(r', M2)
```
_Comments_: The hashing is secure (HMAC provides assured randomness, or entropy) and the protocol requires no peer modification or custom signing logic. Using HMAC enables provable security [1] of the [authenticity property](./confidentiality.md#security-concerns-and-threat-model) we strive for in our system.


## References
1. New Proofs for NMAC and HMAC: Security without Collision-Resistance, Mihir Bellare, Crypto 2006 eprint: https://eprint.iacr.org/2006/043.pdf.
