/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp, validKeys } from '../../helpers/helpers'
import * as fs from 'fs'
import * as path from 'path'

const command: GluegunCommand = {
  name: 'get',
  description: 'get env variables for the fabric-cli',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli env get MEMBER_CREDENTIAL_FOLDER`,
        `fabric-cli env get <${validKeys.join('|')}>`,
        [],
        command,
        ['env', 'get']
      )
      return
    }
    if (array.length < 1 || array.length > 1) {
      print.error('Incorrect number of arguments')
      return
    }
    if (!validKeys.includes(array[0])) {
      print.error('Invalid env key')
      print.info(`Valid keys:  ${validKeys}`)
      return
    }

    print.info('Reading .env file')
    const envPath = path.resolve(__dirname, '..', '..', '..', '.env')
    !fs.existsSync(envPath) && fs.writeFileSync(envPath, '', { flag: 'wx' })
    const file = fs
      .readFileSync(envPath)
      .toString()
      .split('\n')
    file.forEach(row => {
      const [key, val] = row.split('=')
      if (key === array[0]) {
        console.log('Key: ', key, 'Value: ', val)
      }
    })
  }
}

module.exports = command
