/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp } from '../helpers/helpers'
const command: GluegunCommand = {
  name: 'configure',
  description: 'Commands to configure the fabric network',
  run: async toolbox => {
    const { print } = toolbox
    print.info(
      `Command performs nothing by itelf, please refer to sub-commands and options.\n`
    )
    commandHelp(print, toolbox, '', '', [], command, ['configure'])
  }
}

module.exports = command

// fabric-cli configure --source --remote-type:corda --phase:init-interop,init-app,init-relay|all
// fabric-cli configure --destination --remote-type:corda
// fabric-cli configure --source --remote-type:fabric
// fabric-cli configure --destination --remote-type:corda
// fabric-cli script --path:/path-to-command-file.txt
// # content of command file: command line
// configure --source --remote-type:corda --phase:init-interop,init-app,init-relay|all
