/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'
import { GluegunPrint } from 'gluegun/build/types/toolbox/print-types'
import { getKeyAndCertForRemoteRequestbyUserName, fabricHelper, invoke, query, InvocationSpec } from './fabric-functions'
import { AssetPledge } from "@hyperledger-labs/weaver-protos-js/common/asset_transfer_pb"
import { InteroperableHelper } from '@hyperledger-labs/weaver-fabric-interop-sdk'
import * as crypto from 'crypto'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import logger from './logger'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })


// UPDATE Following if new env variable or config variable is added.
// Valid keys for .env
const validKeys = [
  'DEFAULT_CHANNEL',
  'DEFAULT_CHAINCODE',
  'MEMBER_CREDENTIAL_FOLDER',
  'LOCAL',
  'DEFAULT_APPLICATION_CHAINCODE',
  'CONFIG_PATH',
  'REMOTE_CONFIG_PATH',
  'CHAINCODE_PATH'
]
// Valid keys for config
const configKeys = ['connProfilePath', 'relayEndpoint', 'mspId', 'channelName', 'chaincode', 'aclPolicyPrincipalType']

const signMessage = (message, privateKey) => {
  const sign = crypto.createSign('sha256')
  sign.write(message)
  sign.end()
  return sign.sign(privateKey)
}

// Basic function to add assets to network, it assumes function is CreateAsset
// TODO: Pass function name as parameter
const addAssets = ({
  dataFilePath,
  networkName,
  connProfilePath,
  invocationSpec,
  mspId = global.__DEFAULT_MSPID__,
  channelName,
  contractName,
  ccFunc,
  ccType,
  logger
}: {
  dataFilePath: string
  networkName: string
  connProfilePath: string
  invocationSpec?: InvocationSpec
  mspId?: string
  channelName?: string
  contractName?: string
  ccFunc?: string
  ccType: string
  logger?: any
}): void => {
  const filepath = path.resolve(dataFilePath)
  const data = JSON.parse(fs.readFileSync(filepath).toString())
  const valuesList = Object.entries(data)
  valuesList.forEach(async (item: [string, string]) => {
    const currentQuery = invocationSpec
      ? invocationSpec
      : {
          channel: channelName,
          contractName: contractName
            ? contractName
            : 'simpleasset',
          ccFunc: '',
          args: []
        }

    const { gateway, contract, wallet } = await fabricHelper({
      channel: channelName,
      contractName: contractName,
      connProfilePath: connProfilePath,
      networkName: networkName,
      mspId: mspId,
      userString: item[1]['owner'],
      registerUser: false
    })
    const userId = await wallet.get(item[1]['owner'])
    const userCert = Buffer.from((userId).credentials.certificate).toString('base64')

    if (ccType == 'bond') {
      currentQuery.ccFunc = 'CreateAsset'
      currentQuery.args = [...currentQuery.args, item[1]['assetType'], item[1]['id'], userCert, item[1]['issuer'], item[1]['facevalue'], item[1]['maturitydate']]
    } else if (ccType == 'token') {
      currentQuery.ccFunc = 'IssueTokenAssets'
      currentQuery.args = [...currentQuery.args, item[1]['tokenassettype'], item[1]['numunits'], userCert]
    } else {
      throw new Error(`Unrecognized asset category: ${ccType}`)
    }
    console.log(currentQuery)
    try {
      const read = await contract.submitTransaction(currentQuery.ccFunc, ...currentQuery.args)
      const state = Buffer.from(read).toString()
      if (state) {
        logger.debug(`Response From Network: ${state}`)
      } else {
        logger.debug('No Response from network')
      }

      // Disconnect from the gateway.
      await gateway.disconnect()
      return state
    } catch (error) {
      console.error(`Failed to submit transaction: ${error}`)
      throw new Error(error)
    }
  })
}


