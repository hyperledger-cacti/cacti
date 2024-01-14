import satp_pb from '@hyperledger/cacti-weaver-protos-js/relay/satp_pb';
import satp_grpc_pb from '@hyperledger/cacti-weaver-protos-js/relay/satp_grpc_pb';
import driverPb from '@hyperledger/cacti-weaver-protos-js/driver/driver_pb';
import logger from './logger';
import { credentials } from '@grpc/grpc-js';
import { SatpAssetManager, HashFunctions } from '@hyperledger/cacti-weaver-sdk-fabric'
import fs from 'fs';
import path from 'path';
import { fabricHelper, getKeyAndCertForRemoteRequestbyUserName } from '@hyperledger/cacti-weaver-fabric-cli/helpers/fabric-functions';
import { Gateway, Network, Wallets, Contract, X509Identity } from 'fabric-network'
import { getNetworkGateway } from "./fabric-code";
import { getDriverKeyCert } from './walletSetup';

const DB_NAME: string = "driverdb";
const DRIVER_ERROR_CONSTANTS = JSON.parse(
    fs.readFileSync(
        path.resolve(__dirname, '../constants/driver-error-constants.json'),
    ).toString(),
);

const getWallet = (walletPath: string) => {
    return Wallets.newFileSystemWallet(walletPath);
};

async function performLockHelper(
    performLockRequest: driverPb.PerformLockRequest,
    networkName: string
): Promise<any> {

    // TODO: remove the hardcoded values 
    let performLockRequest2 = {};
    performLockRequest2['target-network'] = 'network1';
    performLockRequest2['hashBase64'] = 'ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs=';
    performLockRequest2['timeout-duration'] = parseInt('3600');
    performLockRequest2['locker'] = 'alice';
    performLockRequest2['recipient'] = 'bob';
    performLockRequest2['lockerWalletPath'] = '../wallet-network1/alice.id';
    performLockRequest2['recipientWalletPath'] = '../wallet-network1/bob.id';
    performLockRequest2['param'] = 'bond01:a05';
    performLockRequest2['channel'] = 'mychannel';
    performLockRequest2['chaincode-id'] = 'satpsimpleasset';

    // Locker and recipient
    const locker = performLockRequest2['locker'];
    const recipient = performLockRequest2['recipient'];
    const lockerWalletPath = performLockRequest2['lockerWalletPath'];
    const recipientWalletPath = performLockRequest2['recipientWalletPath'];
    let hashFn = performLockRequest2['hash_fn'];
    let hashBase64 = performLockRequest2['hashBase64'];
    const targetNetwork = performLockRequest2['target-network'];
    const channel = performLockRequest2['channel'];
    const chaincodeId = performLockRequest2['chaincode-id'];

    // Hash
    let hash: HashFunctions.Hash
    if (hashFn == 'SHA512') {
        hash = new HashFunctions.SHA512()
    } else {
        hash = new HashFunctions.SHA256()
    }

    if (hashBase64) {
        hash.setSerializedHashBase64(hashBase64)
    }
    else {
        logger.info(`No hash provided, using random preimage`)
    }

    // Timeout
    var timeout = 0, timeout2 = 0;
    const currTime = Math.floor(Date.now() / 1000);
    if (performLockRequest2['timeout-epoch']) {
        let duration = performLockRequest2['timeout-epoch'] - currTime
        timeout = performLockRequest2['timeout-epoch']
        timeout2 = performLockRequest2['timeout-epoch'] + duration
    }
    else if (performLockRequest2['timeout-duration']) {
        timeout = currTime + performLockRequest2['timeout-duration']
        timeout2 = currTime + 2 * performLockRequest2['timeout-duration']
    }

    let gateway: Gateway = await getNetworkGateway(networkName);
    const network: Network = await gateway.getNetwork(channel);
    const contract = network.getContract(chaincodeId);

    const params = performLockRequest2['param'].split(':')
    const lockerCert = Buffer.from(lockerWalletPath).toString('base64')
    const recipientCert = Buffer.from(recipientWalletPath).toString('base64')

    var funcToCall, asset

    if (performLockRequest2['fungible']) {
        funcToCall = SatpAssetManager.createFungibleHTLC
        asset = 'Fungible Asset'
    } else {
        funcToCall = SatpAssetManager.createHTLC
        asset = 'Asset'
    }

    console.info(`Asset Lock: Lock ${asset}:\n`);
    try {
        console.info(`Trying ${asset} Lock: ${params[0]}, ${params[1]} by ${locker} for ${recipient}`)
        const res = await funcToCall(contract,
            params[0],
            params[1],
            recipientCert,
            hash,
            timeout,
            null)
        if (!res.result) {
            throw new Error()
        }
        console.info(`${asset} Locked with Contract Id: ${res.result}, preimage: ${res.hash.getPreimage()}, hashvalue: ${res.hash.getSerializedHashBase64()}`)
        console.info('Asset has been locked successfully')

    } catch (error) {
        console.error(`Could not Lock ${asset} in ${targetNetwork}`)
    }

    await gateway.disconnect()
    logger.info('Gateways disconnected.')

    const client = getRelayClientForAssetStatusResponse();
    const request = new satp_pb.SendAssetStatusRequest();
    request.setSessionId(performLockRequest.getSessionId());
    request.setStatus("Locked");
    client.sendAssetStatus(request, relayCallback);
}

