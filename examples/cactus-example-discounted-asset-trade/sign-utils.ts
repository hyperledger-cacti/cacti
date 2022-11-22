/*
 * Copyright 2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Util tools used for cryptography related to hyperledger fabric (e.g. signing proposals)
 */

const hash = require("fabric-client/lib/hash");
import jsrsa from "jsrsasign";
import elliptic from "elliptic";

const ellipticCurves = elliptic.curves as any;

/**
 * This function comes from `CryptoSuite_ECDSA_AES.js` and will be part of the
 * stand alone fabric-sig package in future.
 *
 */
const ordersForCurve: Record<string, any> = {
  secp256r1: {
    halfOrder: ellipticCurves.p256.n.shrn(1),
    order: ellipticCurves.p256.n,
  },
  secp384r1: {
    halfOrder: ellipticCurves.p384.n.shrn(1),
    order: ellipticCurves.p384.n,
  },
};

/**
 * This function comes from `CryptoSuite_ECDSA_AES.js` and will be part of the
 * stand alone fabric-sig package in future.
 *
 * @param sig EC signature
 * @param curveParams EC key params.
 * @returns Signature
 */
function preventMalleability(sig: any, curveParams: { name: string }) {
  const halfOrder = ordersForCurve[curveParams.name].halfOrder;
  if (!halfOrder) {
    throw new Error(
      'Can not find the half order needed to calculate "s" value for immalleable signatures. Unsupported curve name: ' +
        curveParams.name,
    );
  }

  // in order to guarantee 's' falls in the lower range of the order, as explained in the above link,
  // first see if 's' is larger than half of the order, if so, it needs to be specially treated
  if (sig.s.cmp(halfOrder) === 1) {
    // module 'bn.js', file lib/bn.js, method cmp()
    // convert from BigInteger used by jsrsasign Key objects and bn.js used by elliptic Signature objects
    const bigNum = ordersForCurve[curveParams.name].order;
    sig.s = bigNum.sub(sig.s);
  }

  return sig;
}

/**
 * Internal function to sign input buffer with private key.
 *
 * @param privateKey private key in PEM format.
 * @param proposalBytes Buffer of the proposal to sign.
 * @param algorithm Hash function algorithm
 * @param keySize Key length
 * @returns
 */
function sign(
  privateKey: string,
  proposalBytes: Buffer,
  algorithm: string,
  keySize: number,
) {
  const hashAlgorithm = algorithm.toUpperCase();
  const hashFunction = hash[`${hashAlgorithm}_${keySize}`];
  const ecdsaCurve = ellipticCurves[`p${keySize}`];
  const ecdsa = new elliptic.ec(ecdsaCurve);
  const key = jsrsa.KEYUTIL.getKey(privateKey) as any;

  const signKey = ecdsa.keyFromPrivate(key.prvKeyHex, "hex");
  const digest = hashFunction(proposalBytes);

  let sig = ecdsa.sign(Buffer.from(digest, "hex"), signKey);
  sig = preventMalleability(sig, key.ecparams);

  return Buffer.from(sig.toDER());
}

/**
 * Sign proposal of endorsment / transaction with private key.
 * Can be used to call low-level fabric sdk functions.
 *
 * @param proposalBytes Buffer of the proposal to sign.
 * @param paramPrivateKeyPem Private key in PEM format.
 * @returns Signed proposal.
 */
export function signProposal(
  proposalBytes: Buffer,
  paramPrivateKeyPem: string,
) {
  return {
    signature: sign(paramPrivateKeyPem, proposalBytes, "sha2", 256),
    proposal_bytes: proposalBytes,
  };
}
