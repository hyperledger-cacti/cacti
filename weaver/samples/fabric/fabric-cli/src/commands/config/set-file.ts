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
  name: 'set-file',
  description: 'Replace env file with contents from another env file',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli config set-file <CONFIG_PATH>`,
        `fabric-cli config set-file path/to/config.json`,
        [],
        command,
        ['config', 'set-file']
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
    const newConfigPath = path.resolve(array[0])
    !fs.existsSync(configPath) &&
      fs.writeFileSync(configPath, '', { flag: 'wx' })
    if (!fs.existsSync(newConfigPath)) {
      print.error('Config path provided does not exist')
      return
    }
    // TODO: Currently no sanitisation is done on this file.
    const file = fs.readFileSync(newConfigPath)
    fs.writeFileSync(configPath, file)
    print.info(`Updated File:\n${file}`)
  }
}

module.exports = command
