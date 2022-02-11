/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp, getNetworkConfig, saveUserCertToFile } from '../../helpers/helpers'
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
        `fabric-cli user add --target-network=network1 --id=user --secret=userpw`,
        `fabric-cli user add --target-network=<network-name> --id=<id> --secret=<secret>`,
        [
          {
            name: '--target-network',
            description:
              'target-network network for command. <network1|network2>'
          },
          {
            name: '--id',
            description:
              'username to be added to the network'
          },
          {
            name: '--secret',
            description:
              'password for the username being added (Optional: random password is used)'
          }
        ],
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

    const userName = options['id']
    const userPwd = options['secret']
    const net = getNetworkConfig(options['target-network'])

    const ccpPath = path.resolve(__dirname, net.connProfilePath)
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'))
    console.log(net)

    let wallet = await walletSetup(options['target-network'],
                    ccp,
                    net.mspId,
                    userName,
                    userPwd,
                    true
                  )

    saveUserCertToFile(userName, options['target-network'])
    process.exit()
  }
}

module.exports = command
