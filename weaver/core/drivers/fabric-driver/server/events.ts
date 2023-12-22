/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import ack_pb from "@hyperledger/cacti-weaver-protos-js/common/ack_pb";
import eventsPb from "@hyperledger/cacti-weaver-protos-js/common/events_pb";
import events_grpc_pb from "@hyperledger/cacti-weaver-protos-js/relay/events_grpc_pb";
import queryPb from "@hyperledger/cacti-weaver-protos-js/common/query_pb";
import { InteroperableHelper } from "@hyperledger/cacti-weaver-sdk-fabric";
import { getDriverKeyCert } from "./walletSetup";
import {
  DBConnector,
  DBKeyNotFoundError,
  LevelDBConnector,
} from "./dbConnector";
import { checkIfArraysAreEqual, handlePromise, relayCallback } from "./utils";
import {
  registerListenerForEventSubscription,
  unregisterListenerForEventSubscription,
} from "./listener";
import { getNetworkGateway } from "./fabric-code";
import { Gateway, Network, Contract } from "fabric-network";
import state_pb from "@hyperledger/cacti-weaver-protos-js/common/state_pb";
import driverPb from "@hyperledger/cacti-weaver-protos-js/driver/driver_pb";
import logger from "./logger";

import fs from "fs";
import path from "path";

const DB_NAME: string = "driverdb";
const DRIVER_ERROR_CONSTANTS = JSON.parse(
  fs
    .readFileSync(
      path.resolve(__dirname, "../constants/driver-error-constants.json"),
    )
    .toString(),
);

async function subscribeEventHelper(
  call_request: eventsPb.EventSubscription,
  client: events_grpc_pb.EventSubscribeClient,
  network_name: string,
) {
  const newRequestId = call_request.getQuery()!.getRequestId();
  const [requestId, error] = await handlePromise(
    addEventSubscription(call_request),
  );
  if (error) {
    const errorString: string = `error (thrown as part of async processing while storing to DB during subscribeEvent): ${error.toString()}`;
    logger.error(errorString);
    const ack_send_error = new ack_pb.Ack();
    ack_send_error.setRequestId(newRequestId);
    ack_send_error.setMessage(errorString);
    ack_send_error.setStatus(ack_pb.Ack.STATUS.ERROR);
    // gRPC response.
    logger.info(
      `Sending to the relay the eventSubscription error Ack: ${JSON.stringify(ack_send_error.toObject())}`,
    );
    // Sending the fabric state to the relay.
    client.sendDriverSubscriptionStatus(ack_send_error, relayCallback);
  } else {
    const ack_send = new ack_pb.Ack();
    logger.debug(`${newRequestId}, ${requestId}`);
    if (newRequestId == requestId) {
      // event being subscribed for the first time
      // Start an appropriate type of event listener for this event subscription if one is not already active
      const [, error] = await handlePromise(
        registerListenerForEventSubscription(
          call_request.getEventMatcher()!,
          network_name,
        ),
      );
      if (error) {
        // Need to delete subscription in database too, for consistency
        const [, err] = await handlePromise(
          deleteEventSubscription(
            call_request.getEventMatcher()!,
            newRequestId,
          ),
        );
        if (err) {
          const errorString: string = err.toString();
          logger.error(errorString);
        }
        const errorString2 = error.toString();
        logger.error(errorString2);
        ack_send.setMessage(
          `Event subscription error: listener registration failed with error: ${errorString2}`,
        );
        ack_send.setStatus(ack_pb.Ack.STATUS.ERROR);
      } else {
        ack_send.setMessage("Event subscription is successful!");
        ack_send.setStatus(ack_pb.Ack.STATUS.OK);
      }
    } else {
      // event being subscribed already exists
      const subExistsErrorMsg = DRIVER_ERROR_CONSTANTS.SUB_EXISTS.replace(
        "{0}",
        requestId,
      );
      ack_send.setMessage(subExistsErrorMsg);
      ack_send.setStatus(ack_pb.Ack.STATUS.ERROR);
    }
    ack_send.setRequestId(newRequestId);

    // gRPC response.
    logger.info(
      `Sending to the relay the eventSubscription Ack: ${JSON.stringify(ack_send.toObject())}`,
    );

    if (!process.env.RELAY_ENDPOINT) {
      throw new Error("RELAY_ENDPOINT is not set.");
    }

    // Sending the fabric state to the relay.
    client.sendDriverSubscriptionStatus(ack_send, relayCallback);
  }
}

