/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp, configKeys } from '../helpers/helpers'
import * as fs from 'fs'
import * as path from 'path'

const command: GluegunCommand = {
  name: 'config',
  description:
    'Interact with config file for the fabric-cli. The config file is used to store network information',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli config set network1 connProfilePath path/dlt-interoperability/fabric-testnet/organizations`,
        `fabric-cli config set <network-id> <${configKeys.join('|')}> <value>`,
        [],
        command,
        ['config']
      )
      return
    }
    commandHelp(
      print,
      toolbox,
      `fabric-cli config set network1 connProfilePath path/dlt-interoperability/fabric-testnet/organizations`,
      `fabric-cli config set <network-id> <${configKeys.join('|')}> <value>`,
      [],
      command,
      ['config']
    )
    console.log('CONFIG FILE')
    const configPath = path.resolve(__dirname, '..', '..', 'config.json')
    !fs.existsSync(configPath) &&
      fs.writeFileSync(configPath, '', { flag: 'wx' })
    const file = fs.readFileSync(configPath).toString()
    console.log(file)
  }
}

module.exports = command
