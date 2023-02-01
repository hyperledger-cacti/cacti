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
        `fabric-cli env set-file <ENV_PATH>`,
        `fabric-cli env set-file path/to/env`,
        [],
        command,
        ['env', 'set-file']
      )
      return
    }
    if (array.length < 1 || array.length > 1) {
      print.error('Incorrect number of arguments')
      return
    }

    print.info('Reading .env file')
    const envPath = path.resolve(__dirname, '..', '..', '..', '.env')
    const newEnvPath = path.resolve(array[0])
    !fs.existsSync(envPath) && fs.writeFileSync(envPath, '', { flag: 'wx' })
    if (!fs.existsSync(newEnvPath)) {
      print.error('Env path provided does not exist')
      return
    }
    const file = fs.readFileSync(newEnvPath)
    fs.writeFileSync(envPath, file)
    print.info(`Updated File:\n${file}`)
  }
}

module.exports = command
