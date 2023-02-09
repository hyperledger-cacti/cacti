/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Contract } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';

import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';
import { InteroperableHelper } from '@hyperledger-labs/weaver-fabric-interop-sdk'

import { LedgerBase } from '../common/ledgerBase';
import { handlePromise, signMessage } from '../common/utils';
import { walletSetup, getWallet } from './walletUtils';
import { getAllMSPConfigurations, invokeFabricChaincode, queryFabricChaincode } from './networkUtils';

export class FabricConnector extends LedgerBase {
    connectionProfilePath: string;
    configFilePath: string;
    networkId: string;
    walletPath: string;
    iinAgentUserName: string;

    constructor(ledgerId: string, contractId: string, networkId: string, configFilePath: string) {
        const weaverCCId = contractId ? contractId : 'interop';
        configFilePath = configFilePath ? configFilePath : path.resolve(__dirname, './', 'config.json');
        if (!fs.existsSync(configFilePath)) {
            throw new Error('Config does not exist at path: ' + configFilePath);
        }
        const config = JSON.parse(fs.readFileSync(configFilePath, 'utf8').toString());
        super(ledgerId, config.mspId, weaverCCId);

        this.configFilePath = configFilePath;
        this.networkId = networkId ? networkId : 'network1';
        this.iinAgentUserName = config.agent.name;
        this.connectionProfilePath = (config.ccpPath && config.ccpPath.length>0) ? config.ccpPath : path.resolve(__dirname, './', 'connection_profile.json');
        if (!fs.existsSync(this.connectionProfilePath)) {
            throw new Error('Connection profile does not exist at path: ' + this.connectionProfilePath);
        }
        this.walletPath = (config.walletPath && config.walletPath.length>0) ? config.walletPath : path.join(process.cwd(), `wallet-${this.networkId}-${this.memberId}`);
    }

    async init() {
        await walletSetup(this.walletPath, this.connectionProfilePath, this.configFilePath);
    }

    // Collect security domain membership info
    async getAttestedMembership(securityDomain: string, nonce: string): Promise<iin_agent_pb.AttestedMembership> {
        const membership = await getAllMSPConfigurations(this.walletPath, this.connectionProfilePath, this.configFilePath, this.ledgerId);
        membership.setSecuritydomain(securityDomain);
        const membershipSerializedBase64 = Buffer.from(membership.serializeBinary()).toString('base64');
        const certAndSign = await this.agentSignMessage(membershipSerializedBase64 + nonce);

        const unitId = new iin_agent_pb.SecurityDomainMemberIdentity();
        unitId.setSecurityDomain(securityDomain);
        unitId.setMemberId(this.memberId);

        const attestation = new iin_agent_pb.Attestation();
        attestation.setUnitIdentity(unitId);
        attestation.setCertificate(certAndSign.certificate);
        attestation.setSignature(certAndSign.signature);
        attestation.setNonce(nonce);
        attestation.setTimestamp(Date.now());

        const attestedMembership = new iin_agent_pb.AttestedMembership();
        attestedMembership.setMembership(membershipSerializedBase64);
        attestedMembership.setAttestation(attestation);
        return attestedMembership;
    }

    // Collect security domain membership info
    async counterAttestMembership(attestedMembershipSetSerialized64: string, securityDomain: string, nonce: string): Promise<iin_agent_pb.CounterAttestedMembership> {
        const certAndSign = await this.agentSignMessage(attestedMembershipSetSerialized64 + nonce);

        const unitId = new iin_agent_pb.SecurityDomainMemberIdentity();
        unitId.setSecurityDomain(securityDomain);
        unitId.setMemberId(this.memberId);

        const attestation = new iin_agent_pb.Attestation();
        attestation.setUnitIdentity(unitId);
        attestation.setCertificate(certAndSign.certificate);
        attestation.setSignature(certAndSign.signature);
        attestation.setNonce(nonce);
        attestation.setTimestamp(Date.now());

        const counterAttestedMembership = new iin_agent_pb.CounterAttestedMembership();
        counterAttestedMembership.setAttestedMembershipSet(attestedMembershipSetSerialized64);
        counterAttestedMembership.setAttestationsList([attestation]);
        return counterAttestedMembership;
    }

    // record Membership
    async recordMembershipInLedger(counterAttestedMembership: iin_agent_pb.CounterAttestedMembership): Promise<any> {
        const counterAttestedMembershipSerialized64 = Buffer.from(counterAttestedMembership.serializeBinary()).toString('base64');
        try {
            const res = await invokeFabricChaincode(this.walletPath, this.connectionProfilePath, this.configFilePath, this.ledgerId, this.contractId, "CreateMembership", [counterAttestedMembershipSerialized64]);
            return res;
        } catch (e) {
            return await invokeFabricChaincode(this.walletPath, this.connectionProfilePath, this.configFilePath, this.ledgerId, this.contractId, "UpdateMembership", [counterAttestedMembershipSerialized64]);
        }
    }

    // Invoke a contract to drive a transaction
    // TODO: Add parameters corresponding to the output of a flow among IIN agents
    async invokeContract(): Promise<any> {
        return await invokeFabricChaincode(this.walletPath, this.connectionProfilePath, this.configFilePath, this.ledgerId, this.contractId, "", []);
    }

    // Query a contract to fetch information from the ledger
    async queryContract(): Promise<string> {
        return await queryFabricChaincode(this.walletPath, this.connectionProfilePath, this.configFilePath, this.ledgerId, this.contractId, "", []);
    }

    private async agentSignMessage(message): Promise<{ certificate: string, signature: string }> {
        const wallet = await getWallet(this.walletPath);
        type KeyCert = { key: any, cert: any }
        const keyCert = await InteroperableHelper.getKeyAndCertForRemoteRequestbyUserName(wallet, this.iinAgentUserName);
        const signature = signMessage(
            message,
            keyCert.key.toBytes()
        );
        return { certificate: keyCert.cert, signature: signature};
    }
}
