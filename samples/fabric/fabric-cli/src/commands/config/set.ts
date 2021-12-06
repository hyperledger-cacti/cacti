/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp, configKeys } from '../../helpers/helpers'
import * as fs from 'fs'
import * as path from 'path'

const command: GluegunCommand = {
  name: 'set',
  description: 'Set env variables for the fabric-cli',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli config set network1 relayEndpoint localhost:9080`,
        `fabric-cli config set <network1|network2> <${configKeys.join('|')}> <value>`,
        [],
        command,
        ['config', 'set']
      )
      return
    }
    if (array.length < 3 || array.length > 3) {
      print.error('Incorrect number of arguments')
      return
    }
    if (!configKeys.includes(array[1])) {
      print.error('Invalid config key')
      print.info(`Valid keys:  ${configKeys.join(', ')}`)
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
    print.info(`Config path: ${configPath}`)
    const file = JSON.parse(fs.readFileSync(configPath).toString())
    if (file[array[0]]) {
      file[array[0]][array[1]] = array[2]
    } else {
      file[array[0]] = {
        [array[0]]: {
          [array[1]]: array[2]
        }
      }
    }
    const outFile = JSON.stringify(file, null, 2)
    fs.writeFileSync(configPath, outFile)
    print.info(`Updated File:\n${outFile}`)
  }
}

module.exports = command
