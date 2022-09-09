/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// Other Packages
import * as path from 'path';
import * as fs from 'fs';
import { credentials } from '@grpc/grpc-js';

// Weaver Packages
import agent_grpc_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_grpc_pb';

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
        securityDomainDNS = getSecurityDomainDNS(securityDomain)
    }
    const iinAgent = securityDomainDNS[participantId]
    let client: agent_grpc_pb.IINAgentClient;
    if (iinAgent.tls === 'true') {
        if (iinAgent.tlsCACertPath && iinAgent.tlsCACertPath == "") {
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
    const ledgerId = getLedgerId(securityDomain)
    if(!process.env.DLT_TYPE) {
        throw new Error(`Env DLT_TYPE not defined`)
    }
    const dltType = process.env.DLT_TYPE!.toLowerCase()
    if(dltType == 'fabric') {
        const ledgerBase = new FabricConnector(ledgerId, process.env.WEAVER_CONTRACT_ID, process.env.NETWORK_NAME, process.env.CONFIG_PATH)
        if (ledgerBase.orgMspId != memberId) {
            throw new Error(`This IIN Agent's member Id: ${ledgerBase.orgMspId} doesn't match with provided member Id: ${memberId} in request.`)
        }
        return ledgerBase
    } else {
        throw new Error(`DLT Type ${process.env.DLT_TYPE} not implemented`)
    }
}

export function getLedgerId(securityDomain: string): any {
    const secDomConfigPath = process.env.SECURITY_DOMAIN_CONFIG_PATH ? process.env.SECURITY_DOMAIN_CONFIG_PATH : path.resolve(__dirname, "../", "../", "security-domain-config.json")
    if (!fs.existsSync(secDomConfigPath)) {
        throw new Error('Security Domain config does not exist at path: ' + secDomConfigPath);
    }
    const secDomConfig = JSON.parse(fs.readFileSync(secDomConfigPath, 'utf8').toString());
    return secDomConfig[securityDomain]
}

export function getSecurityDomainDNS(securityDomain: string): any {
    const dnsConfigPath = process.env.DNS_CONFIG_PATH ? process.env.DNS_CONFIG_PATH : path.resolve(__dirname, "../", "../", "dnsconfig.json")
    if (!fs.existsSync(dnsConfigPath)) {
        throw new Error('DNS config does not exist at path: ' + dnsConfigPath);
    }
    const dnsConfig = JSON.parse(fs.readFileSync(dnsConfigPath, 'utf8').toString());
    return dnsConfig[securityDomain]
}

export function defaultCallback(err: any, response: any) {
    if (response) {
        console.log(`Response: ${JSON.stringify(response.toObject())}`);
    } else if (err) {
        console.log(`Error: ${JSON.stringify(err)}`);
    }
}

export async function delay(ms: number) {
    await new Promise(resolve => setTimeout(()=>resolve(), ms)).then(()=>console.log("fired"));
}
