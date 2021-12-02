/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import * as path from 'path'
import { commandHelp, pledgeAsset, getNetworkConfig } from '../../../helpers/helpers'
import { fabricHelper } from '../../../helpers/fabric-functions'

import logger from '../../../helpers/logger'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const delay = ms => new Promise(res => setTimeout(res, ms))

const command: GluegunCommand = {
  name: 'pledge',
  description:
    'Pledges asset in one asset network to another',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli asset transfer pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=3600 --type=bond --ref=a03 --data-file=src/data/assets.json\r\nfabric-cli asset transfer pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=3600 --type=token --owner=alice --units=50 --data-file=src/data/assets.json',
        'fabric-cli asset transfer pledge --source-network=<source-network-name> --dest-network=<dest-network-name> --recipient=<recipient-id> --expiry-secs=<expiry-in-seconds> --type=<bond|token> [--owner=<owner-id>] [--ref=<asset-id>] [--units=<number-of-units>] --data-file=<path-to-data-file>>',
        [
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          },
          {
            name: '--source-network',
            description:
              'Network where the asset is currently present. <network1|network2>'
          },
          {
            name: '--dest-network',
            description:
              'Network where the asset is to be transferred. <network1|network2>'
          },
          {
            name: '--recipient',
            description:
              'User (wallet) ID of asset recipient in the destination network'
          },
          {
            name: '--expiry-secs',
            description:
              'How long (in seconds) is the pledge valid for'
          },
          {
            name: '--type',
            description:
              'Type of network <bond|token>'
          },
          {
            name: '--owner',
            description:
              'Asset owner ID used as key in the asset data file'
          },
          {
            name: '--ref',
            description:
              'Asset ID used as key in the asset data file'
          },
          {
            name: '--units',
            description:
              'Number of units of fungible asset'
          },
          {
            name: '--data-file',
            description:
              'Path to data file which stores assets in json format'
          }
        ],
        command,
        ['asset', 'transfer', 'pledge']
      )
      return
    }

    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    if (!options['source-network'])
    {
      print.error('--source-network needs to be specified')
      return
    }
    if (!options['dest-network'])
    {
      print.error('--dest-network needs to be specified')
      return
    }
    if (!options['recipient'])
    {
      print.error('--recipient needs to be specified')
      return
    }
    if (!options['expiry-secs'])
    {
      print.error('--expiry-secs needs to be specified')
      return
    }
    if (!options['type'])
    {
      print.error('--type of network needs to be specified')
      return
    }
    if (options['type'] === 'bond' && !options['ref'])
    {
      print.error('--ref needs to be specified for "bond" type')
      return
    }
    if (options['type'] === 'token' && !options['owner'])
    {
      print.error('--owner needs to be specified for "token" type')
      return
    }
    if (options['type'] === 'token' && !options['units'])
    {
      print.error('--units needs to be specified for "token" type')
      return
    }
    if (options['units'] && isNaN(options['units']))
    {
      print.error('--units must be an integer')
      return
    }
    if (!options['data-file'])
    {
      print.error('--data-file needs to be specified')
      return
    }

    const netConfig = getNetworkConfig(options['source-network'])

    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
      print.error(
        `Please use a valid --source-network. No valid environment found for ${options['source-network']} `
      )
      return
    }

    const pledgeResult = await pledgeAsset({
      dataFilePath: options['data-file'],
      sourceNetworkName: options['source-network'],
      destNetworkName: options['dest-network'],
      recipient: options['recipient'],
      expirySecs: parseInt(options['expirySecs']),
      connProfilePath: netConfig.connProfilePath,
      mspId: netConfig.mspId,
      channelName: netConfig.channelName,
      contractName: netConfig.chaincode,
      ccType: options['type'],
      assetOwner: options['owner'],
      assetRef: options['ref'],
      assetUnits: parseInt(options['units']),
      logger: logger
    })
    if (pledgeResult) {
      console.log('Asset pledged with ID', pledgeResult)
    }
  }
}

module.exports = command