// Basic function to pledge an asset in one network to another, it assumes function is PledgeAsset
// TODO: Pass function name as parameter
const pledgeAsset = async ({
  dataFilePath,
  sourceNetworkName,
  destNetworkName,
  recipient,
  expirySecs,
  connProfilePath,
  invocationSpec,
  mspId = global.__DEFAULT_MSPID__,
  channelName,
  contractName,
  ccFunc,
  ccType,
  assetOwner,
  assetRef,
  assetUnits,
  logger
}: {
  dataFilePath: string
  sourceNetworkName: string
  destNetworkName: string
  recipient: string
  expirySecs: number
  connProfilePath: string
  invocationSpec?: InvocationSpec
  mspId?: string
  channelName?: string
  contractName?: string
  ccFunc?: string
  ccType: string
  assetOwner: string
  assetRef: string
  assetUnits: number
  logger?: any
}): Promise<any> => {
  const filepath = path.resolve(dataFilePath)
  const data = JSON.parse(fs.readFileSync(filepath).toString())
  let item
  if (assetRef) {
    item = data[assetRef]
    if (!item) {
      throw new Error(`Cannot find asset ref ${assetRef} in file ${filepath}`)
    }
  } else if (assetOwner) {
    item = data[assetOwner]
    if (!item) {
      throw new Error(`Cannot find asset owner ${assetOwner} in file ${filepath}`)
    }
  } else {
    throw new Error(`Neither asset owner nor reference is supplied`)
  }
  const currentQuery = invocationSpec
    ? invocationSpec
    : {
        channel: channelName,
        contractName: contractName
          ? contractName
          : 'simpleasset',
        ccFunc: '',
        args: []
      }

  const { gateway, contract, wallet } = await fabricHelper({
    channel: channelName,
    contractName: contractName,
    connProfilePath: connProfilePath,
    networkName: sourceNetworkName,
    mspId: mspId,
    userString: item['owner'],
    registerUser: false
  })
  const recipientCert = getUserCertFromFile(recipient, destNetworkName)
  const expirationTime = (Math.floor(Date.now()/1000 + expirySecs)).toString()

  if (ccType == 'bond') {
    currentQuery.ccFunc = 'PledgeAsset'
    currentQuery.args = [...currentQuery.args, item['assetType'], item['id'], destNetworkName, recipientCert, expirationTime]
  } else if (ccType == 'token') {
    currentQuery.ccFunc = 'PledgeTokenAsset'
    currentQuery.args = [...currentQuery.args, item['tokenassettype'], '' + assetUnits, destNetworkName, recipientCert, expirationTime]
  } else {
    throw new Error(`Unrecognized/unsupported asset category: ${ccType}`)
  }
  console.log(currentQuery)
  try {
    const read = await contract.submitTransaction(currentQuery.ccFunc, ...currentQuery.args)
    const state = Buffer.from(read).toString()
    if (state) {
      logger.debug(`Response From Network: ${state}`)
    } else {
      logger.debug('No Response from network')
    }

    // Disconnect from the gateway.
    await gateway.disconnect()
    return state
  } catch (error) {
    console.error(`Failed to submit transaction: ${error}`)
    throw new Error(error)
  }
}

// Used to obtain remote network user certificate from '${networkId}_UsersAndCerts.json' file.
// This is called during Pledge to get the recipientCert, and during Claim to get the pledgerCert.
const getUserCertFromFile = (
  remoteUser: string,
  remoteNetworkId: string
) => {
  const usersAndCertsFile = remoteNetworkId + '_UsersAndCerts.json'
  const credentialsPath = process.env.MEMBER_CREDENTIAL_FOLDER
    ? path.resolve(__dirname, process.env.MEMBER_CREDENTIAL_FOLDER, '..')
    : path.join(__dirname, '../data', 'credentials', '..')
  try {
    const dirPath = path.resolve(credentialsPath, 'remoteNetworkUsers')
    const filepath = path.resolve(dirPath, usersAndCertsFile)
    const usersAndCertsJSON = JSON.parse(fs.readFileSync(filepath).toString())
    logger.debug(`credentialsPath: ${credentialsPath} and usersAndCertsFile: ${usersAndCertsFile}`)

    if (!usersAndCertsJSON[remoteUser]) {
      logger.error(
        `User: ${remoteUser} does not exist in the file ${usersAndCertsFile}.`
      )
      return ''
    }
    logger.debug(`remoteUser: ${remoteUser} and certificate: ${usersAndCertsJSON[remoteUser]}`)
    return usersAndCertsJSON[remoteUser]
  } catch (err) {
    logger.error(`User: ${remoteUser} does not exist in the file ${usersAndCertsFile}.`)
    return ''
  }
}