async function unsubscribeEventHelper(
  call_request: eventsPb.EventSubscription,
  client: events_grpc_pb.EventSubscribeClient,
  network_name: string,
) {
  const [unregister, err] = await handlePromise(
    unregisterListenerForEventSubscription(
      call_request.getEventMatcher()!,
      network_name,
    ),
  );
  if (!unregister) {
    // Just log a warning. This is not critical.
    logger.warn(
      "No listener running for the given subscription or unable to stop listener",
    );
  }
  if (err) {
    // Just log the error. This is not critical.
    const errorString: string = err.toString();
    logger.error(errorString);
  }
  const newRequestId = call_request.getQuery()!.getRequestId();
  const [deletedSubscription, error] = await handlePromise(
    deleteEventSubscription(call_request.getEventMatcher()!, newRequestId),
  );
  if (error) {
    const errorString: string = `error (thrown as part of async processing while deleting from DB during unsubscribeEvent): ${error.toString()}`;
    logger.error(errorString);
    const ack_send_error = new ack_pb.Ack();
    ack_send_error.setRequestId(newRequestId);
    ack_send_error.setMessage(errorString);
    ack_send_error.setStatus(ack_pb.Ack.STATUS.ERROR);
    // gRPC response.
    logger.info(
      `Sending to the relay the eventSubscription error Ack: ${JSON.stringify(ack_send_error.toObject())}`,
    );
    // Sending the fabric state to the relay.
    client.sendDriverSubscriptionStatus(ack_send_error, relayCallback);
  } else {
    const ack_send = new ack_pb.Ack();

    // event got unsubscribed
    ack_send.setMessage(
      `Event ${JSON.stringify(deletedSubscription.toObject())} unsubscription is successful!`,
    );
    ack_send.setStatus(ack_pb.Ack.STATUS.OK);
    ack_send.setRequestId(newRequestId);

    // gRPC response.
    logger.info(
      `Sending to the relay the eventSubscription Ack: ${JSON.stringify(ack_send.toObject())}`,
    );

    if (!process.env.RELAY_ENDPOINT) {
      throw new Error("RELAY_ENDPOINT is not set.");
    }

    // Sending the fabric state to the relay.
    client.sendDriverSubscriptionStatus(ack_send, relayCallback);
  }
}

