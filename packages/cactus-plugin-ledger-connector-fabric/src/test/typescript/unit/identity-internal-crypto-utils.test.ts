import { KEYUTIL, KJUR } from "jsrsasign";
import test, { Test } from "tape";
import {
  CryptoUtil,
  ECCurveType,
} from "../../../main/typescript/identity/internal/crypto-util";
const KJ = KJUR as any;
test("cryptoUtil", (t: Test) => {
  t.test("encodeASN1Sig", (t: Test) => {
    {
      const asn1Sig =
        "MEYCIQDb+euisbUGQCpisQh9xEKof8zVNorerfhMHv3kWmuCfQIhAI8A3f21hAHga0WK6lS6cD/ZUtWVy/xsYZGGaldM7Tl3";
      const derSig = CryptoUtil.encodeASN1Sig(
        Buffer.from(asn1Sig, "base64"),
        ECCurveType.P256,
      );
      const want =
        "3045022100dbf9eba2b1b506402a62b1087dc442a87fccd5368adeadf84c1efde45a6b827d022070ff22014a7bfe2094ba7515ab458fbfe3942517db1b32236233606baf75ebda";
      t.equal(derSig.toString("hex"), want);
    }

    {
      const asn1Sig =
        "MGYCMQDFEvlhmQlTj7YGTjnZwERmj+/0IA2rDdb7F5iE1QLGQUUlHn353mizpFeXAcjWGH4CMQDZ1td1ISnjAPkUlohwjiJAShtaFITLG1NEr0G29Hgglt0mfvgJ0k2DXXy+mOyn57o=";
      const derSig = CryptoUtil.encodeASN1Sig(
        Buffer.from(asn1Sig, "base64"),
        ECCurveType.P384,
      );
      const want =
        "3065023100c512f9619909538fb6064e39d9c044668feff4200dab0dd6fb179884d502c64145251e7df9de68b3a4579701c8d6187e02302629288aded61cff06eb69778f71ddbfb5e4a5eb7b34e4ac82b40bcaffbf0d487af38eba3ede59f78f6f5ad1e01d41b9";
      t.equal(derSig.toString("hex"), want);
    }
    {
      const asn1Sig =
        "MGYCMQDFEvlhmQlTj7YGTjnZwERmj+/0IA2rDdb7F5iE1QLGQUUlHn353mizpFeXAcjWGH4CMQDZ1td1ISnjAPkUlohwjiJAShtaFITLG1NEr0G29Hgglt0mfvgJ0k2DXXy+mOyn57o=";
      try {
        CryptoUtil.encodeASN1Sig(
          Buffer.from(asn1Sig, "base64"),
          "invalidCrv" as ECCurveType,
        );
      } catch (error) {
        t.equal(
          "CryptoUtil#encodeASN1Sig invalid ec curve type",
          (error as Error).message,
        );
      }
    }
    t.end();
  });

  t.test("CSR", (t: Test) => {
    const pem = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEziQUVVrao4nXmhe3jaMdsxAyszHY
GfNTZZQn1F9PQCxOequ4XS4XFmng3MD8jkP58Sak/6QaXYvqAEB6pBT/gA==
-----END PUBLIC KEY-----
`;
    const csr = CryptoUtil.createCSR(
      KEYUTIL.getKey(pem) as KJUR.crypto.ECDSA,
      "Cactus",
    );
    t.ok(csr);
    const csrDigest = CryptoUtil.getCSRDigest(csr);
    t.equal(
      csrDigest.toString("base64"),
      "S5E8XQhxbltjJLE2n3krEOC5cgmENCKtvUrj3AX4StY=",
    );
    const signature = Buffer.from(
      "MEYCIQDzWXNQkzf4DO2Ds7MJ4RdIdQfIGbsRpK5iQAmRWyQvpAIhAKVHJL2yFIQba/S09XccNCEZhfZW3XvFqY54rz4ZIjpV",
      "base64",
    );
    const csrPem = CryptoUtil.getPemCSR(csr, signature);
    {
      const csr = KJ.asn1.csr.CSRUtil.getParam(csrPem);
      t.equal("/CN=Cactus", csr.subject.str);
    }
    t.end();
  });
  t.end();
});
