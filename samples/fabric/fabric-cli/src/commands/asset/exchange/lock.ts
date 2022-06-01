/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { fabricHelper } from '../../../helpers/fabric-functions'
import logger from '../../../helpers/logger'
import { commandHelp, getNetworkConfig, handlePromise } from '../../../helpers/helpers'
import { AssetManager, HashFunctions } from '@hyperledger-labs/weaver-fabric-interop-sdk'

const command: GluegunCommand = {
  name: 'lock',
  alias: ['-l'],
  description: 'Asset Lock for HTLC.',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli asset exchange lock --target-network=network1 --hashBase64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs= --timeout-duration=100 --locker=bob --recipient=alice --param=Type1:a04`,
        'fabric-cli asset exchange lock --fungible --target-network=<network1|network2> --hash_fn=<hash-function-name> --hashBase64=<hashvalue-in-base64> --timeout-epoch=<timeout-epoch> --timeout-duration=<timeout-duration> --locker=<locker-userid> --recipient=<recipient-userid> --param=<param>',
        [
          {
            name: '--fungible',
            description:
              'Flag to indicate fungible asset or non-fungible.'
          },
          {
            name: '--target-network',
            description:
              'Target network for command. <network1|network2>'
          },
          {
            name: '--hash_fn',
            description:
              'hash function to be used for HTLC. Supported: SHA256, SHA512. (Optional: Default: SHA256)'
          },
          {
            name: '--hashBase64',
            description:
              'Serialized Hash value in base64 to be used for HTLC. (use only one of secret or hash, do not use both options)'
          },
          {
            name: '--timeout-epoch',
            description:
              'Timeout in epoch in seconds. Use only one of the timeout options.'
          },
          {
            name: '--timeout-duration',
            description:
              'Timeout duration in seconds. Use only one of the timeout options.'
          },
          {
            name: '--locker',
            description:
              'Locker User Id: Must be already registered in target-network'
          },
          {
            name: '--recipient',
            description:
              'Recipient User Id: Must be already registered in target-network'
          },
          {
            name: '--param',
            description:
              'Param: AssetType:AssetId for Non-Fungible Assets \nFungibleAssetType:NumUnits for Fungible Assets'
          },
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          }
        ],
        command,
        ['asset', 'exchange', 'lock']
      )
      return
    }
    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    if (!options['target-network'])
    {
      print.error('--target-network needs to specified')
      return
    }
    if (!options['locker'] || !options['recipient'])
    {
      print.error('Locker and Recipient both needs to be specified')
      return
    }
    if (!options['param'] || options['param'].split(':').length!=2) {
      var param2Msg = 'id'
      if(options['fungible']) {
          param2Msg = 'quantity'
      }
      print.error(`Required asset type and ${param2Msg} in --param separated by colon`)
      return
    }

    // Locker and Recipient
    const locker = options['locker']
    const recipient = options['recipient']

    // Hash
    let hash: HashFunctions.Hash
    if(options['hash_fn'] == 'SHA512') {
        hash = new HashFunctions.SHA512()
    } else {
        hash = new HashFunctions.SHA256()
    }
    
    if (options['hashBase64'])
    {
        hash.setSerializedHashBase64(options['hashBase64'])
    }
    else {
        print.info(`No hash provided, using random preimage`)
    }

    // Timeout
    var timeout=0, timeout2=0;
    const currTime = Math.floor(Date.now()/1000);
    if (options['timeout-epoch']) {
      let duration = options['timeout-epoch'] - currTime
      timeout = options['timeout-epoch']
      timeout2 = options['timeout-epoch'] + duration
    }
    else if (options['timeout-duration']) {
      timeout=currTime + options['timeout-duration']
      timeout2=currTime + 2 * options['timeout-duration']
    }

    const params = options['param'].split(':')

    const netConfig = getNetworkConfig(options['target-network'])
    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
      print.error(
        `Please use a valid --target-network. No valid environment found for ${options['target-network']} `
      )
      return
    }

    const network = await fabricHelper({
      channel: netConfig.channelName,
      contractName: netConfig.chaincode,
      connProfilePath: netConfig.connProfilePath,
      networkName: options['target-network'],
      mspId: netConfig.mspId,
      userString: locker
    })

    const lockerId = await network.wallet.get(locker)
    const lockerCert = Buffer.from((lockerId).credentials.certificate).toString('base64')

    const recipientId = await network.wallet.get(recipient)
    const recipientCert = Buffer.from((recipientId).credentials.certificate).toString('base64')
    
    var funcToCall, asset
    
    if (options['fungible']) {
        funcToCall = AssetManager.createFungibleHTLC
        asset = 'Fungible Asset'
    } else {
       funcToCall = AssetManager.createHTLC
        asset = 'Asset'
    }

    const spinner = print.spin(`Asset Exchange: Lock ${asset}:\n`)

    try {
        spinner.info(`Trying ${asset} Lock: ${params[0]}, ${params[1]} by ${locker} for ${recipient}`)
        const res = await funcToCall(network.contract,
                    params[0],
                    params[1],
                    recipientCert,
                    hash,
                    timeout2,
                    null)
        if (!res.result) {
            throw new Error()
        }
        spinner.info(`${asset} Locked with Contract Id: ${res.result}, preimage: ${res.hash.getPreimage()}, hashvalue: ${res.hash.getSerializedHashBase64()}`)
        spinner.succeed('Asset Exchange: Lock Complete.')
    } catch(error) {
        print.error(`Could not Lock ${asset} in ${options['target-network']}`)
        spinner.fail(`Error`)
    }

    await network.gateway.disconnect()

    console.log('Gateways disconnected.')

    process.exit()
  }
}


module.exports = command