async function addEventSubscription(
  eventSub: eventsPb.EventSubscription,
): Promise<string> {
  logger.info(
    `adding to driver, subscription of the eventSub: ${JSON.stringify(eventSub.toObject())}`,
  );
  let db: DBConnector;
  try {
    // Create connection to a database
    db = new LevelDBConnector(DB_NAME!);
    await db.open();

    // eventMatcher need to be non-null, hence apply the NaN assertion operator '!'
    const eventMatcher: eventsPb.EventMatcher = eventSub.getEventMatcher()!;
    // the serialized protobuf for eventMatcher below can be decoded to other formats like 'utf8' [.toString('utf8')]
    const key: string = Buffer.from(eventMatcher.serializeBinary()).toString(
      "base64",
    );

    // query need to be non-null, hence apply the NaN assertion operator '!'
    const query: queryPb.Query = eventSub.getQuery()!;
    // the serialized protobuf for query below can be decoded to other formats like 'utf8' [.toString('utf8')]
    const querySerialized: string = Buffer.from(
      query.serializeBinary(),
    ).toString("base64");
    // serialized content of subscriptions is the value present in the key/value LevelDB corresponding to the key
    let subscriptions: Array<string>;

    try {
      // fetch the current values in the DB against the given key
      const subscriptionsSerialized: string = (await db.read(key)) as string;
      subscriptions = JSON.parse(subscriptionsSerialized);

      logger.debug(`existing subscriptions.length: ${subscriptions.length}`);
      // check if the event to be subscribed is already present in the DB
      for (const subscriptionSerialized of subscriptions) {
        const subscription: queryPb.Query = queryPb.Query.deserializeBinary(
          Buffer.from(subscriptionSerialized, "base64"),
        );
        if (
          checkIfArraysAreEqual(
            subscription.getPolicyList(),
            query.getPolicyList(),
          ) &&
          subscription.getAddress() == query.getAddress() &&
          subscription.getRequestingRelay() == query.getRequestingRelay() &&
          subscription.getRequestingNetwork() == query.getRequestingNetwork() &&
          subscription.getCertificate() == query.getCertificate() &&
          subscription.getRequestingOrg() == query.getRequestingOrg() &&
          subscription.getConfidential() == query.getConfidential()
        ) {
          logger.info(
            `found subscription for query with requestId: ${subscription.getRequestId()}`,
          );
          await db.close();
          return subscription.getRequestId();
        }
      }

      // case of key being present in the list
      logger.debug(
        `eventMatcher: ${JSON.stringify(eventMatcher.toObject())} is already present in the database`,
      );
      subscriptions.push(querySerialized);
    } catch (error: any) {
      const errorString = error.toString();
      if (error instanceof DBKeyNotFoundError) {
        // case of read failing due to key not found
        logger.debug(
          `eventMatcher: ${JSON.stringify(eventMatcher.toObject())} is not present before in the database`,
        );
        subscriptions = new Array<string>();
        subscriptions.push(querySerialized);
      } else {
        // case of read failing due to some other issue
        logger.error(`re-throwing error: ${errorString}`);
        await db.close();
        throw new Error(error);
      }
    }

    logger.debug(`new subscriptions.length: ${subscriptions.length}`);
    const subscriptionsSerialized = JSON.stringify(subscriptions);
    // insert the value against key in the DB (it can be the scenario of a new key addition, or update to the value of an existing key)
    await db.insert(key, subscriptionsSerialized);
    await db.close();

    // TODO: register the event with fabric sdk
    logger.debug(
      `end addEventSubscription() .. requestId: ${query.getRequestId()}`,
    );
    return query.getRequestId();
  } catch (error: any) {
    logger.error(`Error during addEventSubscription(): ${error.toString()}`);
    await db?.close();
    throw new Error(error);
  }
}

const deleteEventSubscription = async (
  eventMatcher: eventsPb.EventMatcher,
  requestId: string,
): Promise<eventsPb.EventSubscription> => {
  logger.info(
    `deleting from driver subscription of the eventMatcher: ${JSON.stringify(eventMatcher.toObject())} with requestId: ${requestId}`,
  );
  let subscriptions: Array<string>;
  const retVal: eventsPb.EventSubscription = new eventsPb.EventSubscription();
  retVal.setEventMatcher(eventMatcher);
  let db: DBConnector;
  try {
    // Create connection to a database
    db = new LevelDBConnector(DB_NAME!);
    await db.open();

    const key: string = Buffer.from(eventMatcher.serializeBinary()).toString(
      "base64",
    );
    try {
      // fetch the current values in the DB against the given key
      const subscriptionsSerialized: string = (await db.read(key)) as string;
      subscriptions = JSON.parse(subscriptionsSerialized);

      logger.debug(`subscriptions.length: ${subscriptions.length}`);
      let foundEntry: boolean = false;
      for (const subscriptionSerialized of subscriptions) {
        const subscription: queryPb.Query = queryPb.Query.deserializeBinary(
          Buffer.from(subscriptionSerialized, "base64"),
        );
        if (subscription.getRequestId() == requestId) {
          logger.debug(
            `deleting the subscription (with input requestId): ${JSON.stringify(subscription.toObject())}`,
          );
          subscriptions.splice(
            subscriptions.indexOf(subscriptionSerialized),
            1,
          );
          retVal.setQuery(subscription);
          foundEntry = true;
          break;
        }
      }

      if (!foundEntry) {
        throw new Error(
          `event subscription with requestId: ${requestId} is not found!`,
        );
      }
    } catch (error: any) {
      // error could be either due to key not being present in the database or some other issue with database access
      logger.error(`re-throwing error: ${error.toString()}`);
      await db.close();
      throw new Error(error);
    }

    logger.debug(`subscriptions.length: ${subscriptions.length}`);
    if (subscriptions.length == 0) {
      await db.delete(key);
    } else {
      const subscriptionsSerialized = JSON.stringify(subscriptions);
      await db.insert(key, subscriptionsSerialized);
    }

    await db.close();
    logger.debug(
      `end deleteEventSubscription() .. retVal: ${JSON.stringify(retVal.toObject())}`,
    );
    return retVal;
  } catch (error: any) {
    logger.error(`Error during delete: ${error.toString()}`);
    await db?.close();
    throw new Error(error);
  }
};

