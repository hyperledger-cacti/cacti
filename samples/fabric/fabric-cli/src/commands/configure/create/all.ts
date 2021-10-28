/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp, getNetworkConfig } from '../../../helpers/helpers'
import logger from '../../../helpers/logger'
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import {
  generateAccessControl,
  getCurrentNetworkCredentialPath,
  generateVerificationPolicy,
  generateMembership
} from '../../../helpers/fabric-functions'

const command: GluegunCommand = {
  name: 'all',
  description: 'Generates the access-control, membership, and verification-policy for the local network',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli configure create all --local-network=network1',
        'fabric-cli configure create all --local-network=<network1|network2>',
        [
          {
            name: '--local-network',
            description: 'Local network for command. <network1|network2>'
          },
          {
            name: '--user',
            description: 'User for interop.'
          },
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          }
        ],
        command,
        ['configure', 'create']
      )
      return
    }
    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    const networkEnv = getNetworkConfig(options['local-network'])
    logger.debug(`NetworkEnv: ${JSON.stringify(networkEnv)}`)
    if (!networkEnv.relayEndpoint || !networkEnv.connProfilePath) {
      print.error(
        'Please use a valid --local-network. If valid network please check if your environment variables are configured properly'
      )
      return
    }

    // Membership
    logger.info(`Generating membership for ${options['local-network']}`)
    await generateMembership(
      process.env.DEFAULT_CHANNEL ? process.env.DEFAULT_CHANNEL : 'mychannel',
      process.env.DEFAULT_CHAINCODE ? process.env.DEFAULT_CHAINCODE : 'interop',
      networkEnv.connProfilePath,
      options['local-network']
    )
    logger.info(
      `Generated ${
        options['local-network']
      } secuirty group at ${getCurrentNetworkCredentialPath(
        options['local-network']
      )} `
    )

    // Access Control
    logger.info(
      `Generating ${options['local-network']} network with access control`
    )
    const username =
      options.username || `user1`

    const appccid = process.env.DEFAULT_APPLICATION_CHAINCODE ? process.env.DEFAULT_APPLICATION_CHAINCODE : 'simplestate'
    let templatePath = path.resolve(
          __dirname,
          '../../../data/interop/' + appccid + '/accessControlTemplate_' + networkEnv.aclPolicyPrincipalType + '.json'
        )
    logger.info(`Template path: ${templatePath}`)
    await generateAccessControl(
      process.env.DEFAULT_CHANNEL ? process.env.DEFAULT_CHANNEL : 'mychannel',
      process.env.DEFAULT_CHAINCODE ? process.env.DEFAULT_CHAINCODE : 'interop',
      networkEnv.connProfilePath,
      options['local-network'],
      templatePath,
      username,
      global.__DEFAULT_MSPID__,
      logger
    )
    logger.info(
      `Generated ${
        options['local-network']
      } access control at  ${getCurrentNetworkCredentialPath(
        options['local-network']
      )} `
    )

    // Verification Policy
    logger.info(
      `Generating ${options['local-network']} network with verification policy`
    )
    templatePath = path.resolve(
          __dirname,
          '../../../data/interop/' + appccid + '/verificationPolicyTemplate.json'
        )
    logger.info(`Template path: ${templatePath}`)
    await generateVerificationPolicy(
      process.env.DEFAULT_CHANNEL ? process.env.DEFAULT_CHANNEL : 'mychannel',
      process.env.DEFAULT_CHAINCODE ? process.env.DEFAULT_CHAINCODE : 'interop',
      networkEnv.connProfilePath,
      options['local-network'],
      templatePath,
      global.__DEFAULT_MSPID__,
      logger
    )
    logger.info(
      `Generated ${
        options['local-network']
      } verification policy at ${getCurrentNetworkCredentialPath(
        options['local-network']
      )} `
    )
    process.exit()
  }
}

module.exports = command
