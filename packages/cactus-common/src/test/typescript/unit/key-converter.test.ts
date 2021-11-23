import test, { Test } from "tape";

import KeyEncoder from "key-encoder";

import {
  JsObjectSigner,
  Secp256k1Keys,
} from "../../../main/typescript/public-api";

import {
  KeyConverter,
  KeyFormat,
} from "../../../main/typescript/key-converter";

test.skip("Test Public Raw key conversion", async (assert: Test) => {
  const keyConverter = new KeyConverter();
  const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const hexPublic = Buffer.from(keyPair.publicKey).toString("hex");
  const pemPublic = keyEncoder.encodePublic(
    Buffer.from(keyPair.publicKey).toString("hex"),
    "raw",
    "pem",
  );

  const convertRawPrivate = keyConverter.publicKeyAs(
    keyPair.publicKey,
    KeyFormat.Raw,
    KeyFormat.Raw,
  );
  assert.deepEquals(
    keyPair.publicKey,
    convertRawPrivate,
    "Public Raw => Raw conversion successful",
  );

  const convertHexPublic = keyConverter.publicKeyAs(
    keyPair.publicKey,
    KeyFormat.Raw,
    KeyFormat.Hex,
  );
  assert.equals(
    hexPublic,
    convertHexPublic,
    "Public Raw => Hex conversion successful",
  );

  const convertPemPublic = keyConverter.publicKeyAs(
    keyPair.publicKey,
    KeyFormat.Raw,
    KeyFormat.PEM,
  );
  assert.equals(
    pemPublic,
    convertPemPublic,
    "Public Raw => PEM conversion successful",
  );

  assert.end();
});

test.skip("Test Public Hex key conversion", async (assert: Test) => {
  const keyConverter = new KeyConverter();
  const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const hexPublic = Buffer.from(keyPair.publicKey).toString("hex");
  const pemPublic = keyEncoder.encodePublic(
    Buffer.from(keyPair.publicKey).toString("hex"),
    "raw",
    "pem",
  );

  const convertRawPublic = keyConverter.publicKeyAs(
    hexPublic,
    KeyFormat.Hex,
    KeyFormat.Raw,
  );
  assert.deepEquals(
    keyPair.publicKey,
    convertRawPublic,
    "Public Hex => Raw conversion successful",
  );

  const convertHexPublic = keyConverter.publicKeyAs(
    hexPublic,
    KeyFormat.Hex,
    KeyFormat.Hex,
  );
  assert.deepEquals(
    hexPublic,
    convertHexPublic,
    "Public Hex => Hex conversion successful",
  );

  const convertPemPublic = keyConverter.publicKeyAs(
    hexPublic,
    KeyFormat.Hex,
    KeyFormat.PEM,
  );
  assert.deepEquals(
    pemPublic,
    convertPemPublic,
    "Public Hex => PEM conversion successful",
  );

  assert.end();
});

test.skip("Test Public PEM key conversion", async (assert: Test) => {
  const keyConverter = new KeyConverter();
  const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const hexPublic = Buffer.from(keyPair.publicKey).toString("hex");
  const pemPublic = keyEncoder.encodePublic(
    Buffer.from(keyPair.publicKey).toString("hex"),
    "raw",
    "pem",
  );

  const convertRawPublic = keyConverter.publicKeyAs(
    pemPublic,
    KeyFormat.PEM,
    KeyFormat.Raw,
  );
  assert.deepEquals(
    keyPair.publicKey,
    convertRawPublic,
    "Public PEM => Raw conversion successful",
  );

  const convertHexPublic = keyConverter.publicKeyAs(
    pemPublic,
    KeyFormat.PEM,
    KeyFormat.Hex,
  );
  assert.deepEquals(
    hexPublic,
    convertHexPublic,
    "Public PEM => Hex conversion successful",
  );

  const convertPemPublic = keyConverter.publicKeyAs(
    pemPublic,
    KeyFormat.PEM,
    KeyFormat.PEM,
  );
  assert.deepEquals(
    pemPublic,
    convertPemPublic,
    "Public PEM => PEM conversion successful",
  );

  assert.end();
});

