/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

const util = require('util');
const helper = require('./helper.js');

const logger = helper.getLogger('instantiate-chaincode');

const instantiateChaincode = async (
  peers,
  channelName,
  chaincodeName,
  chaincodeVersion,
  functionName,
  chaincodeType,
  args,
  username,
  orgName
) => {
  logger.debug(`\n\n============ Instantiate chaincode on channel ${channelName} ============\n`);
  let errorMessage = null;
  let client = null;
  let channel = null;
  try {
    // first setup the client for this org
    client = await helper.getClientForOrg(orgName, username);
    logger.debug('Successfully got the fabric client for the organization "%s"', orgName);
    channel = client.getChannel(channelName);
    if (!channel) {
      const message = util.format('Channel %s was not defined in the connection profile', channelName);
      logger.error(message);
      throw new Error(message);
    }
    const txId = client.newTransactionID(true); // Get an admin based transactionID
    // An admin based transactionID will
    // indicate that admin identity should
    // be used to sign the proposal request.
    // will need the transaction ID string for the event registration later
    const deployId = txId.getTransactionID();

    // send proposal to endorser
    const request = {
      targets: peers,
      chaincodeId: chaincodeName,
      chaincodeType,
      chaincodeVersion,
      args,
      txId,

      // Use this to demonstrate the following policy:
      // The policy can be fulfilled when members from both orgs signed.
      'endorsement-policy': {
        identities: [{ role: { name: 'member', mspId: 'Org1MSP' } }, { role: { name: 'member', mspId: 'Org2MSP' } }],
        policy: {
          '2-of': [{ 'signed-by': 0 }, { 'signed-by': 1 }],
        },
      },
    };

    if (functionName) request.fcn = functionName;

    // instantiate takes much longer
    const thirtyMinutesTimeout = 30 * 60 * 1000;
    const results = await channel.sendInstantiateProposal(request, thirtyMinutesTimeout);

    // the returned object has both the endorsement results
    // and the actual proposal, the proposal will be needed
    // later when we send a transaction to the orderer
    const [proposalOutcomes, proposal] = results;

    // look at the responses to see if they are all are good
    // response will also include signatures required to be committed
    let allGood = true;

    proposalOutcomes.forEach(outcome => {
      if (outcome instanceof Error) {
        allGood = false;
        errorMessage = util.format('instantiate proposal resulted in an error :: %s', outcome.toString());
        logger.error(errorMessage);
      } else if (outcome.response && outcome.response.status === 200) {
        logger.info('instantiate proposal was good');
      } else {
        allGood = false;
        errorMessage = util.format('instantiate proposal was bad for an unknown reason %j', outcome);
        logger.error(errorMessage);
      }
    });

    if (allGood) {
      logger.info(
        util.format(
          'Received ProposalResponse: Status - %s, message - "%s", metadata - "%s",  endorsement signature: %s',
          proposalOutcomes[0].response.status,
          proposalOutcomes[0].response.message,
          proposalOutcomes[0].response.payload,
          proposalOutcomes[0].endorsement.signature
        )
      );

      // wait for the channel-based event hub to tell us that the
      // instantiate transaction was committed on the peer
      const promises = [];
      const eventHubs = channel.getChannelEventHubsForOrg();
      logger.debug('found %s eventhubs for this organization %s', eventHubs.length, orgName);
      eventHubs.forEach(eh => {
        const instantiateEventPromise = new Promise((resolve, reject) => {
          logger.debug('instantiateEventPromise - setting up event');
          const eventTimeout = setTimeout(() => {
            const message = `REQUEST_TIMEOUT:${eh.getPeerAddr()}`;
            logger.error(message);
            eh.disconnect();
          }, 60000);
          eh.registerTxEvent(
            deployId,
            (tx, code, blockNum) => {
              logger.info('The chaincode instantiate transaction has been committed on peer %s', eh.getPeerAddr());
              logger.info('Transaction %s has status of %s in blocl %s', tx, code, blockNum);
              clearTimeout(eventTimeout);

              if (code !== 'VALID') {
                const message = util.format('The chaincode instantiate transaction was invalid, code:%s', code);
                logger.error(message);
                reject(new Error(message));
              } else {
                const message = 'The chaincode instantiate transaction was valid.';
                logger.info(message);
                resolve(message);
              }
            },
            err => {
              clearTimeout(eventTimeout);
              logger.error(err);
              reject(err);
            },
            // the default for 'unregister' is true for transaction listeners
            // so no real need to set here, however for 'disconnect'
            // the default is false as most event hubs are long running
            // in this use case we are using it only once
            { unregister: true, disconnect: true }
          );
          eh.connect();
        });
        promises.push(instantiateEventPromise);
      });

      const ordererRequest = {
        txId, // must include the transaction id so that the outbound
        // transaction to the orderer will be signed by the admin id
        // the same as the proposal above, notice that transactionID
        // generated above was based on the admin id not the current
        // user assigned to the 'client' instance.
        proposalResponses: proposalOutcomes,
        proposal,
      };
      const sendPromise = channel.sendTransaction(ordererRequest);
      // put the send to the orderer last so that the events get registered and
      // are ready for the orderering and committing
      promises.push(sendPromise);
      const results = await Promise.all(promises);
      logger.debug(util.format('------->>> R E S P O N S E : %j', results));
      const response = results.pop(); //  orderer results are last in the results
      if (response.status === 'SUCCESS') {
        logger.info('Successfully sent transaction to the orderer.');
      } else {
        errorMessage = util.format('Failed to order the transaction. Error code: %s', response.status);
        logger.debug(errorMessage);
      }

      // now see what each of the event hubs reported
      for (const i in results) {
        const event_hub_result = results[i];
        const event_hub = eventHubs[i];
        logger.debug('Event results for event hub :%s', event_hub.getPeerAddr());
        if (typeof event_hub_result === 'string') {
          logger.debug(event_hub_result);
        } else {
          if (!errorMessage) errorMessage = event_hub_result.toString();
          logger.debug(event_hub_result.toString());
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to send instantiate due to error: ${error.stack}` ? error.stack : error);
    errorMessage = error.toString();
  } finally {
    if (channel) {
      channel.close();
    }
  }

  let success = true;
  let message = util.format(
    "Successfully instantiate chaincode in organization %s to the channel '%s'",
    orgName,
    channelName
  );
  if (errorMessage) {
    message = util.format('Failed to instantiate the chaincode. cause:%s', errorMessage);
    success = false;
    logger.error(message);
  } else {
    logger.info(message);
  }

  // build a response to send back to the REST caller
  const response = {
    success,
    message,
  };
  return response;
};
exports.instantiateChaincode = instantiateChaincode;
