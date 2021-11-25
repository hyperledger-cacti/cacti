/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import * as path from 'path'
import {
    commandHelp,
    pledgeAsset,
    getNetworkConfig,
    getLocalAssetPledgeDetails,
    getChaincodeConfig,
    handlePromise
} from '../../../helpers/helpers'
import {
    fabricHelper,
    walletSetup,
    getKeyAndCertForRemoteRequestbyUserName
} from '../../../helpers/fabric-functions'
import { InteroperableHelper } from '@hyperledger-labs/weaver-fabric-interop-sdk'

import logger from '../../../helpers/logger'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const delay = ms => new Promise(res => setTimeout(res, ms))

const command: GluegunCommand = {
  name: 'claim',
  description:
    'Claims pledged asset in destination network',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli asset transfer claim --source-network=network1 --dest-network=network2 --user=alice --type=bond --pledge-id="pledgeid" --param=bond01:a03\r\nfabric-cli asset transfer claim --source-network=network1 --dest-network=network2 --user=alice --type=token --param=token1:50',
        'fabric-cli asset transfer claim --source-network=<source-network-name> --dest-network=<dest-network-name> --user=<user-id> --type=<bond|token> --pledge-id=<pledge-id> --param=<asset-type>:<asset-id|num-units>',
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
              'Network where the asset is currently present. <network1|network2>'
          },
          {
            name: '--user',
            description:
              'User (wallet) ID of the claimer'
          },
          {
            name: '--owner',
            description:
              'Owner (User ID) of the Asset who pledged in source Network'
          },
          {
            name: '--type',
            description:
              'Type of network <bond|token>'
          },
          {
            name: '--pledge-id',
            description:
              'Pledge Id associated with asset transfer.'
          },
          {
            name: '--param',
            description:
              'Colon separated Asset Type and Asset ID or Asset Type and Num of Units.'
          },
          {
            name: '--relay-tls',
            description: 'Flag indicating whether or not the relay is TLS-enabled.'
          },
          {
            name: '--relay-tls-ca-files',
            description: 'Colon-separated list of root CA certificate paths used to connect to the relay over TLS.'
          }
        ],
        command,
        ['asset', 'transfer', 'claim']
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
      print.error('--source-network needs to be specified')
      return
    }
    if (!options['user'])
    {
      print.error('--user needs to be specified')
      return
    }
    if (!options['owner'])
    {
      print.error('--owner needs to be specified')
      return
    }
    if (!options['type'])
    {
      print.error('--type of network needs to be specified')
      return
    }
    if (!options['param'])
    {
      print.error('--param needs to be specified')
      return
    }
    
    const params = options['param'].split(':')
    const assetType = params[0]
    const assetCategory = options['type']
    
    if (assetCategory === 'bond' && !params[1])
    {
      print.error('assetId needs to be specified for "bond" type')
      return
    }
    if (assetCategory === 'token' && !params[1])
    {
      print.error('num of units needs to be specified for "token" type')
      return
    }
    if (assetCategory === 'token' && isNaN(parseInt(params[1])))
    {
      print.error('num of units must be an integer for "token" type')
      return
    }
    
    const assetIdOrQuantity = (assetCategory === 'token') ? parseInt(params[1]) : params[1]
    
    const networkName = options['dest-network']
    const netConfig = getNetworkConfig(networkName)
    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
        print.error(
            `Please use a valid --dest-network. No valid environment found for ${options['dest-network']} `
        )
        return
    }
    const channel = netConfig.channelName
    const contractName = process.env.DEFAULT_CHAINCODE
      ? process.env.DEFAULT_CHAINCODE
      : 'interop'
    const username = options['user']
    const { wallet, contract } = await fabricHelper({
        channel,
        contractName,
        connProfilePath: netConfig.connProfilePath,
        networkName,
        mspId: netConfig.mspId,
        logger,
        discoveryEnabled: true,
        userString: username
    })
    
    const userId = await wallet.get(username)
    const userCert = Buffer.from((userId).credentials.certificate).toString('base64')
  
    const { viewAddress, ownerCert } = await getClaimViewAddress(assetCategory, options['pledge-id'],
        options['owner'], options['source-network'], userCert, networkName
    )

    if (viewAddress == "") {
        print.error(
            `Please use a valid --source-network. No valid environment found for ${options['source-network']} `
        )
        return
    }
    
    const [keyCert, keyCertError] = await handlePromise(
      getKeyAndCertForRemoteRequestbyUserName(wallet, username)
    )
    if (keyCertError) {
      print.error(`Error getting key and cert ${keyCertError}`)
      return
    }
    const spinner = print.spin(`Starting Interop Query for PledgeStatus in source network`)
    const appChaincodeId = netConfig.chaincode
    const applicationFunction = (assetCategory === 'token') ? 'ClaimRemoteTokenAsset' : 'ClaimRemoteAsset'
    const { replaceIndices } = getChaincodeConfig(appChaincodeId, applicationFunction)
    const args = [options['pledge-id'], assetType, `${assetIdOrQuantity}`, ownerCert, options['source-network'], ""]
    let relayTlsCAFiles = []
    if (options['relay-tls-ca-files']) {
      relayTlsCAFiles = options['relay-tls-ca-files'].split(':')
    }
    try {
      const invokeObject = {
        channel,
        ccFunc: applicationFunction,
        ccArgs: args,
        contractName: appChaincodeId
      }
      console.log(invokeObject)
      const interopFlowResponse = await InteroperableHelper.interopFlow(
        //@ts-ignore this comment can be removed after using published version of interop-sdk
        contract,
        networkName,
        invokeObject,
        netConfig.mspId,
        netConfig.relayEndpoint,
        replaceIndices,
        [{
          address: viewAddress,
          Sign: true
        }],
        keyCert,
        false,
        options['relay-tls'] === 'true',
        relayTlsCAFiles
      )
      logger.info(
        `View from remote network: ${JSON.stringify(
          interopFlowResponse.views[0].toObject()
        )}. GetPledgeStatus result: ${interopFlowResponse.result || 'successful'}`
      )
      const remoteValue = InteroperableHelper.getResponseDataFromView(interopFlowResponse.views[0])
      spinner.succeed(
        `Called Function ${applicationFunction}. With Args: ${invokeObject.ccArgs} ${remoteValue}`
      )
    } catch (e) {
      spinner.fail(`Error verifying and storing state`)
      logger.error(`Error verifying and storing state: ${e}`)
    }
    process.exit()
  }
}