function filterEventMatcher(
  keySerialized: string,
  eventMatcher: eventsPb.EventMatcher,
): boolean {
  const item: eventsPb.EventMatcher = eventsPb.EventMatcher.deserializeBinary(
    Buffer.from(keySerialized, "base64"),
  );
  logger.debug(`eventMatcher from db: ${JSON.stringify(item.toObject())}`);
  if (
    (eventMatcher.getEventClassId() == "*" ||
      eventMatcher.getEventClassId() == item.getEventClassId()) &&
    (eventMatcher.getTransactionContractId() == "*" ||
      eventMatcher.getTransactionContractId() ==
        item.getTransactionContractId()) &&
    (eventMatcher.getTransactionLedgerId() == "*" ||
      eventMatcher.getTransactionLedgerId() == item.getTransactionLedgerId()) &&
    (eventMatcher.getTransactionFunc() == "*" ||
      eventMatcher.getTransactionFunc().toLowerCase() ==
        item.getTransactionFunc().toLowerCase())
  ) {
    return true;
  } else {
    return false;
  }
}

async function lookupEventSubscriptions(
  eventMatcher: eventsPb.EventMatcher,
): Promise<Array<queryPb.Query>> {
  logger.debug(
    `finding the subscriptions with eventMatcher: ${JSON.stringify(eventMatcher.toObject())}`,
  );
  let subscriptions: Array<string>;
  let returnSubscriptions: Array<queryPb.Query> = new Array<queryPb.Query>();
  let db: DBConnector;

  try {
    // Create connection to a database
    db = new LevelDBConnector(DB_NAME!);
    await db.open();

    for (const subscriptionsSerialized of await db.filteredRead(
      filterEventMatcher,
      eventMatcher,
    )) {
      subscriptions = JSON.parse(subscriptionsSerialized);
      for (const subscriptionSerialized of subscriptions) {
        const subscription: queryPb.Query = queryPb.Query.deserializeBinary(
          Buffer.from(subscriptionSerialized, "base64"),
        );
        logger.debug(
          `subscription: ${JSON.stringify(subscription.toObject())}`,
        );
        returnSubscriptions.push(subscription);
      }
    }

    logger.info(`found ${returnSubscriptions.length} matching subscriptions`);
    logger.debug(`end lookupEventSubscriptions()`);
    await db.close();
    return returnSubscriptions;
  } catch (error: any) {
    const errorString: string = error.toString();
    await db?.close();
    if (error instanceof DBKeyNotFoundError) {
      // case of read failing due to key not found
      returnSubscriptions = new Array<queryPb.Query>();
      logger.info(`found ${returnSubscriptions.length} matching subscriptions`);
      return returnSubscriptions;
    } else {
      // case of read failing due to some other issue
      logger.error(`Error during lookup: ${errorString}`);
      throw new Error(error);
    }
  }
}

async function readAllEventMatchers(): Promise<Array<eventsPb.EventMatcher>> {
  const returnMatchers = [];
  let db: DBConnector;
  logger.debug(`start readAllEventMatchers()`);
  try {
    // Create connection to a database
    db = new LevelDBConnector(DB_NAME!);
    await db.open();
    const keys = await db.getAllKeys();
    for (const key of keys) {
      const eventMatcher = eventsPb.EventMatcher.deserializeBinary(
        Uint8Array.from(Buffer.from(key, "base64")),
      );
      returnMatchers.push(eventMatcher);
    }
    logger.info(`found ${returnMatchers.length} eventMatchers`);
    logger.debug(`end readAllEventMatchers()`);
    await db.close();
    return returnMatchers;
  } catch (error: any) {
    const errorString: string = error.toString();
    await db?.close();
    // case of read failing due to some other issue
    logger.error(`Error during read: ${errorString}`);
    throw new Error(error);
  }
}

