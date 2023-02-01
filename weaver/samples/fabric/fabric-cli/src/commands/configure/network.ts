/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp } from '../../helpers/helpers'
import { getCredentialPath, enrollAndRecordWalletIdentity } from '../../helpers/fabric-functions'
import { configureNetwork } from '../../helpers/interop-setup/configure-network'
import logger from '../../helpers/logger'
import * as path from 'path'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const command: GluegunCommand = {
  name: 'network',
  description:
    'Configures network with the membership, verification policy and access control for remote networks',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli configure network --local-network=network1',
        'fabric-cli configure network --local-network=<network1|network2>',
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
          },
          {
             name: '--num-orgs',
             description:
              'Optional flag to indicate the number of orgs. Default = 1'
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
    let members = [global.__DEFAULT_MSPID__]
    if (options["num-orgs"] === 2){
      members = [global.__DEFAULT_MSPID__, global.__DEFAULT_MSPID_ORG2__]
    }

    // Create wallet credentials
    const credentialFolderPath = getCredentialPath()
    const networkNames = fs
      .readdirSync(credentialFolderPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .filter(item => item.name.startsWith('network'))    // HACK until we add IIN Agents for Corda networks
      .map(item => item.name)
    for (const networkName of networkNames) {
      print.info(`Creating network admin wallet identity for network: ${networkName}`)
      await enrollAndRecordWalletIdentity('networkadmin', null, networkName, true, false)   // Create a network admin
      if (options['iin-agent']===true) {
          print.info(`Creating IIN Agent wallet identity for network ${networkName}`)
          await enrollAndRecordWalletIdentity('iinagent', null, networkName, false, true)       // Create an IIN Agent
      }
    }

    await configureNetwork(options['local-network'], members, logger, options['iin-agent'])
    process.exit()
  }
}

module.exports = command
