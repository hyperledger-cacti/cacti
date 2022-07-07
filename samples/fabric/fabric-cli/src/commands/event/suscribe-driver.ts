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
  alias: ['-sd'],
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
        `fabric-cli event subscribe --network=<network1|network2> --user=user1 --driver src/data/event_sub_sample.json`,
        'fabric-cli event subscribe --network=<network-name> --user=<user-id> --driver <filename>',
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
                name: '--driver',
                description:
                    'Flag to indicate subscribing on behalf of driver'
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
    if (!options['user']) {
        options['user'] = `user1`     //Default user
    }
    
    const networkName = options['network']
    const user = options['user']
    
    const filepath = path.resolve(array[0])
    const data = JSON.parse(fs.readFileSync(filepath).toString())
    
    if (options['driver']) {
        const walletPath = process.env.WALLET_PATH
          ? process.env.WALLET_PATH
          : path.join(__dirname, '../../', `wallet-${networkName}`)
        const relayIdTargetPath = path.join(walletPath, 'relay.id')
        if (!fs.existsSync(relayIdTargetPath)) {
            const relayIdSrcPath = path.join(__dirname, '../../../../../../', 'core/drivers/fabric-driver/', `wallet-${networkName}`, 'relay.id')
            fs.copyFile(relayIdSrcPath, relayIdTargetPath, (err) => {
                if (err) throw err;
                console.log('Relay id copied from fabric-driver directory');
            });
        }
    }
    
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
    let cert = keyCert.cert
    if (options['driver']) {
        const [driverKeyCert, driverKeyCertError] = await handlePromise(
          getKeyAndCertForRemoteRequestbyUserName(wallet, 'relay')
        )
        if (driverKeyCertError) {
          throw new Error(`Error getting key and cert ${driverKeyCertError}`)
        }
        cert = driverKeyCert.cert
    }
    
    const eventMatcher = EventsManager.createEventMatcher(data.event_matcher)
    const eventPublicationSpec = EventsManager.createEventPublicationSpec(data.event_publication_spec)
    
    try {
        const response = await EventsManager.subscribeRemoteEvent(
            contract,
            eventMatcher,
            eventPublicationSpec,
            networkName,
            netConfig.mspId,
            netConfig.relayEndpoint,
            { address: data.view_address, Sign: true },
            { key: keyCert.key, cert: cert }
        )
        
        if (response.getStatus() == EventSubscriptionState.STATUS.SUCCESS) {
            console.log("Event Subscription Status Success with requestId:", response.getRequestId())
        } else {
            console.log("Unknown error")
        }
    } catch(e) {
        console.log("Error: ", e.toString())
    }

    process.exit()
  }
}


module.exports = command
