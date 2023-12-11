/**
 * Functions used for connecting aries agents together.
 */

import * as log from "loglevel";
import {
  Agent,
  ConnectionEventTypes,
  ConnectionStateChangedEvent,
  DidExchangeState,
  OutOfBandRecord,
  ConnectionRecord,
} from "@aries-framework/core";

// Constants
const WAIT_FOR_CLIENT_ACCEPT_TIMEOUT = 60 * 1000;
const WAIT_FOR_CONNECTION_READY_POLL_INTERVAL = 500;

/**
 * Create connection invitation from an `agent`.
 *
 * @param agent Aries agent
 *
 * @returns invitationUrl and outOfBandRecord
 */
export async function createNewConnectionInvitation(agent: Agent): Promise<{
  invitationUrl: string;
  outOfBandRecord: OutOfBandRecord;
}> {
  const outOfBandRecord = await agent.oob.createInvitation();

  return {
    invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({
      domain: "https://example.org",
    }),
    outOfBandRecord,
  };
}

/**
 * Accept connection invitation using it's URL.
 *
 * @param agent Aries agent
 * @param invitationUrl connection invitation
 *
 * @returns `OutOfBandRecord`
 */
export async function acceptInvitation(
  agent: Agent,
  invitationUrl: string,
): Promise<OutOfBandRecord> {
  const { outOfBandRecord } =
    await agent.oob.receiveInvitationFromUrl(invitationUrl);

  return outOfBandRecord;
}

/**
 * Wait until connection invite is accepted and connection is established.
 * This functions comes from AFJ repository.
 *
 * @param agent Aries agent
 * @param outOfBandId connection outOfBandId to wait for
 * @returns new `ConnectionRecord`
 */
export async function waitForConnection(
  agent: Agent,
  outOfBandId: string,
): Promise<ConnectionRecord> {
  if (!outOfBandId) {
    throw new Error("Missing outOfBandId in waitForConnection");
  }

  const getConnectionRecord = (outOfBandId: string) =>
    new Promise<ConnectionRecord>((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error("Missing connection")),
        WAIT_FOR_CLIENT_ACCEPT_TIMEOUT,
      );

      // Start listener
      agent.events.on<ConnectionStateChangedEvent>(
        ConnectionEventTypes.ConnectionStateChanged,
        (e) => {
          if (e.payload.connectionRecord.outOfBandId !== outOfBandId) return;
          log.debug(
            "waitForConnection() - received ConnectionStateChanged event for given outOfBandId",
          );
          clearTimeout(timeoutId);
          resolve(e.payload.connectionRecord);
        },
      );

      // Also retrieve the connection record by invitation if the event has already fired
      void agent.connections
        .findAllByOutOfBandId(outOfBandId)
        .then(([connectionRecord]) => {
          if (connectionRecord) {
            clearTimeout(timeoutId);
            resolve(connectionRecord);
          }
        });
    });

  const connectionRecord = await getConnectionRecord(outOfBandId);

  return agent.connections.returnWhenIsConnected(connectionRecord.id);
}

/**
 * Search for already established connection with agent by it's label.
 * @warn don't trust the label, use this method only for development.
 *
 * @param agent Aries agent
 * @param peerAgentLabel Aries agent label we already conencted to
 *
 * @returns `ConnectionRecord` or undefined if connection is missing
 */
export async function getConnectionWithPeerAgent(
  agent: Agent,
  peerAgentLabel: string,
): Promise<ConnectionRecord | undefined> {
  const completedConnections = await agent.connections.findAllByQuery({
    state: DidExchangeState.Completed,
  });
  log.debug(
    `getConnectionWithPeerAgent() - found ${completedConnections.length} completed connections`,
  );

  return completedConnections
    .filter((cr) => {
      return cr.theirLabel && cr.theirLabel === peerAgentLabel;
    })
    .pop();
}

/**
 * Connect two agents to each other.
 *
 * @param firstAgent Aries agent
 * @param secondAgent Aries agent
 * @returns [firstAgentConnectionRecord, secondAgentConnectionRecord]
 */
export async function connectAgents(
  firstAgent: Agent,
  secondAgent: Agent,
): Promise<ConnectionRecord[]> {
  log.info(
    `Connecting ${firstAgent.config.label} to ${secondAgent.config.label}...`,
  );

  let firstAgentConnectionRecord = await getConnectionWithPeerAgent(
    firstAgent,
    secondAgent.config.label,
  );
  let secondAgentConnectionRecord = await getConnectionWithPeerAgent(
    secondAgent,
    firstAgent.config.label,
  );

  if (firstAgentConnectionRecord && secondAgentConnectionRecord) {
    log.info("Agents already connected, using previous connection records...");
    return [firstAgentConnectionRecord, secondAgentConnectionRecord];
  }

  // Create an invitation from the firstAgent
  const { outOfBandRecord: firstAgentOOBRecord, invitationUrl } =
    await createNewConnectionInvitation(firstAgent);
  const isConnectedPromise = waitForConnection(
    firstAgent,
    firstAgentOOBRecord.id,
  );

  // Accept invitation as the secondAgent
  const secondAgentOOBRecord = await acceptInvitation(
    secondAgent,
    invitationUrl,
  );

  // Wait until connection is done
  await isConnectedPromise;

  // Get newly created connection records
  firstAgentConnectionRecord = (
    await firstAgent.connections.findAllByOutOfBandId(firstAgentOOBRecord.id)
  ).pop();
  secondAgentConnectionRecord = (
    await secondAgent.connections.findAllByOutOfBandId(secondAgentOOBRecord.id)
  ).pop();

  if (firstAgentConnectionRecord && secondAgentConnectionRecord) {
    log.info("Agents connected!");
    return [firstAgentConnectionRecord, secondAgentConnectionRecord];
  }

  throw new Error("Could not connect the agents!");
}

/**
 * Block until given connection is operational.
 *
 * @param agent Aries agent
 * @param outOfBandId connection outOfBandId
 * @param timeout operation timeout (will throw exception if timeout exceeded)
 */
export async function waitForConnectionReadyV1(
  agent: Agent,
  outOfBandId: string,
  timeout = WAIT_FOR_CLIENT_ACCEPT_TIMEOUT,
): Promise<void> {
  let connection: ConnectionRecord | undefined;
  let counter = Math.ceil(timeout / WAIT_FOR_CONNECTION_READY_POLL_INTERVAL);

  do {
    counter--;
    await new Promise((resolve) =>
      setTimeout(resolve, WAIT_FOR_CONNECTION_READY_POLL_INTERVAL),
    );

    connection = (
      await agent.connections.findAllByOutOfBandId(outOfBandId)
    ).pop();
  } while (counter > 0 && (!connection || !connection.isReady));

  if (counter <= 0) {
    throw new Error("waitForConnectionReadyV1() timeout reached!");
  }
}
