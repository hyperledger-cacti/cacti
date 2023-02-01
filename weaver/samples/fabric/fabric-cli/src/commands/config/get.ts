/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp } from '../../helpers/helpers'
import * as fs from 'fs'
import * as path from 'path'

const command: GluegunCommand = {
  name: 'get',
  description: 'Get specific network configuration from the config.',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli config get network1`,
        `fabric-cli config get <network-id>`,
        [],
        command,
        ['config', 'get']
      )
      return
    }
    if (array.length < 1 || array.length > 1) {
      print.error('Incorrect number of arguments')
      return
    }

    print.info('Reading config.json file')
    const configPath = path.resolve(
      process.env.CONFIG_PATH ? process.env.CONFIG_PATH : path.join(
        __dirname,
        '..',
        '..',
        '..',
        'config.json'
      )
    )
    !fs.existsSync(configPath) &&
      fs.writeFileSync(configPath, '', { flag: 'wx' })
    const file = JSON.parse(fs.readFileSync(configPath).toString())
    if (file[array[0]]) {
      console.log('Key: ', array[0], 'Value: ', file[array[0]])
    }
  }
}

module.exports = command
