/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import * as path from 'path'
import { commandHelp, addData, getNetworkConfig } from '../../helpers/helpers'
import {
  generateMembership,
  generateAccessControl,
  generateVerificationPolicy
} from '../../helpers/fabric-functions'

import { configureNetwork } from '../../helpers/interop-setup/configure-network'
import logger from '../../helpers/logger'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const delay = ms => new Promise(res => setTimeout(res, ms))

const command: GluegunCommand = {
  name: 'all',
  description:
    'Populates network with data, generates network config and loads interop chaincode',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli configure all network1 network2 ',
        'fabric-cli configure all (space seperated network names matching config file)',
        [
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          }
        ],
        command,
        ['configure', 'all']
      )
      return
    }

    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    // for each network it
    // 1. Generate network configs (membership, access control and verification policy)
    // 2. Add default data
    // 3. Loads configs from other networks in the credentials folder
    for (const network of array) {
      // GET NETWORK-CONFIGS
      const { connProfilePath, username: currusername, aclPolicyPrincipalType } = getNetworkConfig(
        network
      )
      if (!connProfilePath) {
        print.error(
          `Please use a valid network. No valid environment found for ${network} `
        )
        return
      }
      const username = currusername || `user1`
      print.info(`Generating membership for network: ${network}`)
      // 1. Generate network configs (membership, access control and verification policy)
      await generateMembership(
        process.env.DEFAULT_CHANNEL ? process.env.DEFAULT_CHANNEL : 'mychannel',
        process.env.DEFAULT_CHAINCODE
          ? process.env.DEFAULT_CHAINCODE
          : 'interop',
        connProfilePath,
        network,
        global.__DEFAULT_MSPID__,
        logger
      )
      const appccid = process.env.DEFAULT_APPLICATION_CHAINCODE ? process.env.DEFAULT_APPLICATION_CHAINCODE : 'simplestate'
      await generateAccessControl(
        process.env.DEFAULT_CHANNEL ? process.env.DEFAULT_CHANNEL : 'mychannel',
        process.env.DEFAULT_CHAINCODE
          ? process.env.DEFAULT_CHAINCODE
          : 'interop',
        connProfilePath,
        network,
        path.resolve(
          __dirname,
          '../../data/interop/' + appccid + '/accessControlTemplate_' + aclPolicyPrincipalType + '.json'
        ),
        username,
        global.__DEFAULT_MSPID__,
        logger
      )
      await generateVerificationPolicy(
        process.env.DEFAULT_CHANNEL ? process.env.DEFAULT_CHANNEL : 'mychannel',
        process.env.DEFAULT_CHAINCODE
          ? process.env.DEFAULT_CHAINCODE
          : 'interop',
        connProfilePath,
        network,
        path.resolve(
          __dirname,
          '../../data/interop/' + appccid + '/verificationPolicyTemplate.json'
        ),
        global.__DEFAULT_MSPID__,
        logger
      )
    }
    print.info('Generated Network maps for networks')
    // 2. Add default data
    for (const network of array) {
      // ADD DATA
      const connProfilePath = getNetworkConfig(network).connProfilePath
      if (!connProfilePath) {
        print.error(
          `Please use a valid --local-network. No valid environment found for ${network} `
        )
        return
      }
      print.info(`Populating ${network} chaincode with data`)
      if (network !== 'network2') {
        addData({
          filename: 'stars.json',
          connProfilePath,
          networkName: network,
          logger
        })
      }
      await delay(3000)
      if (network !== 'network1') {
        addData({
          filename: 'starSize.json',
          connProfilePath,
          networkName: network,
          logger
        })
      }
      await delay(5000)
      // 3. Loads configs from other networks in the credentials folder
      // LOAD-CHAINCODE
      print.info(`Loading chaincode for network: ${network} ${connProfilePath}`)
      const spinner = toolbox.print.spin(
        `Loading Chaincode for network: ${network}`
      )
      if (options.debug === 'true') {
        spinner.stop()
      }
      try {
        await configureNetwork(network, logger)
        spinner.succeed(`Loaded Chaincode for network: ${network}`)
      } catch (err) {
        spinner.fail('Loading Chaincode failed')
        print.error(`Error: ${JSON.stringify(err)}`)
      }
    }
    print.info(`Finished configuring networks: ${JSON.stringify(array)}`)
    process.exit()
  }
}

module.exports = command
