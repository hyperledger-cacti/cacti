import satp_pb from '@hyperledger/cacti-weaver-protos-js/relay/satp_pb';
import satp_grpc_pb from '@hyperledger/cacti-weaver-protos-js/relay/satp_grpc_pb';
import driverPb from '@hyperledger/cacti-weaver-protos-js/driver/driver_pb';
import logger from './logger';
import { credentials } from '@grpc/grpc-js';

import { getNetworkConfig } from './helpers/helpers'
import { AssetManager, HashFunctions } from '@hyperledger/cacti-weaver-sdk-fabric'

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

    let performLockRequest2 = {};
    performLockRequest2['target-network'] = 'network1';
    performLockRequest2['hashBase64'] = 'ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs=';
    performLockRequest2['timeout-duration'] = '3600';
    performLockRequest2['locker'] = 'alice';
    performLockRequest2['recipient'] = 'bob';
    performLockRequest2['param'] = 'bond01:a03';

    // Locker and Recipient
    const locker = performLockRequest2['locker'];
    const recipient = performLockRequest2['recipient'];
    let hashFn = performLockRequest2['hash_fn'];
    let hashBase64 = performLockRequest2['hashBase64'];

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
    const netConfig = getNetworkConfig(performLockRequest2['target-network'])

    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
        console.error(
            `Please use a valid --target-network. No valid environment found for ${performLockRequest2['target-network']} `
        )
        return
    }

    const network = await fabricHelper({
        channel: netConfig.channelName,
        contractName: netConfig.chaincode,
        connProfilePath: netConfig.connProfilePath,
        networkName: performLockRequest2['target-network'],
        mspId: netConfig.mspId,
        userString: locker
    })

    logger.info(`network details: ${network}`);
    const lockerId = await network.wallet.get(locker)

    const lockerCert = Buffer.from((lockerId).credentials.certificate).toString('base64')

    const recipientId = await network.wallet.get(recipient)
    const recipientCert = Buffer.from((recipientId).credentials.certificate).toString('base64')

    var funcToCall, asset

    if (performLockRequest2['fungible']) {
        funcToCall = AssetManager.createFungibleHTLC
        asset = 'Fungible Asset'
    } else {
        funcToCall = AssetManager.createHTLC
        asset = 'Asset'
    }

    console.info(`Asset Exchange: Lock ${asset}:\n`);

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
        console.info('Asset Exchange: Lock Complete.')

    } catch (error) {
        console.error(`Could not Lock ${asset} in ${performLockRequest2['target-network']}`)
    }

    // await new Promise(f => setTimeout(f, performLockRequest2['timeout-duration'] * 1000 + 3000));

    await network.gateway.disconnect()
    logger.info('Gateways disconnected.')

    const client = getRelayClientForAssetStatusResponse();
    const request = new satp_pb.SendAssetStatusRequest();
    request.setSessionId(performLockRequest.getSessionId());
    request.setStatus("Locked");
    client.sendAssetStatus(request, relayCallback);
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
    performLockHelper
}
