/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Gateway } from 'fabric-network';
import { Channel } from 'fabric-common';
import * as path from 'path';
import * as fs from 'fs';

import membershipPb from '@hyperledger-labs/weaver-protos-js/common/membership_pb';
import { MembershipManager } from '@hyperledger-labs/weaver-fabric-interop-sdk'

import { getWallet } from './walletUtils';
import * as utils from "../common/utils";

// Get a handle to a network gateway using existing wallet credentials
const getNetworkGateway = async (
    walletPath: string,
    connectionProfilePath: string,
    configFilePath: string
): Promise<Gateway> => {
    try {
        // load the network configuration
        if (!fs.existsSync(connectionProfilePath)) {
            throw new Error('Connection profile does not exist at path: ' + connectionProfilePath);
        }
        const ccp = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8').toString());
        if (!fs.existsSync(configFilePath)) {
            throw new Error('Config does not exist at path: ' + configFilePath);
        }
        const config = JSON.parse(fs.readFileSync(configFilePath, 'utf8').toString());

        // Create a new file system-based wallet for managing identities.
        const userName = config.agent.name;
        const wallet = await getWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);
        // Check to see if we've already enrolled the user.
        const identity = await wallet.get(userName);
        if (!identity) {
            console.log(`An identity for the user "${userName}.com" does not exist in the wallet`);
            console.log('Run the registerUser.ts application before retrying');
        }
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: `${userName}`,
            discovery: { enabled: true, asLocalhost: config.local === 'false' ? false : true },
        });
        return gateway;
    } catch (error) {
        console.error(`Failed to instantiate network (channel): ${error}`);
        throw error;
    }
}

// Get a handle to a network gateway using existing wallet credentials
const getNetworkContract = async (
    walletPath: string,
    connectionProfilePath: string,
    configFilePath: string,
    channelId: string,
    chaincodeId: string,
): Promise<any> => {
    try {
        const gateway = await getNetworkGateway(walletPath, connectionProfilePath, configFilePath);
        if (!gateway) {
            throw new Error('Unable to connect to the ledger!');
        }
        const network = await gateway.getNetwork(channelId);
        const contract = network.getContract(chaincodeId);
        return { gateway: gateway, contract: contract };
    } catch (error) {
        console.error(`Failed to connect to contract: ${error}`);
        throw error;
    }
}

async function getMSPConfiguration(
    walletPath: string,
    connectionProfilePath: string,
    configFilePath: string,
    channelId: string,
): Promise<membershipPb.Membership> {
    console.log('Running invocation on Fabric channel and chaincode');
    try {
        const gateway = await getNetworkGateway(walletPath, connectionProfilePath, configFilePath);
        if (!gateway) {
            throw new Error('Unable to connect to the ledger!');
        }
        const network = await gateway.getNetwork(channelId);
        const config = JSON.parse(fs.readFileSync(configFilePath, 'utf8').toString());
        const membership = MembershipManager.getMSPConfigurations(network, [config.mspId]);
        // Disconnect from the gateway.
        gateway.disconnect();
        return membership;
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        throw error;
    }
}

async function getAllMSPConfigurations(
    walletPath: string,
    connectionProfilePath: string,
    configFilePath: string,
    channelId: string,
): Promise<membershipPb.Membership> {
    console.log('Running invocation on Fabric channel and chaincode');
    try {
        const gateway = await getNetworkGateway(walletPath, connectionProfilePath, configFilePath);
        if (!gateway) {
            throw new Error('Unable to connect to the ledger!');
        }
        const network = await gateway.getNetwork(channelId);
        const config = JSON.parse(fs.readFileSync(configFilePath, 'utf8').toString());
        const membership = MembershipManager.getAllMSPConfigurations(network, config.ordererMspIds);
        // Disconnect from the gateway.
        gateway.disconnect();
        return membership;
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        throw error;
    }
}

async function invokeFabricChaincode(
    walletPath: string,
    connectionProfilePath: string,
    configFilePath: string,
    channelId: string,
    chaincodeId: string,
    functionName: string,
    args: Array<string>,
): Promise<any> {
    console.log('Running invocation on Fabric channel and chaincode');
    try {
        const gatewayAndContract = await getNetworkContract(walletPath, connectionProfilePath, configFilePath, channelId, chaincodeId);
        const [result, submitError] = await utils.handlePromise(
            gatewayAndContract.contract.submitTransaction(functionName, ...args),
        );
        if (submitError) {
            throw new Error(`submitTransaction Error: ${submitError}`);
        }
        // Disconnect from the gateway.
        gatewayAndContract.gateway.disconnect();
        return result;
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        throw error;
    }
}

async function queryFabricChaincode(
    walletPath: string,
    connectionProfilePath: string,
    configFilePath: string,
    channelId: string,
    chaincodeId: string,
    functionName: string,
    args: Array<string>,
): Promise<any> {
    console.log('Running query on Fabric channel and chaincode');
    try {
        const gatewayAndContract = await getNetworkContract(walletPath, connectionProfilePath, configFilePath, channelId, chaincodeId);
        const [result, evalError] = await utils.handlePromise(
            gatewayAndContract.contract.evaluateTransaction(functionName, ...args),
        );
        if (evalError) {
            throw new Error(`evaluateTransaction Error: ${evalError}`);
        }
        // Disconnect from the gateway.
        gatewayAndContract.gateway.disconnect();
        return result;
    } catch (error) {
        console.error(`Failed to submit query: ${error}`);
        throw error;
    }
}

export { getNetworkGateway, getNetworkContract, getMSPConfiguration, getAllMSPConfigurations, invokeFabricChaincode, queryFabricChaincode };
