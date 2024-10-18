import "jest-extended";
import { KEYUTIL, KJUR } from "jsrsasign";
import {
  CryptoUtil,
  ECCurveType,
} from "../../../main/typescript/identity/internal/crypto-util";

const KJ = KJUR as any;

test("encodeASN1Sig for P256 curve", () => {
  const asn1Sig =
    "MEYCIQDb+euisbUGQCpisQh9xEKof8zVNorerfhMHv3kWmuCfQIhAI8A3f21hAHga0WK6lS6cD/ZUtWVy/xsYZGGaldM7Tl3";
  const derSig = CryptoUtil.encodeASN1Sig(
    Buffer.from(asn1Sig, "base64"),
    ECCurveType.P256,
  );
  const want =
    "3045022100dbf9eba2b1b506402a62b1087dc442a87fccd5368adeadf84c1efde45a6b827d022070ff22014a7bfe2094ba7515ab458fbfe3942517db1b32236233606baf75ebda";
  expect(derSig.toString("hex")).toBe(want);
});

test("encodeASN1Sig for P384 curve", () => {
  const asn1Sig =
    "MGYCMQDFEvlhmQlTj7YGTjnZwERmj+/0IA2rDdb7F5iE1QLGQUUlHn353mizpFeXAcjWGH4CMQDZ1td1ISnjAPkUlohwjiJAShtaFITLG1NEr0G29Hgglt0mfvgJ0k2DXXy+mOyn57o=";
  const derSig = CryptoUtil.encodeASN1Sig(
    Buffer.from(asn1Sig, "base64"),
    ECCurveType.P384,
  );
  const want =
    "3065023100c512f9619909538fb6064e39d9c044668feff4200dab0dd6fb179884d502c64145251e7df9de68b3a4579701c8d6187e02302629288aded61cff06eb69778f71ddbfb5e4a5eb7b34e4ac82b40bcaffbf0d487af38eba3ede59f78f6f5ad1e01d41b9";
  expect(derSig.toString("hex")).toBe(want);
});

test("invalid curve type", () => {
  const asn1Sig =
    "MGYCMQDFEvlhmQlTj7YGTjnZwERmj+/0IA2rDdb7F5iE1QLGQUUlHn353mizpFeXAcjWGH4CMQDZ1td1ISnjAPkUlohwjiJAShtaFITLG1NEr0G29Hgglt0mfvgJ0k2DXXy+mOyn57o=";

  expect(() => {
    CryptoUtil.encodeASN1Sig(
      Buffer.from(asn1Sig, "base64"),
      "invalidCrv" as ECCurveType,
    );
  }).toThrow("CryptoUtil#encodeASN1Sig invalid ec curve type");
});

test("CSR", () => {
  const pem = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEziQUVVrao4nXmhe3jaMdsxAyszHY
GfNTZZQn1F9PQCxOequ4XS4XFmng3MD8jkP58Sak/6QaXYvqAEB6pBT/gA==
-----END PUBLIC KEY-----`;

  const csr = CryptoUtil.createCSR(
    KEYUTIL.getKey(pem) as KJUR.crypto.ECDSA,
    "Cactus",
  );

  expect(csr).toBeTruthy();
  const csrDigest = CryptoUtil.getCSRDigest(csr);
  expect(csrDigest.toString("base64")).toBe(
    "S5E8XQhxbltjJLE2n3krEOC5cgmENCKtvUrj3AX4StY=",
  );

  const signature = Buffer.from(
    "MEYCIQDzWXNQkzf4DO2Ds7MJ4RdIdQfIGbsRpK5iQAmRWyQvpAIhAKVHJL2yFIQba/S09XccNCEZhfZW3XvFqY54rz4ZIjpV",
    "base64",
  );

  const csrPem = CryptoUtil.getPemCSR(csr, signature);
  const csrParams = KJ.asn1.csr.CSRUtil.getParam(csrPem);
  expect(csrParams.subject.str).toBe("/CN=Cactus");
});
