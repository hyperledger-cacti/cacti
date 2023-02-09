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
  name: 'subscribe',
  alias: ['-s'],
  description: 'Initiate event subscribe',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli event subscribe --network=<network1|network2> --user=user1 src/data/event_sub_sample.json`,
        'fabric-cli event subscribe --network=<network-name> --user=<user-id> <filename>',
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
                name: '--debug',
                description:
                    'Shows debug logs when running. Disabled by default. To enable --debug=true'
            }
        ],
        command,
        ['event', 'subscribe']
      )
      return
    }
    console.log("Event Subscription")
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
    if (!options['user']) {
        options['user'] = `user1`     //Default user
    }
    
    const networkName = options['network']
    const user = options['user']
    
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
    
    const data = JSON.parse(fs.readFileSync(filepath).toString())
    for (let i = 0 ; i < data.length ; i++) {
        const eventMatcher = EventsManager.createEventMatcher(data[i].event_matcher)
        const eventPublicationSpec = EventsManager.createEventPublicationSpec(data[i].event_publication_spec)

        try {
            const response = await EventsManager.subscribeRemoteEvent(
                contract,
                eventMatcher,
                eventPublicationSpec,
                networkName,
                netConfig.mspId,
                netConfig.relayEndpoint,
                { address: data[i].view_address, Sign: true },
                keyCert
            )

            if (response.getStatus() == EventSubscriptionState.STATUS.SUBSCRIBED) {
                console.log("Event Subscription Status Success with requestId:", response.getRequestId(), 'and event matcher:', JSON.stringify(eventMatcher.toObject()))
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
