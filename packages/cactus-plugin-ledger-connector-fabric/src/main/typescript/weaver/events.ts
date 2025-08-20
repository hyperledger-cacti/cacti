import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import {
  ILoggerOptions,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  ContractTransaction,
  EventMatcher,
  EventMatcherSchema,
  EventSubscription,
  EventSubscriptionSchema,
} from "../generated/protos/common/events_pb";
import { View, ViewSchema } from "../generated/protos/common/state_pb";
import {
  FabricContractInvocationType,
  FabricSigningCredential,
  GatewayOptions,
  PluginLedgerConnectorFabric,
} from "../public-api";
import { checkIfArraysAreEqual, handlePromise, relayCallback } from "./utils";
import * as InteroperableHelper from "./weaver-fabric-sdk";
import { Ack_STATUS, AckSchema } from "../generated/protos/common/ack_pb";
import { EventSubscribe } from "../generated/protos/relay/events_pb";
import { Client } from "@connectrpc/connect";
import { WriteExternalStateMessage } from "../generated/protos/driver/driver_pb";
import * as DRIVER_ERROR_CONSTANTS from "./constants/driver-error-constants";
import {
  DBConnector,
  DBKeyNotFoundError,
  LevelDBConnector,
} from "./dbConnector";
import { Query, QuerySchema } from "../generated/protos/common/query_pb";
import { Listener } from "./listener";
import { FabricDriverServer } from "./fabric-driver-server";
import { signMessage } from "./weaver-fabric-sdk";

export interface IEventsOptions {
  logLevel: LogLevelDesc;
  driver: FabricDriverServer;
  certificate: any;
}

const DB_NAME: string = "driverdb";
export class Events {
  public static readonly className = "Events";
  private readonly logger: Logger;
  private readonly connector: PluginLedgerConnectorFabric;

  private listner: Listener;

  private certificate: any;

  constructor(options: IEventsOptions) {
    const logOptions: ILoggerOptions = {
      level: options.logLevel,
      label: Events.className,
    };
    this.logger = LoggerProvider.getOrCreate(logOptions);
    this.connector = options.driver.getConnectorInstance();
    this.listner = options.driver.getListenerInstance();
    this.certificate = options.certificate;
  }

  async subscribeEventHelper(
    call_request: EventSubscription,
    client: Client<typeof EventSubscribe>,
    gatewayOptions: GatewayOptions,
  ) {
    const newRequestId = call_request.query!.requestId;
    const [requestId, error] = await handlePromise(
      this.addEventSubscription(call_request),
    );
    if (error) {
      const errorString: string = `error (thrown as part of async processing while storing to DB during subscribeEvent): ${error.toString()}`;
      this.logger.error(errorString);
      const ack_send_error = create(AckSchema, {
        requestId: newRequestId,
        message: errorString,
        status: Ack_STATUS.ERROR,
      });

      // gRPC response.
      this.logger.info(
        `Sending to the relay the eventSubscription error Ack: ${JSON.stringify(ack_send_error)}`,
      );

      // Sending the fabric state to the relay.
      client
        .sendDriverSubscriptionStatus(ack_send_error)
        .then((response) => relayCallback({ response }))
        .catch((error) => relayCallback({ error }));
    } else {
      const ack_send = create(AckSchema, {});
      this.logger.debug(`${newRequestId}, ${requestId}`);
      if (newRequestId == requestId) {
        // event being subscribed for the first time
        // Start an appropriate type of event listener for this event subscription if one is not already active
        const [, error] = await handlePromise(
          this.listner.registerListenerForEventSubscription(
            call_request.eventMatcher!,
            gatewayOptions,
          ),
        );
        if (error) {
          // Need to delete subscription in database too, for consistency
          const [, err] = await handlePromise(
            this.deleteEventSubscription(
              call_request.eventMatcher!,
              newRequestId,
            ),
          );
          if (err) {
            const errorString: string = err.toString();
            this.logger.error(errorString);
          }
          const errorString2 = error.toString();
          this.logger.error(errorString2);
          ack_send.message = `Event subscription error: listener registration failed with error: ${errorString2}`;
          ack_send.status = Ack_STATUS.ERROR;
        } else {
          ack_send.message = "Event subscription is successful!";
          ack_send.status = Ack_STATUS.OK;
        }
      } else {
        // event being subscribed already exists
        const subExistsErrorMsg = DRIVER_ERROR_CONSTANTS.SUB_EXISTS.replace(
          "{0}",
          requestId as string,
        );
        ack_send.message = subExistsErrorMsg;
        ack_send.status = Ack_STATUS.ERROR;
      }
      ack_send.requestId = newRequestId;

      // gRPC response.
      this.logger.info(
        `Sending to the relay the eventSubscription Ack: ${JSON.stringify(ack_send)}`,
      );

      if (!process.env.RELAY_ENDPOINT) {
        throw new Error("RELAY_ENDPOINT is not set.");
      }

      // Sending the fabric state to the relay.
      client
        .sendDriverSubscriptionStatus(ack_send)
        .then((response) => relayCallback({ response }))
        .catch((error) => relayCallback({ error }));
    }
  }