async function signEventSubscriptionQuery(
  inputQuery: queryPb.Query,
): Promise<queryPb.Query> {
  logger.info(
    `driver ready to provide sign on query: ${JSON.stringify(inputQuery.toObject())}`,
  );
  const signedQuery = new queryPb.Query();

  try {
    signedQuery.setPolicyList(inputQuery.getPolicyList());
    signedQuery.setAddress(inputQuery.getAddress());
    signedQuery.setRequestingRelay(inputQuery.getRequestingRelay());
    signedQuery.setRequestingOrg(inputQuery.getRequestingOrg());
    signedQuery.setRequestingNetwork(inputQuery.getRequestingNetwork());
    signedQuery.setNonce(inputQuery.getNonce());
    signedQuery.setRequestId(inputQuery.getRequestId());
    signedQuery.setConfidential(inputQuery.getConfidential());

    const keyCert = await getDriverKeyCert();
    signedQuery.setCertificate(keyCert.cert);
    signedQuery.setRequestorSignature(
      InteroperableHelper.signMessage(
        inputQuery.getAddress() + inputQuery.getNonce(),
        keyCert.key.toBytes(),
      ),
    );
    return signedQuery;
  } catch (error: any) {
    const errorString: string = `${error.toString()}`;
    logger.error(`signing query failed with error: ${errorString}`);
    throw new Error(error);
  }
}

async function writeExternalStateHelper(
  writeExternalStateMessage: driverPb.WriteExternalStateMessage,
  networkName: string,
): Promise<any> {
  const viewPayload: state_pb.ViewPayload =
    writeExternalStateMessage.getViewPayload();
  const ctx: eventsPb.ContractTransaction = writeExternalStateMessage.getCtx();
  const keyCert = await getDriverKeyCert();

  if (!viewPayload.getError()) {
    const interopArgIndices = [],
      viewsSerializedBase64 = [],
      addresses = [],
      viewContentsBase64 = [];
    const view: state_pb.View = viewPayload.getView();

    const result = InteroperableHelper.getResponseDataFromView(
      view,
      keyCert.key.toBytes(),
    );
    if (result.contents) {
      viewContentsBase64.push(result.contents);
    } else {
      viewContentsBase64.push([]);
    }

    interopArgIndices.push(ctx.getReplaceArgIndex());
    addresses.push(result.viewAddress);
    viewsSerializedBase64.push(
      Buffer.from(viewPayload.getView().serializeBinary()).toString("base64"),
    );

    const ccArgsB64 = ctx.getArgsList();
    const ccArgsStr = [];
    for (const ccArgB64 of ccArgsB64) {
      ccArgsStr.push(Buffer.from(ccArgB64).toString("utf8"));
    }

    const gateway: Gateway = await getNetworkGateway(networkName);
    const network: Network = await gateway.getNetwork(ctx.getLedgerId());
    const interopContract: Contract = network.getContract(
      process.env.INTEROP_CHAINCODE ? process.env.INTEROP_CHAINCODE : "interop",
    );

    const endorsingOrgs = ctx.getMembersList();
    const invokeObject = {
      channel: ctx.getLedgerId(),
      ccFunc: ctx.getFunc(),
      ccArgs: ccArgsStr,
      contractName: ctx.getContractId(),
    };
    logger.info(
      `writing external state to contract: ${ctx.getContractId()} with function: ${ctx.getFunc()}, and args: ${invokeObject.ccArgs} on channel: ${ctx.getLedgerId()}`,
    );

    const [response, responseError] = await handlePromise(
      InteroperableHelper.submitTransactionWithRemoteViews(
        interopContract,
        invokeObject,
        interopArgIndices,
        addresses,
        viewsSerializedBase64,
        viewContentsBase64,
        endorsingOrgs,
      ),
    );
    if (responseError) {
      logger.error(`Failed writing to the ledger with error: ${responseError}`);
      gateway.disconnect();
      throw responseError;
    }
    logger.debug(`write external state response: ${response}`);
    logger.debug(`write successful`);
    gateway.disconnect();
  } else {
    const errorString: string = `erroneous viewPayload identified in WriteExternalState processing`;
    logger.error(
      `error viewPayload.getError(): ${JSON.stringify(viewPayload.getError())}`,
    );
    throw new Error(errorString);
  }
}

export {
  subscribeEventHelper,
  unsubscribeEventHelper,
  addEventSubscription,
  deleteEventSubscription,
  lookupEventSubscriptions,
  readAllEventMatchers,
  signEventSubscriptionQuery,
  writeExternalStateHelper,
};
