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
    getUserCertFromFile,
    getChaincodeConfig,
    handlePromise,
    generateViewAddressFromRemoteConfig,
    interopHelper
} from '../../../helpers/helpers'
import {
    fabricHelper,
    getUserCertBase64
} from '../../../helpers/fabric-functions'

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
          },
          {
            name: '--e2e-confidentiality',
            description: 'Flag indicating whether or not the view contents are confidential end-to-end across networks (client-to-interop-module).'
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
      print.error('--type of asset transfer needs to be specified in the format: \'asset_type.remote_network_type\'.' +
            ' \'asset_type\' can be either \'bond\', \'token\' or \'house-token\'.' +
            ' \'remote_network_type\' can be either \'fabric\', \'corda\' or \'besu\'.')
      return
    }
    if (!options['param'])
    {
      print.error('--param needs to be specified')
      return
    }
    
    const params = options['param'].split(':')
    const assetType = params[0]
    const transferCategory = options['type']
    
    if (transferCategory.includes('bond') && !params[1])
    {
      print.error('assetId needs to be specified for "bond" type')
      return
    }
    if (transferCategory.includes('token') && !params[1])
    {
      print.error('num of units needs to be specified for "token" type')
      return
    }
    if (transferCategory.includes('token') && isNaN(parseInt(params[1])))
    {
      print.error('num of units must be an integer for "token" type')
      return
    }
    
    const assetIdOrQuantity = (transferCategory.includes('token')) ? parseInt(params[1]) : params[1]
    
    const netConfig = getNetworkConfig(options['dest-network'])
    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
      print.error(
        `Please use a valid --dest-network. No valid environment found for ${options['dest-network']} `
      )
      return
    }
    
    try {
      const userCert = await getUserCertBase64(options['dest-network'], options['user'])
      const { viewAddress, ownerCert } = await getClaimViewAddress(transferCategory, options['pledge-id'],
        options['owner'], options['source-network'], userCert, options['dest-network']
      )
      
      const applicationFunction = (transferCategory.includes('token')) ? 'ClaimRemoteTokenAsset' : 'ClaimRemoteAsset'
      var { args, replaceIndices } = getChaincodeConfig(netConfig.chaincode, applicationFunction)
      args[args.indexOf('<pledge-id>')] = options['pledge-id']
      args[args.indexOf('<assettype>')] = assetType
      args[args.indexOf('<pledger>')] = ownerCert
      args[args.indexOf('network1')] = options['source-network']
      const assetIdOrQuantityIndex = (applicationFunction == 'ClaimRemoteTokenAsset') ? args.indexOf('<numunits>') : args.indexOf('<assetid>')
      args[assetIdOrQuantityIndex] = `${assetIdOrQuantity}`
      
      await interopHelper(
        options['dest-network'],
        viewAddress,
        netConfig.chaincode,
        applicationFunction,
        args,
        replaceIndices,
        options,
        print        
      )
      process.exit()
    } catch (error) {
      print.error(`Error Asset Transfer Claim: ${error}`)
    }
  }
}


async function getClaimViewAddress(transferCategory, pledgeId, owner, sourceNetwork,
    recipientCert, destNetwork
) {
    let funcName = "", funcArgs = []
    let ownerCert = await getUserCertFromFile(owner, sourceNetwork)

    if (transferCategory == "token.corda") {
        funcName = "GetAssetPledgeStatusByPledgeId"
        funcArgs = [pledgeId, destNetwork]
    } else if (transferCategory === "bond.fabric") {
        funcName = "GetAssetPledgeStatus"
        funcArgs = [pledgeId, ownerCert, destNetwork, recipientCert]
    } else if (transferCategory === "token.fabric") {
        funcName = "GetTokenAssetPledgeStatus"
        funcArgs = [pledgeId, ownerCert, destNetwork, recipientCert]
    } else if (transferCategory.includes("house-token.corda")) {
        funcName = "GetAssetPledgeStatusByPledgeId"
        funcArgs = [pledgeId, destNetwork]
    } else {
        throw new Error(`Unecognized transfer category: ${transferCategory}`)
    }

    const viewAddress = generateViewAddressFromRemoteConfig(sourceNetwork, funcName, funcArgs)

    return { viewAddress: viewAddress, ownerCert: ownerCert }
}

module.exports = command