  async unsubscribeEventHelper(
    call_request: EventSubscription,
    client: Client<typeof EventSubscribe>,
    gatewayOptions: GatewayOptions,
  ) {
    const [unregister, err] = await handlePromise(
      this.listner.unregisterListenerForEventSubscription(
        call_request.eventMatcher!,
        gatewayOptions,
      ),
    );
    if (!unregister) {
      // Just log a warning. This is not critical.
      this.logger.warn(
        "No listener running for the given subscription or unable to stop listener",
      );
    }
    if (err) {
      // Just log the error. This is not critical.
      const errorString: string = err.toString();
      this.logger.error(errorString);
    }
    const newRequestId = call_request.query!.requestId;
    const [deletedSubscription, error] = await handlePromise(
      this.deleteEventSubscription(call_request.eventMatcher!, newRequestId),
    );
    if (error) {
      const errorString: string = `error (thrown as part of async processing while deleting from DB during unsubscribeEvent): ${error.toString()}`;
      this.logger.error(errorString);
      const ack_send_error = create(AckSchema, {
        requestId: newRequestId,
        message: errorString,
        status: Ack_STATUS.ERROR,
      });
      // gRPC response.
      this.logger.info(
        `Sending to the relay the eventSubscription error Ack: ${JSON.stringify(ack_send_error)}`,
      );
      // Sending the fabric state to the relay.
      client
        .sendDriverSubscriptionStatus(ack_send_error)
        .then((response) => relayCallback({ response }))
        .catch((error) => relayCallback({ error }));
    } else {
      const ack_send = create(AckSchema, {
        requestId: newRequestId,
        // event got unsubscribed
        message: `Event ${JSON.stringify(deletedSubscription)} unsubscription is successful!`,
        status: Ack_STATUS.OK,
      });

      // gRPC response.
      this.logger.info(
        `Sending to the relay the eventSubscription Ack: ${JSON.stringify(ack_send)}`,
      );

      if (!process.env.RELAY_ENDPOINT) {
        throw new Error("RELAY_ENDPOINT is not set.");
      }

      // Sending the fabric state to the relay.
      client
        .sendDriverSubscriptionStatus(ack_send)
        .then((response) => relayCallback({ response }))
        .catch((error) => relayCallback({ error }));
    }
  }

