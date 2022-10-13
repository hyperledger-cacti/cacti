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
  generateMembership,
  getCurrentNetworkCredentialPath
} from '../../../helpers/fabric-functions'

const command: GluegunCommand = {
  name: 'membership',
  description: 'Generates the membership for the local network',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli configure  --local-network=network1 membership',
        'fabric-cli configure  --local-network=<network1|network2> membership',
        [
          {
            name: '--local-network',
            description: 'Local network for command. <network1|network2>'
          },
          {
            name: '--iin-agent',
            description:
              'Optional flag to indicate if iin-agent is recording attested membership.'
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
    logger.info(`Generating membership for ${options['local-network']}`)
    await generateMembership(
      process.env.DEFAULT_CHANNEL ? process.env.DEFAULT_CHANNEL : 'mychannel',
      process.env.DEFAULT_CHAINCODE ? process.env.DEFAULT_CHAINCODE : 'interop',
      networkEnv.connProfilePath,
      options['local-network'],
      global.__DEFAULT_MSPID__,
      logger,
      options['iin-agent']
    )
    logger.info(
      `Generated ${
        options['local-network']
      } secuirty group at ${getCurrentNetworkCredentialPath(
        options['local-network']
      )} `
    )
    process.exit()
  }
}

module.exports = command
