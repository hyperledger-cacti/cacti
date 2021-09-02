import { createHash } from "crypto";
import { KJUR } from "jsrsasign";
import BN from "bn.js";

const csrNamespace = KJUR.asn1.csr as any;

// hex encoded prime order of NIST P-256 curve
// more information at https://safecurves.cr.yp.to/base.html
const ecdsa = new KJUR.crypto.ECDSA({ curve: "NIST P-256" });
const p256N = new BN(((ecdsa as any).ecparams.n as BigInteger).toString(), 10);
// hex encoded prime order of NIST P-384 curve
ecdsa.setNamedCurve("NIST P-384");
const p384N = new BN(((ecdsa as any).ecparams.n as BigInteger).toString(), 10);

export enum ECCurveType {
  P256 = "p256",
  P384 = "p384",
}

// class with all static function
// provide crypto util to identity providers
export class CryptoUtil {
  public static readonly className = "CryptoUtil";
  // convert asn1 encoded signature to a fabric understandable signature format
  // more info at https://github.com/hyperledger/fabric-sdk-node/blob/b562ae4d7b8c690cd008c98ff24dfd3fb78ade81/fabric-common/lib/impl/bccsp_pkcs11.js#L39
  static encodeASN1Sig(sig: Buffer, curve: ECCurveType): Buffer {
    const fnTag = `${CryptoUtil.className}#encodeASN1Sig`;
    const pSig = (KJUR.crypto.ECDSA as any).parseSigHexInHexRS(
      sig.toString("hex"),
    ) as { r: string; s: string };
    const r = new BN(pSig.r, "hex");
    let s = new BN(pSig.s, "hex");
    let crv: BN;
    switch (curve) {
      case ECCurveType.P256:
        crv = p256N;
        break;
      case ECCurveType.P384:
        crv = p384N;
        break;
      default:
        throw new Error(`${fnTag} invalid ec curve type`);
    }
    const halfOrder = crv.shrn(1);
    if (s.cmp(halfOrder) === 1) {
      const bigNum = crv as BN;
      s = bigNum.sub(s);
    }
    const encodedSig = KJUR.crypto.ECDSA.hexRSSigToASN1Sig(
      r.toString("hex"),
      s.toString("hex"),
    );
    return Buffer.from(encodedSig, "hex");
  }

  // create a csr information using public key and commonName
  // return s csr object
  static createCSR(
    pub: KJUR.crypto.ECDSA,
    commonName: string,
  ): KJUR.asn1.csr.CertificationRequest {
    return new csrNamespace.CertificationRequest({
      subject: { str: "/CN=" + commonName },
      sbjpubkey: pub,
      sigalg: "SHA256withECDSA",
    });
  }

  // return csr digest to e signed by a private key
  // signature should be a asn1 der encoded
  static getCSRDigest(csr: KJUR.asn1.csr.CertificationRequest): Buffer {
    const csrInfo = new csrNamespace.CertificationRequestInfo(
      (csr as any).params,
    );
    return createHash("sha256").update(csrInfo.getEncodedHex(), "hex").digest();
  }

  // generate a pem encoded csr
  static getPemCSR(
    _csr: KJUR.asn1.csr.CertificationRequest,
    signature: Buffer,
  ): string {
    const csr = _csr as any;
    csr.params.sighex = signature.toString("hex");
    return csr.getPEM();
  }
}