  async writeExternalStateHelper(
    writeExternalStateMessage: WriteExternalStateMessage,
    signingCredential: FabricSigningCredential,
  ) {
    if (!writeExternalStateMessage.viewPayload) {
      throw new Error("No viewPayload provided in WriteExternalStateMessage");
    }

    const viewPayload = writeExternalStateMessage.viewPayload;

    if (!writeExternalStateMessage.ctx) {
      throw new Error("No context provided in WriteExternalStateMessage");
    }
    const ctx: ContractTransaction = writeExternalStateMessage.ctx;
    const keyCert = (
      await this.connector
        .getCertStore()
        .get(signingCredential.keychainId, signingCredential.keychainRef)
    ).credentials;

    if (!keyCert || !keyCert.privateKey || !keyCert.certificate) {
      throw new Error("No signing credential found");
    }

    if (viewPayload.state.case == "view") {
      const interopArgIndices = [],
        viewsSerializedBase64 = [],
        addresses = [],
        viewContentsBase64 = [];
      const view: View = viewPayload.state.value;

      const privKeyPEM = keyCert?.privateKey
        ? Buffer.from(keyCert.privateKey, "base64")
        : null;

      const result = InteroperableHelper.getResponseDataFromView(
        view,
        privKeyPEM as any,
      );
      if (result.contents) {
        viewContentsBase64.push(result.contents);
      } else {
        viewContentsBase64.push([]);
      }

      interopArgIndices.push(ctx.replaceArgIndex);
      addresses.push(result.viewAddress);
      viewsSerializedBase64.push(
        Buffer.from(toBinary(ViewSchema, view)).toString("base64"),
      );

      const ccArgsB64 = ctx.args;
      const ccArgsStr = [];
      for (const ccArgB64 of ccArgsB64) {
        ccArgsStr.push(Buffer.from(ccArgB64).toString("utf8"));
      }
      const invokeObject = {
        channel: ctx.ledgerId,
        ccFunc: ctx.func,
        ccArgs: ccArgsStr,
        contractName: ctx.contractId,
      };
      this.logger.info(
        `writing external state to contract: ${ctx.contractId} with function: ${ctx.func}, and args: ${invokeObject.ccArgs} on channel: ${ctx.ledgerId}`,
      );

      const [response, responseError] = await handlePromise(
        this.connector.transact({
          channelName: ctx.ledgerId,
          contractName: process.env.INTEROP_CHAINCODE
            ? process.env.INTEROP_CHAINCODE
            : "interop",
          methodName: "WriteExternalState",
          invocationType: FabricContractInvocationType.Send,
          params: [
            ctx.contractId,
            ctx.ledgerId,
            ctx.func,
            JSON.stringify(ccArgsStr),
            JSON.stringify(interopArgIndices),
            JSON.stringify(addresses),
            JSON.stringify(viewsSerializedBase64),
            JSON.stringify(viewContentsBase64),
          ],
          signingCredential: signingCredential,
          endorsingOrgs: ctx.members,
        }),
      );

      if (responseError) {
        this.logger.error(
          `Failed writing to the ledger with error: ${responseError}`,
        );
        throw responseError;
      }
      this.logger.debug(
        `write external state response: ${JSON.stringify(response)}`,
      );
      this.logger.debug(`write successful`);
    } else {
      const errorString: string = `erroneous viewPayload identified in WriteExternalState processing`;
      this.logger.error(
        `error viewPayload.getError(): ${JSON.stringify(viewPayload.state.value)}`,
      );
      throw new Error(errorString);
    }
  }

  async addEventSubscription(eventSub: EventSubscription): Promise<string> {
    this.logger.info(
      `adding to driver, subscription of the eventSub: ${JSON.stringify(eventSub)}`,
    );
    let db: DBConnector | undefined;
    try {
      // Create connection to a database
      db = new LevelDBConnector(DB_NAME!);
      await db.open();

      // eventMatcher need to be non-null, hence apply the NaN assertion operator '!'
      const eventMatcher: EventMatcher = eventSub.eventMatcher!;
      // the serialized protobuf for eventMatcher below can be decoded to other formats like 'utf8' [.toString('utf8')]
      const key: string = Buffer.from(
        toBinary(EventMatcherSchema, eventMatcher),
      ).toString("base64");

      // query need to be non-null, hence apply the NaN assertion operator '!'
      const query: Query = eventSub.query!;
      // the serialized protobuf for query below can be decoded to other formats like 'utf8' [.toString('utf8')]
      const querySerialized: string = Buffer.from(
        toBinary(QuerySchema, query),
      ).toString("base64");
      // serialized content of subscriptions is the value present in the key/value LevelDB corresponding to the key
      let subscriptions: Array<string>;

      try {
        // fetch the current values in the DB against the given key
        const subscriptionsSerialized: string = (await db.read(key)) as string;
        subscriptions = JSON.parse(subscriptionsSerialized);

        this.logger.debug(
          `existing subscriptions.length: ${subscriptions.length}`,
        );
        // check if the event to be subscribed is already present in the DB
        for (const subscriptionSerialized of subscriptions) {
          const subscription: Query = fromBinary(
            QuerySchema,
            Uint8Array.from(Buffer.from(subscriptionSerialized, "base64")),
          );
          if (
            checkIfArraysAreEqual(subscription.policy, query.policy) &&
            subscription.address == query.address &&
            subscription.requestingRelay == query.requestingRelay &&
            subscription.requestingNetwork == query.requestingNetwork &&
            subscription.certificate == query.certificate &&
            subscription.requestingOrg == query.requestingOrg &&
            subscription.confidential == query.confidential
          ) {
            this.logger.info(
              `found subscription for query with requestId: ${subscription.requestId}`,
            );
            await db.close();
            return subscription.requestId;
          }
        }

        // case of key being present in the list
        this.logger.debug(
          `eventMatcher: ${JSON.stringify(eventMatcher)} is already present in the database`,
        );
        subscriptions.push(querySerialized);
      } catch (error: any) {
        const errorString = error.toString();
        if (error instanceof DBKeyNotFoundError) {
          // case of read failing due to key not found
          this.logger.debug(
            `eventMatcher: ${JSON.stringify(eventMatcher)} is not present before in the database`,
          );
          subscriptions = new Array<string>();
          subscriptions.push(querySerialized);
        } else {
          // case of read failing due to some other issue
          this.logger.error(`re-throwing error: ${errorString}`);
          await db.close();
          throw new Error(error);
        }
      }

      this.logger.debug(`new subscriptions.length: ${subscriptions.length}`);
      const subscriptionsSerialized = JSON.stringify(subscriptions);
      // insert the value against key in the DB (it can be the scenario of a new key addition, or update to the value of an existing key)
      await db.insert(key, subscriptionsSerialized);
      await db.close();

      // TODO: register the event with fabric sdk
      this.logger.debug(
        `end addEventSubscription() .. requestId: ${query.requestId}`,
      );
      return query.requestId;
    } catch (error: any) {
      this.logger.error(
        `Error during addEventSubscription(): ${error.toString()}`,
      );
      await db?.close();
      throw new Error(error);
    }
  }

