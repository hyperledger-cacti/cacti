/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// Other Packages
import * as path from 'path';
import * as fs from 'fs';
import { credentials } from '@grpc/grpc-js';
import crypto from 'crypto';
const { X509Certificate } = require('crypto');

// Weaver Packages
import agent_grpc_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_grpc_pb';
import agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import membership_pb from '@hyperledger-labs/weaver-protos-js/common/membership_pb';
import { InteroperableHelper } from '@hyperledger-labs/weaver-fabric-interop-sdk'

// Local modules
import { LedgerBase } from './ledgerBase';
import { FabricConnector } from '../fabric-ledger/connector';

// A better way to handle errors for promises
export function handlePromise<T>(promise: Promise<T>): Promise<[T?, Error?]> {
    const result: Promise<[T?, Error?]> = promise
        .then((data) => {
            const response: [T?, Error?] = [data, undefined];
            return response;
        })
        .catch((error) => Promise.resolve([undefined, error]));
    return result;
}

export function getIINAgentClient(securityDomain: string, participantId: string, securityDomainDNS?: Object): agent_grpc_pb.IINAgentClient {
    if (!securityDomainDNS) {
        securityDomainDNS = getSecurityDomainDNS(securityDomain);
    }
    if (!(participantId in securityDomainDNS)) {
        throw new Error(`DNS for member: ${participantId} of ${securityDomain} not defined in DNS Config`)
    }
    const iinAgent = securityDomainDNS[participantId];
    let client: agent_grpc_pb.IINAgentClient;
    if (iinAgent.tls === 'true') {
        if (!iinAgent.tlsCACertPath || iinAgent.tlsCACertPath == "") {
            client = new agent_grpc_pb.IINAgentClient(
                iinAgent.endpoint,
                credentials.createSsl()
            );
        } else {
            if (!(iinAgent.tlsCACertPath && fs.existsSync(iinAgent.tlsCACertPath))) {
                throw new Error("Missing or invalid IIN Agent's tlsCACertPaths: " + iinAgent.tlsCACertPath);
            }
            const rootCert = fs.readFileSync(iinAgent.tlsCACertPath);
            client = new agent_grpc_pb.IINAgentClient(
                iinAgent.endpoint,
                credentials.createSsl(rootCert)
            );
        }
    } else {
        client = new agent_grpc_pb.IINAgentClient(
            iinAgent.endpoint,
            credentials.createInsecure()
        );
    }
    return client;
}

export function getLedgerBase(securityDomain: string, memberId: string): LedgerBase {
    const ledgerId = getLedgerId(securityDomain);
    if(!process.env.DLT_TYPE) {
        throw new Error(`Env DLT_TYPE not defined`);
    }
    const dltType = process.env.DLT_TYPE!.toLowerCase();
    if(dltType == 'fabric') {
        const ledgerBase = new FabricConnector(ledgerId, process.env.WEAVER_CONTRACT_ID, securityDomain, process.env.CONFIG_PATH);
        return ledgerBase;
    } else {
        throw new Error(`DLT Type ${process.env.DLT_TYPE} not implemented`);
    }
}

export function getLedgerId(securityDomain: string): any {
    const secDomConfigPath = process.env.SECURITY_DOMAIN_CONFIG_PATH ? process.env.SECURITY_DOMAIN_CONFIG_PATH : path.resolve(__dirname, "../", "../", "security-domain-config.json");
    if (!fs.existsSync(secDomConfigPath)) {
        throw new Error('Security Domain config does not exist at path: ' + secDomConfigPath);
    }
    const secDomConfig = JSON.parse(fs.readFileSync(secDomConfigPath, 'utf8').toString());
    return secDomConfig[securityDomain];
}

export function getSecurityDomainDNS(securityDomain: string): any {
    const dnsConfigPath = process.env.DNS_CONFIG_PATH ? process.env.DNS_CONFIG_PATH : path.resolve(__dirname, "../", "../", "dnsconfig.json");
    if (!fs.existsSync(dnsConfigPath)) {
        throw new Error('DNS config does not exist at path: ' + dnsConfigPath);
    }
    const dnsConfig = JSON.parse(fs.readFileSync(dnsConfigPath, 'utf8').toString());
    return dnsConfig[securityDomain];
}

export function getAllRemoteSecurityDomainDNS(localSecurityDomain: string): any {
    const dnsConfigPath = process.env.DNS_CONFIG_PATH ? process.env.DNS_CONFIG_PATH : path.resolve(__dirname, "../", "../", "dnsconfig.json");
    if (!fs.existsSync(dnsConfigPath)) {
        throw new Error('DNS config does not exist at path: ' + dnsConfigPath);
    }
    const dnsConfig = JSON.parse(fs.readFileSync(dnsConfigPath, 'utf8').toString());
    if (localSecurityDomain in dnsConfig) {
        delete dnsConfig [localSecurityDomain]
    }
    return dnsConfig;
}



export function defaultCallback(err: any, response: any) {
    if (response) {
        console.log(`IIN Agent Response: ${JSON.stringify(response.toObject())}`);
    } else if (err) {
        console.log(`IIN Agent Error: ${JSON.stringify(err)}`);
    }
}

export async function delay(ms: number) {
    await new Promise(f => setTimeout(f, ms));
}

/**
 * Sign a message using SHA256
 * message: string
 * privateKey: pem string
 * returns: signature in base64 string
**/
export function signMessage(message, privateKey, algorithm: string = "SHA256") {
    return InteroperableHelper.signMessage(message, privateKey, algorithm);
};
/**
 * Verifies a signature over message using SHA256
 * message: string
 * certificate: pem string
 * signature: base64 string
 * returns: True/False
 **/
