/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp, handlePromise } from '../../helpers/helpers'
import logger from '../../helpers/logger'
import * as path from 'path'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import { MembershipManager } from '@hyperledger-labs/weaver-fabric-interop-sdk'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const command: GluegunCommand = {
  name: 'membership',
  description:
    'Configures network with the membership using iin agent',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli configure network --local-network=network1 --target-network=network2 --iin-agent-endpoint=localhost:9500',
        'fabric-cli configure network --local-network=<network1|network2 --target-network=<network1|network2>>',
        [
          {
            name: '--local-network',
            description: 'Local network for command. <network1|network2>'
          },
          {
            name: '--target-network',
            description: 'Target network for command. <network1|network2>'
          },
          {
            name: '--iin-agent-endpoint',
            description: 'End point for iin-agent. <hostname:port>'
          },
          {
            name: '--tls',
            description: 'Flag indicating whether or not the relay is TLS-enabled.'
          },
          {
            name: '--tls-ca-files',
            description: 'Colon-separated list of root CA certificate paths used to connect to the relay over TLS.'
          },
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          }
        ],
        command,
        ['configure']
      )
      return
    }
    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    if (!options['target-network']) {
      print.error('No target network specified.')
      return
    }
    if (!options['iin-agent-endpoint']) {
      print.error('No IIN Agent endpoint specified.')
      return
    }
    if (!options['iin-agent-endpoint'].includes(":")) {
      print.error('IIN Agent endpoint does not contain port number.')
      return
    }
    

    // Create wallet credentials
    const [response, error] = await handlePromise(MembershipManager.syncMembershipFromIINAgent(
        options['target-network'],
        options['iin-agent-endpoint'],
        options['tls'] === 'true',
        options['tls-ca-files']
    ))
    if (error) {
        console.error("Error:", error)
        process.exit(1)
    } else {
        console.log("Sync Request submitted succesfully.")
    }
    process.exit()
  }
}

module.exports = command
