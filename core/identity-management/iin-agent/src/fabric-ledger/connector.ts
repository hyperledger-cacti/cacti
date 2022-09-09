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
import { handlePromise } from '../common/utils';
import { walletSetup, getWallet } from './walletUtils';
import { getAllMSPConfigurations, invokeFabricChaincode, queryFabricChaincode } from './networkUtils';

export class FabricConnector extends LedgerBase {
    connectionProfilePath: string;
    configFilePath: string;
    networkId: string;
    orgMspId: string;
    walletPath: string;
    iinAgentUserName: string;

    constructor(ledgerId: string, contractId: string, networkId: string, configFilePath: string) {
        const weaverCCId = contractId ? contractId : 'interop'
        super(ledgerId, weaverCCId);
        //this.connectionProfilePath = connectionProfilePath ? connectionProfilePath : path.resolve(__dirname, './', 'connection_profile.json');
        //this.walletPath = walletPath ? walletPath : path.join(process.cwd(), `wallet-${this.networkId}`);
        this.configFilePath = configFilePath ? configFilePath : path.resolve(__dirname, './', 'config.json');
        this.networkId = networkId ? networkId : 'network1';
        if (!fs.existsSync(configFilePath)) {
            throw new Error('Config does not exist at path: ' + configFilePath);
        }
        const config = JSON.parse(fs.readFileSync(configFilePath, 'utf8').toString());
        this.iinAgentUserName = config.agent.name;
        this.orgMspId = config.mspId;
        this.connectionProfilePath = config.ccpPath ? config.ccpPath : path.resolve(__dirname, './', 'connection_profile.json');
        this.walletPath = config.walletPath ? config.walletPath : path.join(process.cwd(), `wallet-${this.networkId}-${this.orgMspId}`);
    }

    // Setup a user (with wallet and one or more identities) with contract invocation credentials
    async setupWalletIdentity() {
        walletSetup(this.walletPath, this.connectionProfilePath, this.configFilePath);
    }

    // Collect security domain membership info
    async getAttestedMembership(securityDomain: string, nonce: string): Promise<iin_agent_pb.AttestedMembership> {
        const membership = await getAllMSPConfigurations(this.walletPath, this.connectionProfilePath, this.configFilePath, this.ledgerId);
        membership.setSecuritydomain(securityDomain)
        const membershipSerializedBase64 = Buffer.from(membership.serializeBinary()).toString('base64');
        const certAndSign = await this.signMessage(membershipSerializedBase64 + nonce)
        
        const unitId = new iin_agent_pb.SecurityDomainMemberIdentity()
        unitId.setSecurityDomain(securityDomain)
        unitId.setMemberId(this.orgMspId)
        
        const attestation = new iin_agent_pb.Attestation()
        attestation.setUnitIdentity(unitId)
        attestation.setCertificate(certAndSign.certificate)
        attestation.setSignature(certAndSign.signature)
        
        const attestedMembership = new iin_agent_pb.AttestedMembership()
        attestedMembership.setMembership(membership)
        attestedMembership.setAttestation(attestation)
        return attestedMembership;
    }
    
    // Collect security domain membership info
    async counterAttestMembership(attestedMembershipSet: iin_agent_pb.CounterAttestedMembership.AttestedMembershipSet, securityDomain: string, nonce: string): Promise<iin_agent_pb.CounterAttestedMembership> {
        const attestedMembershipSetSerialized64 = Buffer.from(attestedMembershipSet.serializeBinary()).toString('base64')
        const certAndSign = await this.signMessage(attestedMembershipSetSerialized64 + nonce)
        
        const unitId = new iin_agent_pb.SecurityDomainMemberIdentity()
        unitId.setSecurityDomain(securityDomain)
        unitId.setMemberId(this.orgMspId)
        
        const attestation = new iin_agent_pb.Attestation()
        attestation.setUnitIdentity(unitId)
        attestation.setCertificate(certAndSign.certificate)
        attestation.setSignature(certAndSign.signature)
        
        const counterAttestedMembership = new iin_agent_pb.CounterAttestedMembership()
        counterAttestedMembership.setAttestedMembershipSet(attestedMembershipSetSerialized64)
        counterAttestedMembership.setAttestationsList([attestation])
        return counterAttestedMembership;
    }
    
    // record Membership
    async recordMembershipInLedger(counterAttestedMembership: iin_agent_pb.CounterAttestedMembership): Promise<any> {
        const counterAttestedMembershipSerialized64 = Buffer.from(counterAttestedMembership.serializeBinary()).toString('base64')
        return await invokeFabricChaincode(this.walletPath, this.connectionProfilePath, this.configFilePath, this.ledgerId, this.contractId, "CreateMembership", counterAttestedMembershipSerialized64);
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
    
    private async signMessage(message): Promise<{ certificate: string, signature: string }> {
        const wallet = await getWallet(this.walletPath);
        type KeyCert = { key: any, cert: any }
        const keyCert = await InteroperableHelper.getKeyAndCertForRemoteRequestbyUserName(wallet, this.iinAgentUserName)
        const signature = InteroperableHelper.signMessage(
            message,
            keyCert.key.toBytes()
        ).toString("base64")
        return { certificate: keyCert.cert, signature: signature};
    }
}
