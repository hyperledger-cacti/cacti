import satp_pb from '@hyperledger/cacti-weaver-protos-js/relay/satp_pb';
import satp_grpc_pb from '@hyperledger/cacti-weaver-protos-js/relay/satp_grpc_pb';
import driverPb from '@hyperledger/cacti-weaver-protos-js/driver/driver_pb';
import logger from './logger';
import { credentials } from '@grpc/grpc-js';

import { getNetworkConfig } from './helpers/helpers'
import { SatpAssetManager, HashFunctions } from '@hyperledger/cacti-weaver-sdk-fabric'

import fs from 'fs';
import path from 'path';
import { fabricHelper } from './helpers/fabric-functions';

const DB_NAME: string = "driverdb";
const DRIVER_ERROR_CONSTANTS = JSON.parse(
    fs.readFileSync(
        path.resolve(__dirname, '../constants/driver-error-constants.json'),
    ).toString(),
);

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
    performLockRequest2['param'] = 'bond01:a05';

    // Locker and recipient
    const locker = performLockRequest2['locker'];
    const recipient = performLockRequest2['recipient'];
    let hashFn = performLockRequest2['hash_fn'];
    let hashBase64 = performLockRequest2['hashBase64'];
    const targetNetwork = performLockRequest2['target-network'];

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

    const params = performLockRequest2['param'].split(':')
    const netConfig = getNetworkConfig(targetNetwork)

    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
        console.error(
            `Please use a valid --target-network. No valid environment found for ${targetNetwork} `
        )
        return
    }

    const network = await fabricHelper({
        channel: netConfig.channelName,
        contractName: netConfig.chaincode,
        connProfilePath: netConfig.connProfilePath,
        networkName: targetNetwork,
        mspId: netConfig.mspId,
        userString: locker
    })

    const lockerId = await network.wallet.get(locker)
    const lockerCert = Buffer.from((lockerId).credentials.certificate).toString('base64')
    const recipientId = await network.wallet.get(recipient)
    const recipientCert = Buffer.from((recipientId).credentials.certificate).toString('base64')

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
        // const res = await funcToCall(network.contract,
        //     params[0],
        //     params[1],
        //     recipientCert,
        //     hash,
        //     timeout,
        //     null)
        // if (!res.result) {
        //     throw new Error()
        // }
        // console.info(`${asset} Locked with Contract Id: ${res.result}, preimage: ${res.hash.getPreimage()}, hashvalue: ${res.hash.getSerializedHashBase64()}`)
        console.info('Asset has been locked successfully')

    } catch (error) {
        console.error(`Could not Lock ${asset} in ${targetNetwork}`)
    }

    await network.gateway.disconnect()
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
    createAssetRequest2['id'] = 'a065';
    createAssetRequest2['issuer'] = 'admin';
    createAssetRequest2['facevalue'] = '300';
    createAssetRequest2['maturitydate'] = '05 May 48 00:00 MST';

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

    const netConfig = getNetworkConfig(targetNetwork)
    console.info(netConfig)
    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
        console.error(
            `Please use a valid --target-network. No valid environment found for ${targetNetwork} `
        )
        return
    }

    const currentQuery = {
        channel: netConfig.channelName,
        contractName: netConfig.chaincode,
        ccFunc: '',
        args: []
    }

    const network = await fabricHelper({
        channel: netConfig.channelName,
        contractName: netConfig.chaincode,
        connProfilePath: netConfig.connProfilePath,
        networkName: targetNetwork,
        mspId: netConfig.mspId,
        userString: owner,
        registerUser: false
    })

    const userId = await network.wallet.get(owner)
    const userCert = Buffer.from((userId).credentials.certificate).toString('base64')

    if (ccType == 'bond') {
        currentQuery.ccFunc = 'CreateAsset'
        currentQuery.args = [...currentQuery.args, assetType, id, userCert, issuer, facevalue, maturitydate]
    } else if (ccType == 'token') {
        currentQuery.ccFunc = 'IssueTokenAssets'
        currentQuery.args = [...currentQuery.args, tokenassettype, numunits, userCert]
    } else {
        throw new Error(`Unrecognized asset category: ${ccType}`)
    }
    console.log(currentQuery)

    try {
        console.info(`Trying creating the asset: type: ${ccType}, id: ${id}, by: ${owner}, facevalue: ${facevalue}, maturitydate: ${maturitydate}`)
        const read = await network.contract.submitTransaction(currentQuery.ccFunc, ...currentQuery.args)
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

    await network.gateway.disconnect()
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
    assignAssetRequest2['param'] = 'bond01:a065';

    const targetNetwork = assignAssetRequest2['target-network'];
    const locker = assignAssetRequest2['locker'];
    const recipient = assignAssetRequest2['recipient'];
    const fungible = assignAssetRequest2['fungible'];
    const hashFn = assignAssetRequest2['hash_fn'];
    const secret = assignAssetRequest2['secret'];

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

    const netConfig = getNetworkConfig(targetNetwork)
    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
        console.error(
            `Please use a valid --target-network. No valid environment found for ${targetNetwork} `
        )
        return
    }

    const network = await fabricHelper({
        channel: netConfig.channelName,
        contractName: netConfig.chaincode,
        connProfilePath: netConfig.connProfilePath,
        networkName: targetNetwork,
        mspId: netConfig.mspId,
        userString: recipient
    })

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
            const lockerId = await network.wallet.get(locker)
            const lockerCert = Buffer.from((lockerId).credentials.certificate).toString('base64')

            console.info(`Trying assign asset with params: ${params[0]}, ${params[1]} locked by ${locker} for ${recipient}`)
            const res = await funcToCall(network.contract,
                params[0],
                params[1],
                lockerCert,
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

        await network.gateway.disconnect()
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