export function verifySignature(message, certificate, signature, algorithm: string = "SHA256") {
    return InteroperableHelper.verifySignature(message, certificate, signature, algorithm);
};

export function deserializeMembership64(dataSerialized64: string): membership_pb.Membership {
    return membership_pb.Membership.deserializeBinary(Uint8Array.from(Buffer.from(dataSerialized64, 'base64')));
}
export function deserializeAttestedMembershipSet64(dataSerialized64: string): agent_pb.CounterAttestedMembership.AttestedMembershipSet {
    return agent_pb.CounterAttestedMembership.AttestedMembershipSet.deserializeBinary(Uint8Array.from(Buffer.from(dataSerialized64, 'base64')));
}

export function validateAttestedMembership(membershipSerialized64: string, nonce: string, attestation: agent_pb.Attestation) {
    const membership = deserializeMembership64(membershipSerialized64);
    const nonce_attestation = attestation.getNonce();
    if (nonce !== nonce_attestation) {
        console.error(`Error: Nonce doesn't match. Expected: ${nonce}, received: ${nonce_attestation}`);
        return false;
    }
    const signature = attestation.getSignature();
    const certificate = attestation.getCertificate();
    const message = membershipSerialized64 + nonce;
    if (!verifySignature(message, certificate, signature)) {
        console.error(`Error: Fail to verify signature on membership`);
        return false;
    }
    return verifyMemberInMembership(membership, attestation);
}

export function verifyMemberInMembership(membership: membership_pb.Membership, attestation: agent_pb.Attestation) {
    const unitIdentity = attestation.getUnitIdentity();
    const securityDomain = unitIdentity.getSecurityDomain();
    if (securityDomain !== membership.getSecuritydomain()) {
        console.error(`Error: Security domain of attestor doesn't match. Expected: ${membership.getSecuritydomain()}, Attestor's: ${securityDomain}`);
        return false;
    }
    const memberId = unitIdentity.getMemberId();
    const certificate = attestation.getCertificate() 
    const member = membership.getMembersMap().get(memberId);
    let isSignerRoot = false;
    let leafCACertPEM = "";
    if (member.getType() === "ca") {
        leafCACertPEM = member.getValue();
        isSignerRoot = true;
    } else if (member.getType() == "certificate") {
        const chain = member.getChainList();
        let parentCert = chain[0];
        for (let i=1; i<chain.length; i++) {
            let caCert = chain[i];
            isSignerRoot = (i == 1);
            if(!validateCertificateUsingCA(caCert, parentCert, isSignerRoot)) {
                console.error('Certificate link invalid');
                return false;
            }
            parentCert = caCert;
        }
        leafCACertPEM = chain[chain.length - 1];
        isSignerRoot = (chain.length == 1);
    }
    return validateCertificateUsingCA(certificate, leafCACertPEM, isSignerRoot);
}

function validateCertificateUsingCA(cert: string, signerCACert: string, isSignerRootCA: boolean): boolean {
    const x509Cert = new X509Certificate(cert);
    const x509SignerCACert = new X509Certificate(signerCACert);
    if (isSignerRootCA) {
        if (!x509SignerCACert.verify(x509SignerCACert.publicKey)) {
            console.error(`Root CA Certificate isn't self-signed`);
            return false;
        }
    }
    if (!x509Cert.verify(x509SignerCACert.publicKey)) {
        console.error(`Certificate isn't signed by the provided CA`);
        return false;
    }
    if (!isCertificateWithinExpiry(x509Cert)) {
        console.error(`Certificate is outside of validity. Cert validity from ${x509Cert.validFrom} to ${x509Cert.validTo}`);
        return false;
    }
    if (x509Cert.issuer !== x509SignerCACert.subject) {
        console.error(`Certificate issuer ${x509Cert.issuer} does not match signer subject ${x509SignerCACert.subject}`);
        return false;
    }
    return true;
}
function isCertificateWithinExpiry(x509Cert: typeof X509Certificate) {
    const validFrom = new Date(x509Cert.validFrom).valueOf();
    const validTo = new Date(x509Cert.validTo).valueOf();
    const currTime = Date.now();
    return (currTime <= validTo && currTime >= validFrom);
}
export function generateErrorAttestation(errorMsg, securityDomain, memberId, nonce) {
    const unitId = new agent_pb.SecurityDomainMemberIdentity();
    unitId.setSecurityDomain(securityDomain);
    unitId.setMemberId(memberId);
    
    const attestation = new agent_pb.Attestation();
    attestation.setUnitIdentity(unitId);
    attestation.setNonce(nonce);
    attestation.setTimestamp(Date.now());
    
    const errorAttestedMembership = new agent_pb.AttestedMembership();
    errorAttestedMembership.setError(errorMsg);
    errorAttestedMembership.setAttestation(attestation);
    return errorAttestedMembership;
}
export function generateErrorCounterAttestation(errorMsg, securityDomain, memberId, nonce) {
    const unitId = new agent_pb.SecurityDomainMemberIdentity();
    unitId.setSecurityDomain(securityDomain);
    unitId.setMemberId(memberId);
    
    const attestation = new agent_pb.Attestation();
    attestation.setUnitIdentity(unitId);
    attestation.setNonce(nonce);
    attestation.setTimestamp(Date.now());
    
    const errorCounterAttestedMembership = new agent_pb.CounterAttestedMembership();
    errorCounterAttestedMembership.setError(errorMsg);
    errorCounterAttestedMembership.setAttestationsList([attestation]);
    return errorCounterAttestedMembership;
}