async function createAssetHelper(
    createAssetRequest: driverPb.CreateAssetRequest,
    networkName: string
): Promise<any> {

    // TODO: remove the hardcoded values 
    let createAssetRequest2 = {};
    createAssetRequest2['target-network'] = 'network1';
    createAssetRequest2['hashBase64'] = 'ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs=';
    createAssetRequest2['timeout-duration'] = parseInt('3600');
    createAssetRequest2['owner'] = 'admin';
    createAssetRequest2['type'] = 'bond';
    createAssetRequest2['assetType'] = 'bond01';
    createAssetRequest2['id'] = 'a0demo';
    createAssetRequest2['issuer'] = 'admin';
    createAssetRequest2['facevalue'] = '300';
    createAssetRequest2['maturitydate'] = '05 May 48 00:00 MST';
    createAssetRequest2['channel'] = 'mychannel';
    createAssetRequest2['chaincode-id'] = 'satpsimpleasset';

    const targetNetwork = createAssetRequest2['target-network'];
    const owner = createAssetRequest2['owner'];
    const ccType = createAssetRequest2['type'];
    const assetType = createAssetRequest2['assetType'];
    const id = createAssetRequest2['id'];
    const issuer = createAssetRequest2['issuer'];
    const facevalue = createAssetRequest2['facevalue'];
    const maturitydate = createAssetRequest2['maturitydate'];
    const tokenassettype = createAssetRequest2['tokenassettype'];
    const numunits = createAssetRequest2['numunits'];
    const channel = createAssetRequest2['channel'];
    const chaincodeId = createAssetRequest2['chaincode-id'];

    let gateway: Gateway = await getNetworkGateway(networkName);
    const network: Network = await gateway.getNetwork(channel);
    const contract = network.getContract(chaincodeId);
    const currentQuery = {
        channel: channel,
        contractName: chaincodeId,
        ccFunc: '',
        args: []
    }

    const driverkeyCert = await getDriverKeyCert();
    const certificate = Buffer.from(driverkeyCert.cert).toString('base64')

    if (ccType == 'bond') {
        currentQuery.ccFunc = 'CreateAsset'
        currentQuery.args = [...currentQuery.args, assetType, id, certificate, issuer, facevalue, maturitydate]
    } else if (ccType == 'token') {
        currentQuery.ccFunc = 'IssueTokenAssets'
        currentQuery.args = [...currentQuery.args, tokenassettype, numunits, certificate]
    } else {
        throw new Error(`Unrecognized asset category: ${ccType}`)
    }
    console.log(currentQuery)

    try {
        console.info(`Trying creating the asset: type: ${ccType}, id: ${id}, by: ${owner}, facevalue: ${facevalue}, maturitydate: ${maturitydate}`)
        const read = await contract.submitTransaction(currentQuery.ccFunc, ...currentQuery.args)
        const state = Buffer.from(read).toString()
        if (state) {
            logger.debug(`Response From Network: ${state}`)
            console.info('Asset has been created successfully')
        } else {
            logger.debug('No Response from network')
        }
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`)
        throw new Error(error)
    }

    await gateway.disconnect()
    logger.info('Gateways disconnected.')

    const client = getRelayClientForAssetStatusResponse();
    const request = new satp_pb.SendAssetStatusRequest();
    request.setSessionId(createAssetRequest.getSessionId());
    request.setStatus("Created");
    client.sendAssetStatus(request, relayCallback);
}

async function extinguishHelper(
    extinguishRequest: driverPb.ExtinguishRequest,
    networkName: string
): Promise<any> {

    // TODO
    const client = getRelayClientForAssetStatusResponse();
    const request = new satp_pb.SendAssetStatusRequest();
    request.setSessionId(extinguishRequest.getSessionId());
    request.setStatus("Extinguished");
    client.sendAssetStatus(request, relayCallback);
}

async function assignAssetHelper(
    assignAssetRequest: driverPb.AssignAssetRequest,
    networkName: string
): Promise<any> {

    // TODO: remove the hardcoded values 
    let assignAssetRequest2 = {};
    assignAssetRequest2['target-network'] = 'network1';
    assignAssetRequest2['hashBase64'] = 'ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs=';
    assignAssetRequest2['timeout-duration'] = parseInt('3600');
    assignAssetRequest2['locker'] = 'admin';
    assignAssetRequest2['recipient'] = 'bob';
    assignAssetRequest2['fungible'] = false;
    assignAssetRequest2['contract-id'] = 'abc01';
    assignAssetRequest2['hash_fn'] = '';
    assignAssetRequest2['secret'] = 'secrettext';
    assignAssetRequest2['param'] = 'bond01:a0demo';
    assignAssetRequest2['channel'] = 'mychannel';
    assignAssetRequest2['chaincode-id'] = 'satpsimpleasset';

    const targetNetwork = assignAssetRequest2['target-network'];
    const locker = assignAssetRequest2['locker'];
    const recipient = assignAssetRequest2['recipient'];
    const fungible = assignAssetRequest2['fungible'];
    const hashFn = assignAssetRequest2['hash_fn'];
    const secret = assignAssetRequest2['secret'];
    const channel = assignAssetRequest2['channel'];
    const chaincodeId = assignAssetRequest2['chaincode-id'];

    let gateway: Gateway = await getNetworkGateway(networkName);
    const network: Network = await gateway.getNetwork(channel);
    const contract = network.getContract(chaincodeId);

    // Hash
    let hash: HashFunctions.Hash
    if (hashFn == 'SHA512') {
        hash = new HashFunctions.SHA512()
    } else {
        hash = new HashFunctions.SHA256()
    }
    hash.setPreimage(secret)

    let contractId: string = null, params
    if (assignAssetRequest2['contract-id']) {
        contractId = assignAssetRequest2['contract-id']
    }

    params = assignAssetRequest2['param'].split(':')

    var funcToCall = SatpAssetManager.assignAsset
    var asset = assignAssetRequest2['param']

    if (assignAssetRequest2['fungible']) {
        // funcToCall = SatpAssetManager.claimFungibleAssetInHTLC
        asset = 'Fungible Asset'
    }

    if (fungible) {
        try {
            console.info(`Trying assigning the asset with contract id ${contractId}`)

            // TODO
        } catch (error) {
            console.error(`Could not assign ${asset} in ${targetNetwork}`)
            throw new Error(`Could not assign ${asset} in ${targetNetwork}`)
        }
    } else {
        try {
            const driverkeyCert = await getDriverKeyCert();
            const certificate = Buffer.from(driverkeyCert.cert).toString('base64')

            console.info(`Trying assign asset with params: ${params[0]}, ${params[1]} locked by ${locker} for ${recipient}`)
            const res = await funcToCall(contract,
                params[0],
                params[1],
                certificate,
                hash)
            if (!res) {
                throw new Error()
            }
            console.info(`${asset} assigned complete: ${res}`)
            console.info(`Asset ${asset} assign complete: ${res}`)
        } catch (error) {
            console.error(`Could not assign non-fungible ${asset} in ${targetNetwork}: ${error}`)
            throw new Error(`Could not assign non-fungible ${asset} in ${targetNetwork}: ${error}`)
        }

        await gateway.disconnect()
        logger.info('Gateways disconnected.')

        const client = getRelayClientForAssetStatusResponse();
        const request = new satp_pb.SendAssetStatusRequest();
        request.setSessionId(assignAssetRequest.getSessionId());
        request.setStatus("Finalized");
        client.sendAssetStatus(request, relayCallback);
    }
}

function getRelayClientForAssetStatusResponse() {
    let client: satp_grpc_pb.SATPClient;
    if (process.env.RELAY_TLS === 'true') {
        if (!process.env.RELAY_TLSCA_CERT_PATH || process.env.RELAY_TLSCA_CERT_PATH == "") {
            client = new satp_grpc_pb.SATPClient(
                process.env.RELAY_ENDPOINT,
                credentials.createSsl()
            );
        } else {
            if (!(process.env.RELAY_TLSCA_CERT_PATH && fs.existsSync(process.env.RELAY_TLSCA_CERT_PATH))) {
                throw new Error("Missing or invalid RELAY_TLSCA_CERT_PATH: " + process.env.RELAY_TLSCA_CERT_PATH);
            }
            const rootCert = fs.readFileSync(process.env.RELAY_TLSCA_CERT_PATH);
            client = new satp_grpc_pb.SATPClient(
                process.env.RELAY_ENDPOINT,
                credentials.createSsl(rootCert)
            );
        }
    } else {
        client = new satp_grpc_pb.SATPClient(
            process.env.RELAY_ENDPOINT,
            credentials.createInsecure()
        );
    }
    return client;
}

// handle callback
function relayCallback(err: any, response: any) {
    if (response) {
        logger.info(`Relay Callback Response: ${JSON.stringify(response.toObject())}`);
    } else if (err) {
        logger.error(`Relay Callback Error: ${err}`);
    }
}

export {
    performLockHelper,
    createAssetHelper,
    extinguishHelper,
    assignAssetHelper
}
