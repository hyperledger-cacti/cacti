import { pki, md } from "node-forge";
import { v4 as uuidV4 } from "uuid";
import { Strings } from "@hyperledger/cactus-common";

export type ForgeKeyPair = pki.rsa.KeyPair;
export type ForgePrivateKey = pki.rsa.PrivateKey;
export type ForgeCertificate = pki.Certificate;
export type ForgeCertificateField = pki.CertificateField;

export interface IPki {
  keyPair: ForgeKeyPair;
  certificate: ForgeCertificate;
  certificatePem: string;
  privateKeyPem: string;
}

export class SelfSignedPkiGenerator {
  public create(commonName: string, parent?: IPki): IPki {
    const keyPair: pki.rsa.KeyPair = pki.rsa.generateKeyPair(4096);
    const privateKeyPem: string = pki.privateKeyToPem(keyPair.privateKey);
    const certificate = pki.createCertificate();

    this.configureCertificateParameters(keyPair, certificate, commonName);
    if (parent) {
      certificate.setIssuer(parent.certificate.subject.attributes);
      certificate.publicKey = keyPair.publicKey;
      // certificate.privateKey = keyPair.privateKey;
      certificate.sign(parent.keyPair.privateKey, md.sha512.create());

      if (!parent.certificate.verify(certificate)) {
        throw new Error("Could not verify newly generated certificate");
      }
    } else {
      certificate.sign(keyPair.privateKey, md.sha512.create());
    }

    const certificatePem = pki.certificateToPem(certificate);
    return { keyPair, certificate, certificatePem, privateKeyPem };
  }

  public configureCertificateParameters(
    keyPair: pki.rsa.KeyPair,
    certificate: pki.Certificate,
    commonName: string,
  ): pki.Certificate {
    // 20 octets max for serial numbers of certs as per the standard
    const serialNumber = Strings.replaceAll(uuidV4(), "-", "").substring(0, 19);
    certificate.serialNumber = serialNumber;
    certificate.publicKey = keyPair.publicKey;
    certificate.privateKey = keyPair.privateKey;
    certificate.validity.notBefore = new Date();
    certificate.validity.notAfter = new Date();

    const nextYear = certificate.validity.notBefore.getFullYear() + 1;
    certificate.validity.notAfter.setFullYear(nextYear);

    const certificateFields: ForgeCertificateField[] = [
      {
        shortName: "CN",
        name: "commonName",
        value: commonName,
      },
      {
        name: "countryName",
        value: "Universe",
      },
      {
        shortName: "ST",
        value: "Milky Way",
      },
      {
        shortName: "L",
        name: "localityName",
        value: "Planet Earth",
      },
      {
        shortName: "O",
        name: "organizationName",
        value: "Hyperledger",
      },
      {
        shortName: "OU",
        value: "Cactus",
      },
      {
        name: "unstructuredName",
        value: "Cactus Dummy Self Signed Certificates",
      },
    ];

    certificate.setSubject(certificateFields);

    certificate.setIssuer(certificateFields);

    certificate.setExtensions([
      {
        name: "basicConstraints",
        cA: true,
      },
      {
        name: "keyUsage",
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      },
      {
        name: "extKeyUsage",
        serverAuth: true,
        clientAuth: true,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true,
      },
      {
        name: "nsCertType",
        client: true,
        server: true,
        email: true,
        objsign: true,
        sslCA: true,
        emailCA: true,
        objCA: true,
      },
      {
        name: "subjectAltName",
        altNames: [
          {
            type: 7, // IP
            ip: "127.0.0.1",
          },
        ],
      },
      {
        name: "subjectKeyIdentifier",
      },
    ]);

    return certificate;
  }
}