// Used to store the network user certificate to the file '${networkId}_UsersAndCerts.json'.
// This is used during Pledge to get the recipientCert, and during Claim to get the pledgerCert.
const saveUserCertToFile = (
  remoteUser: string,
  remoteNetworkId: string
) => {
  const usersAndCertsFile = remoteNetworkId + '_UsersAndCerts.json'
  let usersAndCertsJSON = {}
  const credentialsPath = process.env.MEMBER_CREDENTIAL_FOLDER
    ? path.resolve(__dirname, process.env.MEMBER_CREDENTIAL_FOLDER, '..')
    : path.join(__dirname, '../data', 'credentials', '..')
    // Don't create the directory 'remoteNetworkUsers' inside 'data/credentials' since each entry there represents
    // a network. Instead, create this directory inside 'data' itself.
  try {
    const dirPath = path.resolve(credentialsPath, 'remoteNetworkUsers')
    const filepath = path.resolve(dirPath, usersAndCertsFile)
    logger.debug(`credentialsPath: ${credentialsPath} and usersAndCertsFile: ${usersAndCertsFile}`)

    if (!fs.existsSync(dirPath)) {
      logger.debug(`Creating directory ${dirPath}`)
      fs.mkdirSync(dirPath, { recursive: true })
    }

    if (fs.existsSync(filepath)) {
      logger.debug(`Reading contents of the file ${filepath}`)
      usersAndCertsJSON = JSON.parse(fs.readFileSync(filepath).toString())
    }

    const remoteUserId = JSON.parse(fs.readFileSync(__dirname + '/../wallet-' + remoteNetworkId + '/' + remoteUser + '.id').toString())
    const remoteUserCertBase64 = Buffer.from(remoteUserId.credentials.certificate).toString('base64')

    usersAndCertsJSON[remoteUser] = remoteUserCertBase64
    fs.writeFileSync(
      path.resolve(filepath),
      JSON.stringify(usersAndCertsJSON)
    )
  } catch (err) {
    logger.error(`User: ${remoteUser} certificate cannot be saved to the file ${usersAndCertsFile}.`)
  }
}

// Basic function to query asset pledge details from a network, it assumes function is GetAssetPledgeStatus
// TODO: Pass function name as parameter
const getAssetPledgeDetails = async ({
  sourceNetworkName,
  pledger,
  pledgerCert,
  destNetworkName,
  recipient,
  recipientCert,
  invocationSpec,
  mspId = global.__DEFAULT_MSPID__,
  ccFunc,
  pledgeId,
  logger
}: {
  sourceNetworkName: string
  pledger: string
  pledgerCert: string
  destNetworkName: string
  recipient: string
  recipientCert: string
  invocationSpec?: InvocationSpec
  mspId?: string
  ccFunc?: string
  pledgeId: string
  logger?: any
}): Promise<any> => {
  const netConfig = getNetworkConfig(sourceNetworkName)

  const currentQuery = invocationSpec
    ? invocationSpec
    : {
        channel: netConfig.channelName,
        contractName: netConfig.chaincode
          ? netConfig.chaincode
          : 'simpleasset',
        ccFunc: '',
        args: []
      }

  const { gateway, contract, wallet } = await fabricHelper({
    channel: netConfig.channelName,
    contractName: netConfig.chaincode,
    connProfilePath: netConfig.connProfilePath,
    networkName: sourceNetworkName,
    mspId: netConfig.mspId,
    userString: pledger,
    registerUser: false
  })
  if (!pledgerCert) {
    const pledgerId = JSON.parse(fs.readFileSync(__dirname + '/../wallet-' + sourceNetworkName + '/' + pledger + '.id').toString())
    pledgerCert = Buffer.from(pledgerId.credentials.certificate).toString('base64')
  }
  if (!recipientCert) {
    const recipientId = JSON.parse(fs.readFileSync(__dirname + '/../wallet-' + destNetworkName + '/' + recipient + '.id').toString())
    recipientCert = Buffer.from(recipientId.credentials.certificate).toString('base64')
  }

  currentQuery.ccFunc = 'GetAssetPledgeStatus'
  currentQuery.args = [...currentQuery.args, pledgeId, pledgerCert, destNetworkName, recipientCert]
  console.log(currentQuery)
  try {
    const read = await contract.evaluateTransaction(currentQuery.ccFunc, ...currentQuery.args)
    const state = Buffer.from(read).toString()
    if (state) {
      logger.debug(`Response From Network: ${state}`)
    } else {
      logger.debug('No Response from network')
    }

    // Disconnect from the gateway.
    await gateway.disconnect()
    return state
  } catch (error) {
    console.error(`Failed to submit transaction: ${error}`)
    throw new Error(error)
  }
}