test.skip("Test Private Raw key conversion", async (assert: Test) => {
  const keyConverter = new KeyConverter();
  const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const hexPrivate = keyPair.privateKey.toString("hex");
  const pemPrivate = keyEncoder.encodePrivate(
    keyPair.privateKey.toString("hex"),
    "raw",
    "pem",
  );

  const convertRawPrivate = keyConverter.privateKeyAs(
    keyPair.privateKey,
    KeyFormat.Raw,
    KeyFormat.Raw,
  );
  assert.deepEquals(
    keyPair.privateKey,
    convertRawPrivate,
    "Private Raw => Raw conversion successful",
  );

  const convertHexPrivate = keyConverter.privateKeyAs(
    keyPair.privateKey,
    KeyFormat.Raw,
    KeyFormat.Hex,
  );
  assert.equals(
    hexPrivate,
    convertHexPrivate,
    "Private Raw => Hex conversion successful",
  );

  const convertPemPrivate = keyConverter.privateKeyAs(
    keyPair.privateKey,
    KeyFormat.Raw,
    KeyFormat.PEM,
  );
  assert.equals(
    pemPrivate,
    convertPemPrivate,
    "Private Raw => PEM conversion successful",
  );

  assert.end();
});

test.skip("Test Private Hex key conversion", async (assert: Test) => {
  const keyConverter = new KeyConverter();
  const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const hexPrivate = keyPair.privateKey.toString("hex");
  const pemPrivate = keyEncoder.encodePrivate(
    keyPair.privateKey.toString("hex"),
    "raw",
    "pem",
  );

  const convertRawPrivate = keyConverter.privateKeyAs(
    hexPrivate,
    KeyFormat.Hex,
    KeyFormat.Raw,
  );
  assert.deepEquals(
    keyPair.privateKey,
    convertRawPrivate,
    "Private Hex => Raw conversion successful",
  );

  const convertHexPrivate = keyConverter.privateKeyAs(
    hexPrivate,
    KeyFormat.Hex,
    KeyFormat.Hex,
  );
  assert.deepEquals(
    hexPrivate,
    convertHexPrivate,
    "Private Hex => Hex conversion successful",
  );

  const convertPemPrivate = keyConverter.privateKeyAs(
    hexPrivate,
    KeyFormat.Hex,
    KeyFormat.PEM,
  );
  assert.deepEquals(
    pemPrivate,
    convertPemPrivate,
    "Private Hex => PEM conversion successful",
  );

  assert.end();
});

test.skip("Test Private PEM key conversion", async (assert: Test) => {
  const keyConverter = new KeyConverter();
  const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
  const keyEncoder: KeyEncoder = new KeyEncoder("secp256k1");
  const hexPrivate = keyPair.privateKey.toString("hex");
  const pemPrivate = keyEncoder.encodePrivate(
    keyPair.privateKey.toString("hex"),
    "raw",
    "pem",
  );

  const convertRawPrivate = keyConverter.privateKeyAs(
    pemPrivate,
    KeyFormat.PEM,
    KeyFormat.Raw,
  );
  assert.deepEquals(
    keyPair.privateKey,
    convertRawPrivate,
    "Private PEM => Raw conversion successful",
  );

  const convertHexPrivate = keyConverter.privateKeyAs(
    pemPrivate,
    KeyFormat.PEM,
    KeyFormat.Hex,
  );
  assert.deepEquals(
    hexPrivate,
    convertHexPrivate,
    "Private PEM => Hex conversion successful",
  );

  const convertPemPrivate = keyConverter.privateKeyAs(
    pemPrivate,
    KeyFormat.PEM,
    KeyFormat.PEM,
  );
  assert.deepEquals(
    pemPrivate,
    convertPemPrivate,
    "Private PEM => PEM conversion successful",
  );

  assert.end();
});

