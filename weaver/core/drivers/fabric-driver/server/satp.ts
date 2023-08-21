import ack_pb from '@hyperledger/cacti-weaver-protos-js/common/ack_pb';
import eventsPb from '@hyperledger/cacti-weaver-protos-js/common/events_pb';
import events_grpc_pb from '@hyperledger/cacti-weaver-protos-js/relay/events_grpc_pb';
import queryPb from '@hyperledger/cacti-weaver-protos-js/common/query_pb';
import { InteroperableHelper } from '@hyperledger/cacti-weaver-sdk-fabric';
import { getDriverKeyCert } from "./walletSetup";
import { DBConnector, DBKeyNotFoundError, LevelDBConnector } from "./dbConnector";
import { checkIfArraysAreEqual, handlePromise, relayCallback } from "./utils";
import { registerListenerForEventSubscription, unregisterListenerForEventSubscription } from "./listener";
import { getNetworkGateway } from "./fabric-code";
import { Gateway, Network, Contract } from "fabric-network";
import state_pb from '@hyperledger/cacti-weaver-protos-js/common/state_pb';
import driverPb from '@hyperledger/cacti-weaver-protos-js/driver/driver_pb';
import logger from './logger';

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


    // Locker and Recipient
    const locker = performLockRequest['locker'];
    const recipient = performLockRequest['recipient'];
    let hashFn = performLockRequest['hash_fn'];
    let hashBase64 = performLockRequest['hashBase64'];

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
    if (performLockRequest['timeout-epoch']) {
        let duration = performLockRequest['timeout-epoch'] - currTime
        timeout = performLockRequest['timeout-epoch']
        timeout2 = performLockRequest['timeout-epoch'] + duration
    }
    else if (performLockRequest['timeout-duration']) {
        timeout = currTime + performLockRequest['timeout-duration']
        timeout2 = currTime + 2 * performLockRequest['timeout-duration']
    }

    const params = performLockRequest['param'].split(':')

    const netConfig = getNetworkConfig(performLockRequest['target-network'])
    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
        console.error(
            `Please use a valid --target-network. No valid environment found for ${performLockRequest['target-network']} `
        )
        return
    }

    const network = await fabricHelper({
        channel: netConfig.channelName,
        contractName: netConfig.chaincode,
        connProfilePath: netConfig.connProfilePath,
        networkName: performLockRequest['target-network'],
        mspId: netConfig.mspId,
        userString: locker
    })

    const lockerId = await network.wallet.get(locker)
    const lockerCert = Buffer.from((lockerId).credentials.certificate).toString('base64')

    const recipientId = await network.wallet.get(recipient)
    const recipientCert = Buffer.from((recipientId).credentials.certificate).toString('base64')

    var funcToCall, asset

    if (performLockRequest['fungible']) {
        funcToCall = AssetManager.createFungibleHTLC
        asset = 'Fungible Asset'
    } else {
        funcToCall = AssetManager.createHTLC
        asset = 'Asset'
    }

    console.info(`Asset Exchange: Lock ${asset}:\n`);

    try {
        console.info(`Trying ${asset} Lock: ${params[0]}, ${params[1]} by ${locker} for ${recipient}`)
        const res = await funcToCall(network.contract,
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
        console.info('Asset Exchange: Lock Complete.')
    } catch (error) {
        console.error(`Could not Lock ${asset} in ${performLockRequest['target-network']}`)
    }

    // await new Promise(f => setTimeout(f, performLockRequest['timeout-duration'] * 1000 + 3000));

    await network.gateway.disconnect()
    console.log('Gateways disconnected.')


    // const viewPayload: state_pb.ViewPayload = performLockRequest.getViewPayload();
    // const ctx: eventsPb.ContractTransaction = writeExternalStateMessage.getCtx();
    // const keyCert = await getDriverKeyCert();

    // const requestId: string = viewPayload.getRequestId();
    // if (!viewPayload.getError()) {

    //     let interopArgIndices = [], viewsSerializedBase64 = [], addresses = [], viewContentsBase64 = [];
    //     const view: state_pb.View = viewPayload.getView();

    //     const result = InteroperableHelper.getResponseDataFromView(view, keyCert.key.toBytes());
    //     if (result.contents) {
    //         viewContentsBase64.push(result.contents);
    //     } else {
    //         viewContentsBase64.push([]);
    //     }

    //     interopArgIndices.push(ctx.getReplaceArgIndex());
    //     addresses.push(result.viewAddress);
    //     viewsSerializedBase64.push(Buffer.from(viewPayload.getView().serializeBinary()).toString("base64"));

    //     let ccArgsB64 = ctx.getArgsList();
    //     let ccArgsStr = [];
    //     for (const ccArgB64 of ccArgsB64) {
    //         ccArgsStr.push(Buffer.from(ccArgB64).toString('utf8'));
    //     }

    //     let gateway: Gateway = await getNetworkGateway(networkName);
    //     const network: Network = await gateway.getNetwork(ctx.getLedgerId());
    //     const interopContract: Contract = network.getContract(process.env.INTEROP_CHAINCODE ? process.env.INTEROP_CHAINCODE : 'interop');

    //     const endorsingOrgs = ctx.getMembersList();
    //     const invokeObject = {
    //         channel: ctx.getLedgerId(),
    //         ccFunc: ctx.getFunc(),
    //         ccArgs: ccArgsStr,
    //         contractName: ctx.getContractId()
    //     }
    //     logger.info(`writing external state to contract: ${ctx.getContractId()} with function: ${ctx.getFunc()}, and args: ${invokeObject.ccArgs} on channel: ${ctx.getLedgerId()}`);

    //     const [ response, responseError ] = await handlePromise(InteroperableHelper.submitTransactionWithRemoteViews(
    //         interopContract,
    //         invokeObject,
    //         interopArgIndices,
    //         addresses,
    //         viewsSerializedBase64,
    //         viewContentsBase64,
    //         endorsingOrgs
    //     ));
    //     if (responseError) {
    //         logger.error(`Failed writing to the ledger with error: ${responseError}`);
    //         gateway.disconnect();
    //         throw responseError;
    //     }
    //     logger.debug(`write successful`);
    //     gateway.disconnect();
    // } else {
    //     const errorString: string = `erroneous viewPayload identified in WriteExternalState processing`;
    //     logger.error(`error viewPayload.getError(): ${JSON.stringify(viewPayload.getError())}`);
    //     throw new Error(errorString);
    // }
}

export {
    performLockHelper
}
