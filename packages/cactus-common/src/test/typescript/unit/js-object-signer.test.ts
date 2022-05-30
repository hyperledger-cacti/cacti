import "jest-extended";
import {
  JsObjectSigner,
  IJsObjectSignerOptions,
} from "../../../main/typescript/js-object-signer";

import { Secp256k1Keys } from "../../../main/typescript/secp256k1-keys";

import crypto from "crypto";
import secp256k1 from "secp256k1";
import stringify from "json-stable-stringify";

const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();

const hashFunction = (data: unknown): string => {
  return crypto.createHash("sha256").update(stringify(data)).digest("hex");
};

const signFunction = (msg: unknown, pkey: Uint8Array): Uint8Array => {
  const signObj = secp256k1.ecdsaSign(
    Buffer.from(hashFunction(msg), `hex`),
    pkey,
  );
  return signObj.signature;
};

const verifySignFunction = (
  msg: unknown,
  signature: Uint8Array,
  pubKey: Uint8Array,
): boolean => {
  return secp256k1.ecdsaVerify(
    signature,
    Buffer.from(hashFunction(msg), `hex`),
    pubKey,
  );
};

test("Simple JSON Test", async () => {
  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyPairs.privateKey,
    logLevel: "debug",
  };
  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  const payload1 = { field1: "test11", field2: "test12", field3: 13 };
  const sign1 = jsObjectSigner.sign(payload1);

  const payload2 = { field3: 13, field2: "test12", field1: "test11" };
  const sign2 = jsObjectSigner.sign(payload2);

  expect(sign1.toString).toEqual(sign2.toString);
});

test("Simple Nested JSON Test", async () => {
  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyPairs.privateKey,
    logLevel: "debug",
  };
  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  const inner1 = { someProperty: "cool", otherStuff: "also cool" };
  const outer1 = { innerProperty: inner1, outerProperty: "test" };
  const sign1 = jsObjectSigner.sign(outer1);

  const inner2 = { otherStuff: "also cool", someProperty: "cool" };
  const outer2 = { outerProperty: "test", innerProperty: inner2 };
  const sign2 = jsObjectSigner.sign(outer2);

  expect(sign1.toString).toEqual(sign2.toString);
});

test("Simple Date JSON Test", async () => {
  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyPairs.privateKey,
    logLevel: "debug",
  };
  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  const date: Date = new Date();

  const inner1 = {
    someProperty: "cool",
    otherStuff: "also cool",
    dateProperty: date,
  };
  const outer1 = {
    innerProperty: inner1,
    outerProperty: "test",
    outerDateProperty: date,
  };
  const sign1 = jsObjectSigner.sign(outer1);

  const inner2 = {
    dateProperty: date,
    otherStuff: "also cool",
    someProperty: "cool",
  };
  const outer2 = {
    outerDateProperty: date,
    outerProperty: "test",
    innerProperty: inner2,
  };
  const sign2 = jsObjectSigner.sign(outer2);

  expect(sign1.toString).toEqual(sign2.toString);
});

test("Circular JSON Test", async () => {
  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyPairs.privateKey,
    logLevel: "debug",
  };
  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  // "any" type actually makes sense here in order to create a circular json
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: any = { a: "foo" };
  obj.b = obj;
  expect(() => jsObjectSigner.sign(obj)).toThrow(Error);
});

test("Very Signature Test", async () => {
  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyPairs.privateKey,
    logLevel: "debug",
  };
  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  const payload1 = { field1: "test11", field2: "test12", field3: 13 };
  const sign1 = jsObjectSigner.sign(payload1);

  const verify = jsObjectSigner.verify(payload1, sign1, keyPairs.publicKey);

  expect(verify).toBe(true);
});

test("Test optional sign function", async () => {
  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyPairs.privateKey,
    logLevel: "debug",
    signatureFunc: signFunction,
  };

  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  const inner1 = { someProperty: "cool", otherStuff: "also cool" };
  const outer1 = { innerProperty: inner1, outerProperty: "test" };
  const sign1 = jsObjectSigner.sign(outer1);

  const inner2 = { otherStuff: "also cool", someProperty: "cool" };
  const outer2 = { outerProperty: "test", innerProperty: inner2 };
  const sign2 = jsObjectSigner.sign(outer2);

  expect(sign1.toString()).toEqual(sign2.toString());
});

test("Test optional verify sign function", async () => {
  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyPairs.privateKey,
    logLevel: "debug",
    signatureFunc: signFunction,
    verifySignatureFunc: verifySignFunction,
  };

  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  const inner1 = { someProperty: "cool", otherStuff: "also cool" };
  const outer1 = { innerProperty: inner1, outerProperty: "test" };
  const sign1 = jsObjectSigner.sign(outer1);

  const verify = jsObjectSigner.verify(outer1, sign1, keyPairs.publicKey);

  expect(verify).toBe(true);
});

test("Test optional hash function", async () => {
  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyPairs.privateKey,
    logLevel: "debug",
    hashFunc: hashFunction,
  };

  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  const inner1 = { someProperty: "cool", otherStuff: "also cool" };
  const outer1 = { innerProperty: inner1, outerProperty: "test" };
  const sign1 = jsObjectSigner.sign(outer1);

  const inner2 = { otherStuff: "also cool", someProperty: "cool" };
  const outer2 = { outerProperty: "test", innerProperty: inner2 };
  const sign2 = jsObjectSigner.sign(outer2);

  expect(sign1.toString).toEqual(sign2.toString);
});

test("Test missing required constructor field", async () => {
  try {
    const pkey: unknown = undefined;
    const jsObjectSignerOptions: IJsObjectSignerOptions = {
      privateKey: pkey as Uint8Array,
    };
    new JsObjectSigner(jsObjectSignerOptions);
  } catch (e: unknown) {
    expect(e).toBeInstanceOf(Error);
    expect(e).toContainEntry([
      "message",

      "JsObjectSigner#ctor options.privateKey falsy.",
    ]);
  }
});