test.skip("Test invalid from key format", async (t: Test) => {
  const keyConverter = new KeyConverter();
  const keyPair = Secp256k1Keys.generateKeyPairsBuffer();

  t.throws(() => {
    keyConverter.publicKeyAs(
      keyPair.publicKey,
      "abc" as KeyFormat,
      KeyFormat.PEM,
    );
  }, "KeyConverter#publicKeyAs Invalid KeyFormat");

  t.throws(() => {
    keyConverter.publicKeyAs(keyPair.publicKey, KeyFormat.Raw, "abc" as any);
  }, "KeyConverter#publicKeyAs Invalid KeyFormat");

  t.throws(() => {
    keyConverter.privateKeyAs(
      keyPair.privateKey,
      "abc" as KeyFormat,
      KeyFormat.PEM,
    );
  }, "KeyConverter#privateKeyAs Invalid KeyFormat");

  t.throws(() => {
    keyConverter.privateKeyAs(keyPair.privateKey, KeyFormat.Raw, "abc" as any);
  }, "KeyConverter#privateKeyAs Invalid KeyFormat");

  t.end();
});

test.skip("correct signatures after conversion whirlwind", async (t: Test) => {
  const keyConverter = new KeyConverter();
  const keyPair = Secp256k1Keys.generateKeyPairsBuffer();

  t.comment(`keyPair.privateKey: ${keyPair.privateKey}`);

  t.comment(`privateKey hex: ${keyPair.privateKey.toString("hex")}`);

  const privKeyPem = keyConverter.privateKeyAs(
    keyPair.privateKey,
    KeyFormat.Raw,
    KeyFormat.PEM,
  );
  t.comment(`privKeyPem: ${privKeyPem}`);

  const privKeyHex = keyConverter.privateKeyAs(
    privKeyPem,
    KeyFormat.PEM,
    KeyFormat.Hex,
  );
  t.comment(`privKeyHex: ${privKeyHex}`);

  const privKeyRaw = keyConverter.privateKeyAs(
    privKeyPem,
    KeyFormat.PEM,
    KeyFormat.Raw,
  );
  t.comment(`privKeyBuffer: ${privKeyRaw}`);
  t.deepEquals(keyPair.privateKey, privKeyRaw, "privKey equals privKeyRaw");

  const privKeyPem2 = keyConverter.privateKeyAs(
    privKeyHex,
    KeyFormat.Hex,
    KeyFormat.PEM,
  );
  t.comment(`privKeyPem2: ${privKeyPem2}`);

  const privKeyPem3 = keyConverter.privateKeyAs(
    privKeyRaw,
    KeyFormat.Raw,
    KeyFormat.PEM,
  );
  t.comment(`privKeyPem3: ${privKeyPem3}`);

  t.equal(privKeyPem, privKeyPem2, "privKeyPem equals privKeyPem2");
  t.equal(privKeyPem, privKeyPem3, "privKeyPem equals privKeyPem3");
  t.equal(privKeyPem2, privKeyPem3, "privKeyPem2 equals privKeyPem3");

  const payload = "hello";

  const signer1 = new JsObjectSigner({
    privateKey: keyPair.privateKey,
  });

  const signer2 = new JsObjectSigner({
    privateKey: keyConverter.privateKeyAs(
      privKeyPem2,
      KeyFormat.PEM,
      KeyFormat.Raw,
    ),
  });
  const signer3 = new JsObjectSigner({
    privateKey: keyConverter.privateKeyAs(
      privKeyPem3,
      KeyFormat.PEM,
      KeyFormat.Raw,
    ),
  });
  const signer4 = new JsObjectSigner({
    privateKey: keyConverter.privateKeyAs(
      privKeyHex,
      KeyFormat.Hex,
      KeyFormat.Raw,
    ),
  });

  const signature1 = signer1.sign(payload);
  t.comment(`Signature 1: ${signature1}`);

  const signature2 = signer2.sign(payload);
  t.comment(`Signature 2: ${signature2}`);

  const signature3 = signer3.sign(payload);
  t.comment(`Signature 3: ${signature3}`);

  const signature4 = signer4.sign(payload);
  t.comment(`Signature 4: ${signature4}`);

  t.deepEquals(signature1, signature2, "signature1 deep equals  signature2");

  t.deepEquals(signature2, signature3, "signature2 deep equals  signature3");

  t.deepEquals(signature1, signature4, "signature1 deep equals  signature4");

  t.end();
});
