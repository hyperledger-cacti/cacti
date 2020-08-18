// tslint:disable-next-line: no-var-requires
import test, { Test } from "tape";

import {
  JsObjectSigner,
  IJsObjectSignerOptions,
} from "../../../main/typescript/js-object-signer";

import { Secp256k1Keys } from "../../../main/typescript/secp256k1-keys";

import crypto from "crypto";
import secp256k1 from "secp256k1";
import stringify from "json-stable-stringify";

const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();

const hashFunction = (data: any): string => {
  return crypto.createHash("sha256").update(stringify(data)).digest("hex");
};

const signFunction = (msg: any, pkey: any): any => {
  const signObj = secp256k1.ecdsaSign(
    Buffer.from(hashFunction(msg), `hex`),
    Buffer.from(pkey, `hex`)
  );
  return signObj.signature;
};

const verifySignFunction = (
  msg: any,
  signature: any,
  pubKey: Uint8Array
): boolean => {
  return secp256k1.ecdsaVerify(
    signature,
    Buffer.from(hashFunction(msg), `hex`),
    pubKey
  );
};

test("Simple JSON Test", async (assert: Test) => {
  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyPairs.privateKey,
    logLevel: "debug",
  };
  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  const payload1 = { field1: "test11", field2: "test12", field3: 13 };
  const sign1 = jsObjectSigner.sign(payload1);

  const payload2 = { field3: 13, field2: "test12", field1: "test11" };
  const sign2 = jsObjectSigner.sign(payload2);

  assert.equals(sign1.toString, sign2.toString);
  assert.end();
});

test("Simple Nested JSON Test", async (assert: Test) => {
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

  assert.equals(sign1.toString, sign2.toString);
  assert.end();
});

test("Simple Date JSON Test", async (assert: Test) => {
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

  assert.equals(sign1.toString, sign2.toString);
  assert.end();
});

test("Circular JSON Test", async (assert: Test) => {
  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyPairs.privateKey,
    logLevel: "debug",
  };
  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  const date: Date = new Date();

  const obj: any = { a: "foo" };
  obj.b = obj;

  assert.throws(() => jsObjectSigner.sign(obj));
  assert.end();
});

test("Very Signature Test", async (assert: Test) => {
  const jsObjectSignerOptions: IJsObjectSignerOptions = {
    privateKey: keyPairs.privateKey,
    logLevel: "debug",
  };
  const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);

  const payload1 = { field1: "test11", field2: "test12", field3: 13 };
  const sign1 = jsObjectSigner.sign(payload1);

  const verify = jsObjectSigner.verify(payload1, sign1, keyPairs.publicKey);

  assert.equals(true, verify);
  assert.end();
});

test("Test optional sign function", async (assert: Test) => {
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

  assert.equals(sign1.toString, sign2.toString);
  assert.end();
});

test("Test optional verify sign function", async (assert: Test) => {
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

  assert.equals(true, verify);
  assert.end();
});

test("Test optional hash function", async (assert: Test) => {
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

  assert.equals(sign1.toString, sign2.toString);
  assert.end();
});

test("Test missing required constructor field", async (assert: Test) => {
  try {
    const jsObjectSignerOptions: IJsObjectSignerOptions = {
      privateKey: undefined,
    };

    const jsObjectSigner = new JsObjectSigner(jsObjectSignerOptions);
  } catch (e) {
    assert.equal(e.message, "JsObjectSigner#ctor options.privateKey falsy.");
  }
  assert.end();
});
