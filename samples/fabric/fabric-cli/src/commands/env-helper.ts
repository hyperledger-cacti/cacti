/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp, validKeys } from '../helpers/helpers'
import * as fs from 'fs'
import * as path from 'path'

const command: GluegunCommand = {
  name: 'env',
  description: 'Interact with environment variables for the fabric-cli',
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
        ['env']
      )
      return
    }
    commandHelp(
      print,
      toolbox,
      `fabric-cli env set MEMBER_CREDENTIAL_FOLDER path/dlt-interoperability/fabric-testnet/organizations`,
      `fabric-cli env set <${validKeys.join('|')}> <value>`,
      [],
      command,
      ['env']
    )
    console.log('ENV FILE')
    const envPath = path.resolve(__dirname, '..', '..', '.env')
    !fs.existsSync(envPath) && fs.writeFileSync(envPath, '', { flag: 'wx' })
    const file = fs
      .readFileSync(envPath)
      .toString()
      .split('\n')
    console.log(file)
  }
}

module.exports = command
