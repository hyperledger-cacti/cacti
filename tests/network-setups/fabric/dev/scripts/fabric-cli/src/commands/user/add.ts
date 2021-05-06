/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp, getNetworkConfig } from '../../helpers/helpers'
import * as fs from 'fs'
import * as path from 'path'
import { walletSetup } from '../../helpers/fabric-functions'

const command: GluegunCommand = {
  name: 'add',
  description: 'Register and enroll user to the fabric network',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli add user --target-network=network1--id=user --secret=userpw`,
        `fabric-cli add user --target-network=<network-name> --id=<id> --secret=<secret>`,
        [],
        command,
        ['user', 'add']
      )
      return
    }
    if (!options['target-network']) {
      print.error('--target-network is required arguement, please specify the network name here')
    }
    if (!options['id']) {
      print.error('--id is required arguement, please specify the username here')
    }
    // if (!options['secret']) {
    //   print.error('--secret is required arguement, please specify the password for the user here')
    // }

    const userName = options['id']
    const userPwd = options['secret']
    const net = getNetworkConfig(options['target-network'])

    const ccpPath = path.resolve(__dirname, net.connProfilePath)
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'))
    console.log(net)

    let wallet = walletSetup(options['target-network'],
                    ccp,
                    net.mspId,
                    userName,
                    userPwd
                  )
  }
}

module.exports = command
