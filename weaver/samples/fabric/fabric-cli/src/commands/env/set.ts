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
        `fabric-cli env set MEMBER_CREDENTIAL_FOLDER path/dlt-interoperability/fabric-testnet/organizations`,
        `fabric-cli env set <${validKeys.join('|')}> <value>`,
        [],
        command,
        ['env', 'set']
      )
      return
    }
    if (array.length < 2 || array.length > 2) {
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
    let hasKey = false
    const updatedFileArray = file.map(row => {
      const [key, val] = row.split('=')
      if (key === array[0]) {
        hasKey = true
        return [key, array[1]].join('=')
      }
      if (key) {
        return [key, val].join('=')
      }
    })
    if (!hasKey) {
      updatedFileArray.push([array[0], array[1]].join('='))
      fs.writeFileSync(envPath, updatedFileArray.join('\n'))
      print.info(`Updated File:\n${updatedFileArray.join('\n')}`)
    } else {
      fs.writeFileSync(envPath, updatedFileArray.join('\n'))
      print.info(`Updated File:\n${updatedFileArray.join('\n')}`)
    }
  }
}

module.exports = command