// Basic function to query asset pledge details from a network, it assumes function is GetAssetPledgeDetails
// TODO: Pass function name as parameter
const getLocalAssetPledgeDetails = async ({
    sourceNetworkName,
    pledgeId,
    caller,
    ccType,
    ccFunc,
    logger
}: {
    sourceNetworkName: string
    pledgeId: string
    caller: string
    ccType?: string
    ccFunc?: string
    logger?: any
}): Promise<any> => {
    const netConfig = getNetworkConfig(sourceNetworkName)

    const currentQuery = {
        channel: netConfig.channelName,
        contractName: netConfig.chaincode
            ? netConfig.chaincode
            : 'simpleasset',
        ccFunc: '',
        args: []
    }

    if (ccFunc) {
        currentQuery.ccFunc = ccFunc
    } else if (ccType && ccType == 'token') {
        currentQuery.ccFunc = 'GetTokenAssetPledgeDetails'
    } else {
        currentQuery.ccFunc = 'GetAssetPledgeDetails'
    }
    currentQuery.args = [...currentQuery.args, pledgeId]
    console.log(currentQuery)
    try {
        const pledgeDetails = await query(currentQuery,
            netConfig.connProfilePath,
            sourceNetworkName,
            netConfig.mspId,
            logger,
            caller,
            false
        )
        const pledgeDetailBytes = Buffer.from(pledgeDetails, 'base64')
        const pledgeDetailsProto = AssetPledge.deserializeBinary(pledgeDetailBytes)
        return pledgeDetailsProto
    } catch (error) {
        console.error(`Failed to get pledge details: ${error}`)
        throw new Error(error)
    }
}

// Basic function to add data to network, it assumes function is Create
// TODO: Pass function name as parameter
const addData = ({
  filename,
  networkName,
  connProfilePath,
  invocationSpec,
  mspId = global.__DEFAULT_MSPID__,
  logger
}: {
  filename: string
  networkName: string
  connProfilePath: string
  invocationSpec?: InvocationSpec
  mspId?: string
  logger?: any
}): void => {
  const filepath = path.resolve(__dirname, '..', 'data', filename)
  const data = JSON.parse(fs.readFileSync(filepath).toString())
  const valuesList = Object.entries(data)
  valuesList.forEach((item: [string, string]) => {
    const currentQuery = invocationSpec
      ? invocationSpec
      : {
          channel: process.env.DEFAULT_CHANNEL
            ? process.env.DEFAULT_CHANNEL
            : 'mychannel',
          contractName: process.env.DEFAULT_APPLICATION_CHAINCODE
            ? process.env.DEFAULT_APPLICATION_CHAINCODE
            : 'simplestate',
          ccFunc: process.env.DEFAULT_APPLICATION_FUNC
            ? process.env.DEFAULT_APPLICATION_FUNC
            : 'Create',
          args: []
        }
    currentQuery.args = [...currentQuery.args, item[0], item[1]]
    invoke(currentQuery, connProfilePath, networkName, mspId, logger)
  })
}

// Custom Command help is to generate the help text used when running --help on a command.
// 1. If usage string is provided print usage section
// 2. if example string is provided print example section
// 3. if options list has options provided print options section
// 4. If there are subcommands it will print subcommands, this uses the commandRoot array where each item are the commands in order.
// Logic is also in place to fix spacing based on length.
const commandHelp = (
  print: GluegunPrint,
  toolbox: Toolbox,
  exampleString: string,
  usageString: string,
  optionsList: { name: string; description: string }[],
  command: GluegunCommand,
  commandRoot: string[]
): void => {
  print.info(command.description)
  print.info('')
  // 1
  if (usageString) {
    print.info(toolbox.print.colors.bold('USAGE'))
    print.info('')
    print.info(usageString)
    print.info('')
  }
  // 2
  if (exampleString) {
    print.info(toolbox.print.colors.bold('EXAMPLE'))
    print.info('')
    print.info(`$ ${exampleString}`)
    print.info('')
  }
  // 3
  if (optionsList.length > 0) {
    // To calculate how long each title should be to make the formatting consistent
    const spaces = optionsList.reduce((acc, val) => {
      const stringLength = val.name.length
      if (stringLength > acc) {
        return stringLength
      } else {
        return acc
      }
    }, 0)
    print.info(toolbox.print.colors.bold('OPTIONS'))
    print.info('')
    optionsList.forEach(command => {
      const val = spaces - command.name.length
      const numberOfSpaces = val > 0 ? val : 0
      toolbox.print.info(
        `${command.name} ${Array(numberOfSpaces)
          .fill('\xa0')
          .join('')} ${command.description}`
      )
    })
    print.info('')
  }
  // 4
  toolbox.print.info(toolbox.print.colors.bold('COMMANDS'))
  toolbox.print.printCommands(toolbox, commandRoot)
  toolbox.print.info('')
}

