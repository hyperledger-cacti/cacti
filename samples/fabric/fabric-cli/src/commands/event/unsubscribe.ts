/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { fabricHelper, getKeyAndCertForRemoteRequestbyUserName } from '../../helpers/fabric-functions'
import logger from '../../helpers/logger'
import { Utils, ICryptoKey } from 'fabric-common'
import { commandHelp, getNetworkConfig, handlePromise } from '../../helpers/helpers'
import { EventsManager } from '@hyperledger-labs/weaver-fabric-interop-sdk'
import { EventSubscriptionState, EventType } from "@hyperledger-labs/weaver-protos-js/common/events_pb";
import * as fs from 'fs'
import * as path from 'path'

const command: GluegunCommand = {
  name: 'unsubscribe',
  alias: ['-u'],
  description: 'Initiate event unsubscribe',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli event unsubscribe --network=<network1|network2> --user=user1 --request-ids="abc123:efg456" src/data/event_sub_sample.json`,
        'fabric-cli event unsubscribe --network=<network-name> --user=<user-id> --request-ids=<colon-separated-list-of-request-ids> <filename>',
        [
            {
                name: '--network',
                description:
                    'Local network for command. <network1|network2>'
            },
            {
                name: '--user',
                description:
                    'User for subscription. Default: user1'
            },
            {
                name: '--request-ids',
                description:
                    'Colon-separated list of request IDs received during subscriptions. A request ID can be left blank, indicating that the corresponding JSON (i.e., at the same index) in the file should not be unsubscribed'
            },
            {
                name: '--debug',
                description:
                    'Shows debug logs when running. Disabled by default. To enable --debug=true'
            }
        ],
        command,
        ['event', 'unsubscribe']
      )
      return
    }
    console.log("Event Unsubscription")
    if (options.debug === 'true') {
        logger.level = 'debug'
        logger.debug('Debugging is enabled')
    }
    if (array.length != 1) {
        print.error('Not enough arguments supplied')
        return
    }
    if (!options['network'])
    {
      print.error('--network needs to be specified')
      return
    }
    if (!options['request-ids'])
    {
      print.error('--request-ids needs to be specified')
      return
    }
    if (!options['user']) {
        options['user'] = `user1`     //Default user
    }
    
    const networkName = options['network']
    const user = options['user']
    const requestIds = options['request-ids']
    
    const filepath = path.resolve(array[0])
    
    const netConfig = getNetworkConfig(networkName)
    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
        throw new Error(`No valid config entry found for ${networkName}`)
    }
    
    const { gateway, wallet, contract } = await fabricHelper({
        channel: netConfig.channelName,
        contractName: process.env.DEFAULT_CHAINCODE ? process.env.DEFAULT_CHAINCODE : 'interop',
        connProfilePath: netConfig.connProfilePath,
        networkName,
        mspId: netConfig.mspId,
        logger,
        discoveryEnabled: true,
        userString: user
    })
    
    const [keyCert, keyCertError] = await handlePromise(
      getKeyAndCertForRemoteRequestbyUserName(wallet, user)
    )
    if (keyCertError) {
      throw new Error(`Error getting key and cert ${keyCertError}`)
    }

    const requestIdList = requestIds.split(':')
    const data = JSON.parse(fs.readFileSync(filepath).toString())
    if (requestIdList.length !== data.length) {
      throw new Error(`Mismatching request ID list and subscription JSON counts. #Request IDs = ${requestIdList.length}, #JSON items = ${data.length}.`)
    }
    for (let i = 0 ; i < data.length ; i++) {
        if (requestIdList[i] === '') {
            // Don't unsubscribe
            continue;
        }

        // Unsubscribe
        const eventMatcher = EventsManager.createEventMatcher(data[i].event_matcher)
        const eventPublicationSpec = EventsManager.createEventPublicationSpec(data[i].event_publication_spec)

        try {
            const response = await EventsManager.unsubscribeRemoteEvent(
                contract,
                eventMatcher,
                eventPublicationSpec,
                requestIdList[i],
                networkName,
                netConfig.mspId,
                netConfig.relayEndpoint,
                { address: data[i].view_address, Sign: true },
                keyCert
            )

            if (response.getStatus() == EventSubscriptionState.STATUS.UNSUBSCRIBED) {
                console.log("Event Unsubscription Success for requestId:", response.getRequestId(), 'and event matcher:', JSON.stringify(eventMatcher.toObject()))
            } else {
                console.log("Unknown error")
            }
        } catch(e) {
            console.log("Error: ", e.toString())
        }
    }

    process.exit()
  }
}


module.exports = command
