/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Gateway, Wallets } from 'fabric-network';
import { Endorser } from 'fabric-common';
import * as path from 'path';
import * as fs from 'fs';
import * as fabproto6 from 'fabric-protos';
import query_pb from '@hyperledger-labs/weaver-protos-js/common/query_pb';
import view_data from '@hyperledger-labs/weaver-protos-js/fabric/view_data_pb';
import proposalResponse from '@hyperledger-labs/weaver-protos-js/peer/proposal_response_pb';
import interopPayload from '@hyperledger-labs/weaver-protos-js/common/interop_payload_pb';
import { Certificate } from '@fidm/x509';
import { getConfig } from './walletSetup';

const parseAddress = (address: string) => {
    const addressList = address.split('/');
    const fabricArgs = addressList[2].split(':');
    return { channel: fabricArgs[0], contract: fabricArgs[1], ccFunc: fabricArgs[2], args: fabricArgs.slice(3) };
};
const getWallet = (walletPath: string) => {
    return Wallets.newFileSystemWallet(walletPath);
};

// Main invoke function wtih logic to handle policy and turn response from chaincode into a view.
// 1. Prepare credentials/gateway for communicating with fabric network
// 2. prepare info required for invoke (address/policy)
// 3. Set the endorser list for the transaction, this enforces that the list provided will endorse the proposed transaction
// 4. Prepare the view and return.
async function invoke(
    query: query_pb.Query,
    networkName: string,
    requestingNetwork: string,
    requestingOrg: string,
): Promise<view_data.FabricView> {
    console.log('Running invoke on fabric network');
    try {
        // load the network configuration
        const ccpPath = process.env.CONNECTION_PROFILE
            ? path.resolve(__dirname, process.env.CONNECTION_PROFILE)
            : path.resolve(__dirname, '../connection_profile.json');
        if (!fs.existsSync(ccpPath)) {
            console.error('File does not exist at path: ', ccpPath);
            console.error(
                'Please check the CONNECTION_PROFILE environemnt variable in your .env. The path will default to the root of the fabric-driver folder if not supplied',
            );
            throw new Error('No CONNECTION_PROFILE provided in .env');
        }
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        const config = getConfig();
        // 1. Prepare credentials/gateway for communicating with fabric network
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), `wallet-${networkName}`);
        const userName = config.relay.name;
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
            discovery: { enabled: true, asLocalhost: process.env.local === 'false' ? false : true },
        });
    // 2. prepare info required for invoke (address/policy)

        const parsedAddress = parseAddress(query.getAddress());
        // Get the network (channel) our contract is deployed to.
        console.log(parsedAddress.channel);
        const network = await gateway.getNetwork(parsedAddress.channel);
        const currentChannel = network.getChannel();
        const endorsers = currentChannel.getEndorsers();
        console.log(endorsers);
        // Get the contract from the network.
        console.log('policy', query.getPolicyList());
        const contract = network.getContract(process.env.INTEROP_CHAINCODE ? process.env.INTEROP_CHAINCODE : 'interop');

        // LOGIC for getting identities from the provided policy. If none can be found it will default to all.
        const identities = query.getPolicyList();

        console.log('Message: ', query.getAddress() + query.getNonce(), identities);
        console.log(
            'CC ARGS',
            parsedAddress.ccFunc,
            ...parsedAddress.args,
            requestingNetwork,
            requestingOrg,
            query.getCertificate(),
            query.getRequestorSignature(),
            query.getAddress() + query.getNonce(),
        );
        // 3. Set the endorser list for the transaction, this enforces that the list provided will endorse the proposed transaction
        const transaction = contract.createTransaction('HandleExternalRequest');
        if (identities.length > 0) {
            const endorserList = endorsers.filter((endorser: Endorser) => {
                //@ts-ignore
                const cert = Certificate.fromPEM(endorser.options.pem);
                const orgName = cert.issuer.organizationName;
                return identities.includes(endorser.mspid) || identities.includes(orgName);
            });
            console.log('Endorsers', endorserList);
            transaction.setEndorsingPeers(endorserList);
            console.log('Set endorsers');
        } else {
            // When no identities provided it will default to all peers
            transaction.setEndorsingPeers(endorsers);
        }
        const b64QueryBytes = Buffer.from(query.serializeBinary()).toString('base64');
        // submit transaction and get result from chaincode
        const read = await transaction.submit(b64QueryBytes);
        console.log('Submittransactionresponse', read);
        // 4. Prepare the view and return.
        const viewPayload = new view_data.FabricView();
        const endorsements: proposalResponse.Endorsement[] = [];
        //TODO Fix ts error
        //@ts-ignore
        read.proposalResponse.forEach((response) => {
            console.log('Response', response);
            viewPayload.setProposalResponsePayload(
                proposalResponse.ProposalResponsePayload.deserializeBinary(response.payload),
            );
            const currentResponse = new proposalResponse.Response();
            currentResponse.setStatus(response.response.status);
            currentResponse.setMessage(response.response.message);
            currentResponse.setPayload(
                interopPayload.InteropPayload.deserializeBinary(response.response.payload).serializeBinary(),
            );
            viewPayload.setResponse(currentResponse);
            const endorsement = new proposalResponse.Endorsement();
            endorsement.setSignature(response.endorsement.signature);
            endorsement.setEndorser(response.endorsement.endorser);

            endorsements.push(endorsement);
        });
        viewPayload.setEndorsementsList(endorsements);
        // Disconnect from the gateway.
        gateway.disconnect();
        return viewPayload;
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        throw error;
    }
}

export default invoke;