// Custom Help is used as the default help when running --help on no commands.
// filters out subcommands by using the root of each toplevel command and filters them out. When adding a command it will need to be added to the array to filter out.
const customHelp = (toolbox: Toolbox): void => {
  toolbox.print.info(toolbox.print.colors.bold('VERSION'))
  toolbox.print.info('')
  toolbox.print.info(
    toolbox.print.colors.cyan(`  fabric-cli/${toolbox.meta.version()}`)
  )
  toolbox.print.info('')
  toolbox.print.info(toolbox.print.colors.bold('COMMANDS'))
  toolbox.print.info('')
  // Filter out commands that shouldn't be listed
  const commandList = toolbox.plugin.commands
    .filter(
      command =>
        !command.commandPath.includes('chaincode') &&
        !command.commandPath.includes('interop') &&
        !command.commandPath.includes('relay') &&
        !command.commandPath.includes('configure') &&
        !command.commandPath.includes('fabric-cli') &&
        !command.commandPath.includes('env') &&
        !command.commandPath.includes('helper') &&
        !command.commandPath.includes('config') &&
        !command.commandPath.includes('asset')
    )
    // Maps commands to include alias in title
    .map(command => {
      const aliasesString =
        command.aliases.length > 0 ? `(${command.aliases.join(',')})` : ''
      const commandTitle = `  ${command.name} ${aliasesString}`

      return {
        commandTitle,
        description: command.description ? command.description : '-'
      }
    })
  // To calculate how long each title should be to make the formatting consistent
  const spaces = commandList.reduce((acc, val) => {
    const stringLength = val.commandTitle.length
    if (stringLength > acc) {
      return stringLength
    } else {
      return acc
    }
  }, 0)
  commandList.forEach(command => {
    const val = spaces - command.commandTitle.length
    const numberOfSpaces = val > 0 ? val : 0
    toolbox.print.info(
      `${command.commandTitle} ${Array(numberOfSpaces)
        .fill('\xa0')
        .join('')} ${command.description}`
    )
  })
  toolbox.print.info('')
}

// A better way to handle errors for promises
function handlePromise<T>(promise: Promise<T>): Promise<[T?, Error?]> {
  const result: Promise<[T?, Error?]> = promise
    .then(data => {
      const response: [T?, Error?] = [data, undefined]
      return response
    })
    .catch(error => Promise.resolve([undefined, error]))
  return result
}

// Necessary until gRPC provides a native async friendly solution https://github.com/grpc/grpc-node/issues/54
function promisifyAll(client): any {
  const to = {}
  for (const k in client) {
    if (typeof client[k] != 'function') continue
    to[k] = promisify(client[k].bind(client))
  }
  return to
}

const readJSONFromFile = (jsonfile, logger = console) => {
  let data = null
  const filepath = path.resolve(jsonfile)
  logger.debug('jsonfile is ' + jsonfile)
  logger.debug('filepath is ' + filepath)

  try {
    const contents = fs.readFileSync(filepath).toString()
    logger.debug('contents ' + contents)
    data = JSON.parse(contents)
    logger.debug('data - ' + JSON.stringify(data))
  } catch (e) {
    logger.debug('Error ' + e.message + ' while parsing JSON config file')
    throw e
  }
  return data
}

// Used for getting network configuration from config.json file.
const getNetworkConfig = (
  networkId: string
): { relayEndpoint?: string; connProfilePath: string; username?: string; mspId?:string; aclPolicyPrincipalType?: string; channelName?: string; chaincode?: string } => {
  const configPath = process.env.CONFIG_PATH
    ? path.join(process.env.CONFIG_PATH)
    : path.join(__dirname, '../../config.json')
  try {
    const configJSON = JSON.parse(fs.readFileSync(configPath).toString())
    if (!configJSON[networkId]) {
      logger.error(
        `Network: ${networkId} does not exist in the config.json file`
      )
      return { relayEndpoint: '', connProfilePath: '', username: '', mspId: '', aclPolicyPrincipalType: '', channelName: '', chaincode: '' }
    }
    return configJSON[networkId]
  } catch (err) {
    logger.error(`Network: ${networkId} does not exist in the config.json file`)
    return { relayEndpoint: '', connProfilePath: '', username: '', mspId: '', aclPolicyPrincipalType: '', channelName: '', chaincode: '' }
  }
}

