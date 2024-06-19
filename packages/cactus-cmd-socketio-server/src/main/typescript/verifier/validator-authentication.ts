/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { configRead } from "../util/config";

type PayloadType = Parameters<typeof jwt.sign>[0];

const DEFAULT_EXPIRATION_TIME = 60 * 15; // 15 minutes

const supportedJwtAlgos: jwt.Algorithm[] = [
  "ES256",
  "ES384",
  "ES512",
  "RS256",
  "RS384",
  "RS512",
];

// Will keep the private key once it's succesfully read
let privateKey: string;

/**
 * Sign a message to be sent from socketio connector (validator) to a client.
 *
 * @param privateKey - Validator private key. Only ECDSA and RSA keys are supported.
 * @param payload - Message to be encoded.
 * @param jwtAlgo - JWT algorithm to use. Must match key used (ES*** or RS***)
 * @param expirationTime - JWT expiration time
 * @returns JWT signed message that can be sent over the wire.
 */
export function signValidatorMessageJwt(
  privateKey: jwt.Secret,
  payload: PayloadType,
  jwtAlgo: jwt.Algorithm = "ES256",
  expirationTime: number = DEFAULT_EXPIRATION_TIME,
): string {
  if (!supportedJwtAlgos.includes(jwtAlgo)) {
    throw new Error(
      `Wrong JWT Algorithm. Supported algos: ${supportedJwtAlgos.toString()}`,
    );
  }

  const privateKeyStr = privateKey.toString();
  // Check if key supported and JWT algorithm matches the provided key type
  const keyType = crypto.createPrivateKey(privateKeyStr).asymmetricKeyType;
  if (
    !(
      (keyType === "rsa" && jwtAlgo.startsWith("RS")) ||
      (keyType === "ec" && jwtAlgo.startsWith("ES"))
    )
  ) {
    throw new Error(`Not supported combination ${keyType}/${jwtAlgo}.`);
  }

  const option: jwt.SignOptions = {
    algorithm: jwtAlgo,
    expiresIn: expirationTime,
  };

  return jwt.sign(payload, privateKey, option);
}

/**
 * Validator-side function to sign message to be sent to the client.
 * Will read the private key either as value in validator config `sslParam.keyValue`,
 * or read from filesystem under path `sslParam.key`.
 *
 * @param payload - Message to sign
 * @returns Signed message
 */
export function signMessageJwt(payload: object): string {
  if (!privateKey) {
    try {
      privateKey = configRead<string>("sslParam.keyValue");
    } catch {
      privateKey = fs.readFileSync(configRead("sslParam.key"), "ascii");
    }
  }
  const jwtAlgo = configRead<jwt.Algorithm>("sslParam.jwtAlgo", "ES256");
  return signValidatorMessageJwt(privateKey, payload, jwtAlgo);
}
