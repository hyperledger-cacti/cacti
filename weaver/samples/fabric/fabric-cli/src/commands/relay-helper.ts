/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp } from '../helpers/helpers'
const command: GluegunCommand = {
  name: 'relay',
  description: '(DEV) Operate on local relay: send|get|poll',
  run: async toolbox => {
    const { print } = toolbox
    print.info('Making Relay Call using gRPC calls.')
    commandHelp(
      print,
      toolbox,
      `fabric-cli relay send|get|poll`,
      '',
      [],
      command,
      ['relay']
    )
  }
}

module.exports = command