// Used for getting network configuration from config.json file.
const getChaincodeConfig = (
  chaincodeId: string,
  chaincodeFunc: string
): { args: Array<string>; replaceIndices: Array<number> } => {
  const ccPath = process.env.CHAINCODE_PATH
    ? path.join(process.env.CHAINCODE_PATH)
    : path.join(__dirname, '../../chaincode.json')
  try {
    const ccJSON = JSON.parse(fs.readFileSync(ccPath).toString())
    if (!ccJSON[chaincodeId]) {
      logger.error(
        `Chaincode: ${chaincodeId} does not exist in the chaincode.json file`
      )
      return { args: [], replaceIndices: [] }
    }
    if (!ccJSON[chaincodeId][chaincodeFunc]) {
      logger.error(
        `Chaincode: ${chaincodeId} does not have a ${chaincodeFunc} function attribute in the chaincode.json file`
      )
      return { args: [], replaceIndices: [] }
    }
    return ccJSON[chaincodeId][chaincodeFunc]
  } catch (err) {
    logger.error(`Chaincode: ${chaincodeId} does not exist in the chaincode.json file`)
    return { args: [], replaceIndices: [] }
  }
}

// Update view address if needed
const generateViewAddress = async (
  viewAddress: string,
  sourceNetwork: string,
  destNetwork: string,
  logger?: any
): Promise<string> => {
  if (!viewAddress || viewAddress.length === 0) {
    throw new Error('Empty view address')
  }
  if (viewAddress.indexOf('#') >= 0) {
    return viewAddress
  }
  if (viewAddress.indexOf('GetAssetClaimStatus') >= 0 || viewAddress.indexOf('GetTokenAssetClaimStatus') >= 0) {
    // Get asset pledge details
    let ccFunc
    if (viewAddress.indexOf('GetAssetClaimStatus') >= 0) {
      ccFunc = 'GetAssetClaimStatus'
    } else {
      ccFunc = 'GetTokenAssetClaimStatus'
    }
    const addressParts = viewAddress.substring(viewAddress.indexOf(ccFunc) + ccFunc.length + 1).split(':')
    if (addressParts.length != 6) {
      throw new Error(`Expected 6 arguments for ${ccFunc}; found ${addressParts.length}`)
    }
    if (addressParts[5] != sourceNetwork) {
      throw new Error(`Passed source network ID ${sourceNetwork} does not match last chaincode argument in view address ${addressParts[5]}`)
    }
    const pledgeDetails = await getAssetPledgeDetails({
      sourceNetworkName: addressParts[5],
      pledger: '',
      pledgerCert: addressParts[4],
      destNetworkName: destNetwork,
      recipient: '',
      recipientCert: addressParts[3],
      pledgeId: addressParts[0],
      logger: logger
    })
    return viewAddress + ':' + deserializeAssetPledge(pledgeDetails).getExpirytimesecs()
  } else {
    return viewAddress
  }
}

function deserializeAssetPledge(pledgeDetails) {
    const pledgeDetailBytes = Buffer.from(pledgeDetails, 'base64')
    const pledgeDetailsProto = AssetPledge.deserializeBinary(pledgeDetailBytes)
    return pledgeDetailsProto
}