async function getClaimViewAddress(assetCategory, pledgeId, owner, sourceNetwork,
    recipientCert, destNetwork
) {
    const sourceNetConfig = getNetworkConfig(sourceNetwork)
    if (!sourceNetConfig.connProfilePath || !sourceNetConfig.channelName || !sourceNetConfig.chaincode) {
        return { viewAddress: "", ownerCert: "" }
    }
    const { gateway, wallet } = await fabricHelper({
        channel: sourceNetConfig.channelName,
        contractName: sourceNetConfig.chaincode,
        connProfilePath: sourceNetConfig.connProfilePath,
        networkName: sourceNetwork,
        mspId: sourceNetConfig.mspId,
        discoveryEnabled: true,
        userString: owner 
    })
    // const wallet = await walletSetup(
    //     sourceNetwork,
    //     sourceNetConfig.connProfilePath,
    //     sourceNetConfig.mspId,
    //     options['owner'] 
    // )
    const ownerId = await wallet.get(owner)
    const ownerCert = Buffer.from(ownerId.credentials.certificate).toString('base64')
    await gateway.disconnect()
    
    let address = sourceNetConfig.relayEndpoint + '/' + sourceNetwork + '/' +
        sourceNetConfig.channelName + ':' + sourceNetConfig.chaincode + ':';

    if (assetCategory === 'bond') {
        address = address + 'GetAssetPledgeStatus';
    } else if (assetCategory === 'token') {
        address = address + 'GetTokenAssetPledgeStatus';
    } else {
        console.log('Unecognized asset category:', assetCategory);
        process.exit(1);
    }
    address = address + ':' + pledgeId + ':' + ownerCert + ':' + 
        destNetwork + ':' + recipientCert;

    return { viewAddress: address, ownerCert: ownerCert }
}

module.exports = command

