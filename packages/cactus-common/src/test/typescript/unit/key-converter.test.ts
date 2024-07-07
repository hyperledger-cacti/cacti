import "jest-extended";

import KeyEncoder from "key-encoder";

import {
  JsObjectSigner,
  Secp256k1Keys,
} from "../../../main/typescript/public-api";

import {
  KeyConverter,
  KeyFormat,
} from "../../../main/typescript/key-converter";

describe("KeyConverter", () => {
  test("Test Public Raw key conversion", async () => {
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

    // If the output came back with the wrong type, fail the test.
    if (typeof convertRawPrivate === "string") {
      throw new Error(
        "Expected Uint8Array not a string because we passed in toFormat as KeyFormat.Raw",
      );
    }

    expect(keyPair.publicKey).toEqual(convertRawPrivate);

    const convertHexPublic = keyConverter.publicKeyAs(
      keyPair.publicKey,
      KeyFormat.Raw,
      KeyFormat.Hex,
    );
    expect(hexPublic).toEqual(convertHexPublic);

    const convertPemPublic = keyConverter.publicKeyAs(
      keyPair.publicKey,
      KeyFormat.Raw,
      KeyFormat.PEM,
    );

    expect(pemPublic).toEqual(convertPemPublic);
  });

  test("Test Public Hex key conversion", async () => {
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
    expect(keyPair.publicKey).toEqual(convertRawPublic);

    const convertHexPublic = keyConverter.publicKeyAs(
      hexPublic,
      KeyFormat.Hex,
      KeyFormat.Hex,
    );

    expect(hexPublic).toEqual(convertHexPublic);

    const convertPemPublic = keyConverter.publicKeyAs(
      hexPublic,
      KeyFormat.Hex,
      KeyFormat.PEM,
    );
    expect(pemPublic).toEqual(convertPemPublic);
  });

  test("Test Public PEM key conversion", async () => {
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
    expect(keyPair.publicKey).toEqual(convertRawPublic);

    const convertHexPublic = keyConverter.publicKeyAs(
      pemPublic,
      KeyFormat.PEM,
      KeyFormat.Hex,
    );
    expect(hexPublic).toEqual(convertHexPublic);

    const convertPemPublic = keyConverter.publicKeyAs(
      pemPublic,
      KeyFormat.PEM,
      KeyFormat.PEM,
    );
    expect(pemPublic).toEqual(convertPemPublic);
  });

  test("Test Private Raw key conversion", async () => {
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

    expect(keyPair.privateKey).toEqual(convertRawPrivate);

    const convertHexPrivate = keyConverter.privateKeyAs(
      keyPair.privateKey,
      KeyFormat.Raw,
      KeyFormat.Hex,
    );
    expect(hexPrivate).toEqual(convertHexPrivate);

    const convertPemPrivate = keyConverter.privateKeyAs(
      keyPair.privateKey,
      KeyFormat.Raw,
      KeyFormat.PEM,
    );

    expect(pemPrivate).toEqual(convertPemPrivate);
  });

  test("Test Private Hex key conversion", async () => {
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
    expect(keyPair.privateKey).toEqual(convertRawPrivate);

    const convertHexPrivate = keyConverter.privateKeyAs(
      hexPrivate,
      KeyFormat.Hex,
      KeyFormat.Hex,
    );
    expect(hexPrivate).toEqual(convertHexPrivate);

    const convertPemPrivate = keyConverter.privateKeyAs(
      hexPrivate,
      KeyFormat.Hex,
      KeyFormat.PEM,
    );
    expect(pemPrivate).toEqual(convertPemPrivate);
  });

  test("Test Private PEM key conversion", async () => {
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
    expect(keyPair.privateKey).toEqual(convertRawPrivate);

    const convertHexPrivate = keyConverter.privateKeyAs(
      pemPrivate,
      KeyFormat.PEM,
      KeyFormat.Hex,
    );
    expect(hexPrivate).toEqual(convertHexPrivate);

    const convertPemPrivate = keyConverter.privateKeyAs(
      pemPrivate,
      KeyFormat.PEM,
      KeyFormat.PEM,
    );
    expect(pemPrivate).toEqual(convertPemPrivate);
  });

  test("Test invalid from key format", async () => {
    const keyConverter = new KeyConverter();
    const keyPair = Secp256k1Keys.generateKeyPairsBuffer();

    expect(() => {
      keyConverter.publicKeyAs(
        keyPair.publicKey,
        "abc" as KeyFormat,
        KeyFormat.PEM,
      );
    }).toThrow();

    expect(() => {
      keyConverter.publicKeyAs(
        keyPair.publicKey,
        KeyFormat.Raw,
        "abc" as KeyFormat,
      );
    }).toThrow();

    expect(() => {
      keyConverter.privateKeyAs(
        keyPair.privateKey,
        "abc" as KeyFormat,
        KeyFormat.PEM,
      );
    }).toThrow();

    expect(() => {
      keyConverter.privateKeyAs(
        keyPair.privateKey,
        KeyFormat.Raw,
        "abc" as KeyFormat,
      );
    }).toThrow();
  });

  test("correct signatures after conversion whirlwind", async () => {
    const keyConverter = new KeyConverter();
    const keyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const privKeyPem = keyConverter.privateKeyAs(
      keyPair.privateKey,
      KeyFormat.Raw,
      KeyFormat.PEM,
    );

    const privKeyHex = keyConverter.privateKeyAs(
      privKeyPem,
      KeyFormat.PEM,
      KeyFormat.Hex,
    );

    const privKeyRaw = keyConverter.privateKeyAs(
      privKeyPem,
      KeyFormat.PEM,
      KeyFormat.Raw,
    );
    expect(keyPair.privateKey).toEqual(privKeyRaw);

    const privKeyPem2 = keyConverter.privateKeyAs(
      privKeyHex,
      KeyFormat.Hex,
      KeyFormat.PEM,
    );

    const privKeyPem3 = keyConverter.privateKeyAs(
      privKeyRaw,
      KeyFormat.Raw,
      KeyFormat.PEM,
    );
    expect(privKeyPem).toEqual(privKeyPem2);
    expect(privKeyPem).toEqual(privKeyPem3);
    expect(privKeyPem2).toEqual(privKeyPem3);

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

    const signature2 = signer2.sign(payload);
    const signature3 = signer3.sign(payload);
    const signature4 = signer4.sign(payload);

    expect(signature1).toEqual(signature2);
    expect(signature2).toEqual(signature3);
    expect(signature1).toEqual(signature4);
  });
});