// Used for creating view address for interop call using remote-network-config.json
const generateViewAddressFromRemoteConfig = (
  networkId: string,
  funcName: string,
  funcArgs: Array<string>
): any => {
  const configPath = process.env.REMOTE_CONFIG_PATH
    ? path.join(process.env.REMOTE_CONFIG_PATH)
    : path.join(__dirname, '../../remote-network-config.json')
  try {
    const configJSON = JSON.parse(fs.readFileSync(configPath).toString())
    if (!configJSON[networkId]) {
      logger.error(
        `Error: ${networkId} does not exist in the remote-network-config.json file`
      )
      throw new Error(`Error: ${networkId} does not exist in the remote-network-config.json file`)
    }

    const remoteNetConfig = configJSON[networkId]
    let address = remoteNetConfig.relayEndpoint + '/' + networkId
    if (remoteNetConfig.type == "fabric") {
        address = address + '/' + remoteNetConfig.channelName + ':' +
            remoteNetConfig.chaincode + ':' + funcName + ':' + funcArgs.join(':')
    } else if (remoteNetConfig.type == "corda") {
        address = address + '/' + remoteNetConfig.partyEndPoint + '#' +
            remoteNetConfig.flowPackage + "." + funcName + ":" + funcArgs.join(':')
    } else {
        logger.error(`Error: remote network ${remoteNetConfig.type} not supported.`)
        throw new Error(`Error: remote network ${remoteNetConfig.type} not supported.`)
    }
    console.log(`Interop query, funcName: ${funcName} \n funcArgs: ${funcArgs} \n and address: ${address}`)

    return address
  } catch (err) {
    logger.error(`Error: ${err}`)
    throw new Error(err)
  }
}


// Used for creating view address for interop call using remote-network-config.json
const interopHelper = async (
  networkName: string,
  viewAddress: string,
  appChaincodeId: string,
  applicationFunction: string,
  applicationArgs: Array<string>,
  replaceIndices: Array<number>,
  options: any,                         // For TLS
  print: GluegunPrint                   // For logging
): Promise<any> => {
  const netConfig = getNetworkConfig(networkName)
  if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
      throw new Error(`No valid config entry found for ${networkName}`)
  }

  const { gateway, wallet, contract } = await fabricHelper({
      channel: netConfig.channelName,
      contractName: process.env.DEFAULT_CHAINCODE ? process.env.DEFAULT_CHAINCODE : 'interop',
      connProfilePath: netConfig.connProfilePath,
      networkName,
      mspId: netConfig.mspId,
      logger,
      discoveryEnabled: true,
      userString: options['user']
  })

  const [keyCert, keyCertError] = await handlePromise(
    getKeyAndCertForRemoteRequestbyUserName(wallet, options['user'])
  )
  if (keyCertError) {
    throw new Error(`Error getting key and cert ${keyCertError}`)
  }
  const spinner = print.spin(`Starting Interop Query`)

  let relayTlsCAFiles = []
  if (options['relay-tls-ca-files']) {
    relayTlsCAFiles = options['relay-tls-ca-files'].split(':')
  }
  try {
    const invokeObject = {
      channel: netConfig.channelName,
      ccFunc: applicationFunction,
      ccArgs: applicationArgs,
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
      [],
      false,
      options['relay-tls'] === 'true',
      relayTlsCAFiles,
      options['e2e-confidentiality'] === 'true',
      gateway
    )
    logger.info(
      `View from remote network: ${JSON.stringify(
        interopFlowResponse.views[0].toObject()
      )}. Interop Flow result: ${interopFlowResponse.result || 'successful'}`
    )
    logger.debug(`ViewB64: ${Buffer.from(interopFlowResponse.views[0].serializeBinary()).toString('base64')}`)
    const remoteValue =  (options['e2e-confidentiality'] === 'true' ?
        InteroperableHelper.getResponseDataFromView(interopFlowResponse.views[0], keyCert.key.toBytes()) :
        InteroperableHelper.getResponseDataFromView(interopFlowResponse.views[0])
    )
    if (remoteValue.contents) {
        logger.debug(`ViewB64Contents: ${Buffer.from(remoteValue.contents).toString('base64')}`)
    }
    spinner.succeed(
      `Called Function ${applicationFunction}. With Args: ${invokeObject.ccArgs} ${remoteValue.data}`
    )
    await gateway.disconnect()
    return remoteValue.data
  } catch (e) {
    spinner.fail(`Error verifying and storing state`)
    logger.error(`Error verifying and storing state: ${e}`)
    return ""
  }
}



export {
  commandHelp,
  customHelp,
  addData,
  handlePromise,
  promisifyAll,
  readJSONFromFile,
  signMessage,
  getNetworkConfig,
  getUserCertFromFile,
  saveUserCertToFile,
  getChaincodeConfig,
  validKeys,
  configKeys,
  addAssets,
  pledgeAsset,
  getAssetPledgeDetails,
  getLocalAssetPledgeDetails,
  generateViewAddress,
  generateViewAddressFromRemoteConfig,
  interopHelper
}