  deleteEventSubscription = async (
    eventMatcher: EventMatcher,
    requestId: string,
  ): Promise<EventSubscription> => {
    this.logger.info(
      `deleting from driver subscription of the eventMatcher: ${JSON.stringify(eventMatcher)} with requestId: ${requestId}`,
    );
    let subscriptions: Array<string>;
    const retVal: EventSubscription = create(EventSubscriptionSchema, {
      eventMatcher: eventMatcher,
    });
    let db: DBConnector | undefined;
    try {
      // Create connection to a database
      db = new LevelDBConnector(DB_NAME!);
      await db.open();

      const key: string = Buffer.from(
        toBinary(EventMatcherSchema, eventMatcher),
      ).toString("base64");
      try {
        // fetch the current values in the DB against the given key
        const subscriptionsSerialized: string = (await db.read(key)) as string;
        subscriptions = JSON.parse(subscriptionsSerialized);

        this.logger.debug(`subscriptions.length: ${subscriptions.length}`);
        let foundEntry: boolean = false;
        for (const subscriptionSerialized of subscriptions) {
          const subscription: Query = fromBinary(
            QuerySchema,
            Uint8Array.from(Buffer.from(subscriptionSerialized, "base64")),
          );
          if (subscription.requestId == requestId) {
            this.logger.debug(
              `deleting the subscription (with input requestId): ${JSON.stringify(subscription)}`,
            );
            subscriptions.splice(
              subscriptions.indexOf(subscriptionSerialized),
              1,
            );
            retVal.query = subscription;
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
        this.logger.error(`re-throwing error: ${error.toString()}`);
        await db.close();
        throw new Error(error);
      }

      this.logger.debug(`subscriptions.length: ${subscriptions.length}`);
      if (subscriptions.length == 0) {
        await db.delete(key);
      } else {
        const subscriptionsSerialized = JSON.stringify(subscriptions);
        await db.insert(key, subscriptionsSerialized);
      }

      await db.close();
      this.logger.debug(
        `end deleteEventSubscription() .. retVal: ${JSON.stringify(retVal)}`,
      );
      return retVal;
    } catch (error: any) {
      this.logger.error(`Error during delete: ${error.toString()}`);
      await db?.close();
      throw new Error(error);
    }
  };

  async lookupEventSubscriptions(
    eventMatcher: EventMatcher,
  ): Promise<Array<Query>> {
    this.logger.debug(
      `finding the subscriptions with eventMatcher: ${JSON.stringify(eventMatcher)}`,
    );
    let subscriptions: Array<string>;
    let returnSubscriptions: Array<Query> = new Array<Query>();
    let db: DBConnector | undefined;

    try {
      // Create connection to a database
      db = new LevelDBConnector(DB_NAME!);
      await db.open();

      for (const subscriptionsSerialized of await db.filteredRead(
        this.filterEventMatcher,
        eventMatcher,
      )) {
        subscriptions = JSON.parse(subscriptionsSerialized);
        for (const subscriptionSerialized of subscriptions) {
          const subscription: Query = fromBinary(
            QuerySchema,
            new Uint8Array(Buffer.from(subscriptionSerialized, "base64")),
          );
          this.logger.debug(`subscription: ${JSON.stringify(subscription)}`);
          returnSubscriptions.push(subscription);
        }
      }

      this.logger.info(
        `found ${returnSubscriptions.length} matching subscriptions`,
      );
      this.logger.debug(`end lookupEventSubscriptions()`);
      await db.close();
      return returnSubscriptions;
    } catch (error: any) {
      const errorString: string = error.toString();
      await db?.close();
      if (error instanceof DBKeyNotFoundError) {
        // case of read failing due to key not found
        returnSubscriptions = new Array<Query>();
        this.logger.info(
          `found ${returnSubscriptions.length} matching subscriptions`,
        );
        return returnSubscriptions;
      } else {
        // case of read failing due to some other issue
        this.logger.error(`Error during lookup: ${errorString}`);
        throw new Error(error);
      }
    }
  }

  async signEventSubscriptionQuery(inputQuery: Query): Promise<Query> {
    this.logger.info(
      `driver ready to provide sign on query: ${JSON.stringify(inputQuery)}`,
    );
    let signedQuery: Query;

    try {
      signedQuery = create(QuerySchema, {
        policy: inputQuery.policy,
        address: inputQuery.address,
        requestingRelay: inputQuery.requestingRelay,
        requestingNetwork: inputQuery.requestingNetwork,
        requestingOrg: inputQuery.requestingOrg,
        nonce: inputQuery.nonce,
        requestId: inputQuery.requestId,
        confidential: inputQuery.confidential,
        certificate: this.certificate.cert,
        requestorSignature: signMessage(
          inputQuery.address + inputQuery.nonce,
          this.certificate.key.toBytes(),
        ),
      });
      return signedQuery;
    } catch (error: any) {
      const errorString: string = `${error.toString()}`;
      this.logger.error(`signing query failed with error: ${errorString}`);
      throw new Error(error);
    }
  }

  async readAllEventMatchers(): Promise<Array<EventMatcher>> {
    const returnMatchers = [];
    let db: DBConnector;
    this.logger.debug(`start readAllEventMatchers()`);
    try {
      // Create connection to a database
      db = new LevelDBConnector(DB_NAME!);
      await db.open();
      const keys = await db.getAllKeys();
      for (const key of keys) {
        const eventMatcher = fromBinary(
          EventMatcherSchema,
          Uint8Array.from(Buffer.from(key, "base64")),
        );
        returnMatchers.push(eventMatcher);
      }
      this.logger.info(`found ${returnMatchers.length} eventMatchers`);
      this.logger.debug(`end readAllEventMatchers()`);
      await db.close();
      return returnMatchers;
    } catch (error: any) {
      const errorString: string = error.toString();
      await db!.close();
      // case of read failing due to some other issue
      this.logger.error(`Error during read: ${errorString}`);
      throw new Error(error);
    }
  }

  filterEventMatcher(
    keySerialized: string,
    eventMatcher: EventMatcher,
  ): boolean {
    const item: EventMatcher = fromBinary(
      EventMatcherSchema,
      new Uint8Array(Buffer.from(keySerialized, "base64")),
    );

    this.logger.debug(`eventMatcher from db: ${JSON.stringify(item)}`);
    if (
      (eventMatcher.eventClassId == "*" ||
        eventMatcher.eventClassId == item.eventClassId) &&
      (eventMatcher.transactionContractId == "*" ||
        eventMatcher.transactionContractId == item.transactionContractId) &&
      (eventMatcher.transactionLedgerId == "*" ||
        eventMatcher.transactionLedgerId == item.transactionLedgerId) &&
      (eventMatcher.transactionFunc == "*" ||
        eventMatcher.transactionFunc.toLowerCase() ==
          item.transactionFunc.toLowerCase())
    ) {
      return true;
    } else {
      return false;
    }
  }
}
