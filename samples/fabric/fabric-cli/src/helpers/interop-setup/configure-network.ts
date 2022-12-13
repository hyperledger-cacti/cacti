/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  invoke,
  getCurrentNetworkCredentialPath,
  getCredentialPath,
  fabricHelper
} from '../fabric-functions'
import { handlePromise, getNetworkConfig } from '../helpers'
import { MembershipManager } from '@hyperledger-labs/weaver-fabric-interop-sdk'

const helperInvoke = async (userId, ccFunc, ccArg, ...args) => {
  const [contractName, channelName, connProfilePath, networkName, logger] = args
  const [invokeResponse, invokeError] = await handlePromise(
    invoke(
      {
        contractName,
        channel: channelName,
        ccFunc: ccFunc,
        args: [ccArg]
      },
      connProfilePath,
      networkName,
      global.__DEFAULT_MSPID__,
      logger,
      userId,
      (userId === '')
    )
  )
  logger.debug(`${ccFunc} Invoke ${JSON.stringify(invokeResponse)}`)
  if (invokeError) {
    logger.error(`${ccFunc} Invoke Error: ${ccFunc}: ${ccArg}`)
    throw new Error(`${ccFunc} Invoke Error ${invokeError}`)
  } else {
    logger.info(`Successfully invoked ${ccFunc}`)
  }
}

const configureNetwork = async (mainNetwork: string, members: Array<string> = [global.__DEFAULT_MSPID__], logger: any = console, iinAgent: boolean = false) => {
  const networkEnv = getNetworkConfig(mainNetwork)
  logger.debug(`NetworkEnv: ${JSON.stringify(networkEnv)}`)
  if (!networkEnv.relayEndpoint || !networkEnv.connProfilePath) {
    logger.error(
      'Please use a valid --local-network. If valid network please check if your environment variables are configured properly'
    )
    return
  }

  const credentialFolderPath = getCredentialPath()
  const networkFolders = fs
    .readdirSync(credentialFolderPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(item => item.name)
  // Reorder the array so that the local network is the first element
  // We need to record local membership before recording other networks' memberships
  networkFolders.splice(networkFolders.indexOf(mainNetwork), 1)
  networkFolders.splice(0, 0, mainNetwork)

  for (const index in networkFolders) {
    const network = networkFolders[index]
    if (network === mainNetwork) {
      // A network needs to load/record only other networks' credentials
      await loadLocalHelper(
        networkEnv.connProfilePath,
        mainNetwork,
        process.env.DEFAULT_CHANNEL ? process.env.DEFAULT_CHANNEL : 'mychannel',
        process.env.DEFAULT_CHAINCODE
          ? process.env.DEFAULT_CHAINCODE
          : 'interop',
        members,
        logger
      )
      continue;
    }
    const accessControlPath = path.join(
      getCurrentNetworkCredentialPath(network),
      'access-control.json'
    )
    let membershipPath = ""
    if (!network.startsWith('network')) {
        membershipPath = path.join(
          getCurrentNetworkCredentialPath(network),
          'membership.json'
        )
    } else if (iinAgent) {
      membershipPath = path.join(
        getCurrentNetworkCredentialPath(network),
        'attested-membership-' + mainNetwork + '.proto.serialized'
      )
    }
    const verificationPolicyPath = path.join(
      getCurrentNetworkCredentialPath(network),
      'verification-policy.json'
    )
    if (
      !fs.existsSync(accessControlPath) ||
      !fs.existsSync(verificationPolicyPath) ||
      (membershipPath !== "" && !fs.existsSync(membershipPath))
    ) {
      logger.error(`Missing credential file for network: ${network}`)
    } else {
      await configureNetworkHelper(
        networkEnv.connProfilePath,
        mainNetwork,
        process.env.DEFAULT_CHANNEL ? process.env.DEFAULT_CHANNEL : 'mychannel',
        process.env.DEFAULT_CHAINCODE
          ? process.env.DEFAULT_CHAINCODE
          : 'interop',
        network,
        accessControlPath,
        membershipPath,
        verificationPolicyPath,
        logger,
        iinAgent
      )
    }
  }
}

const loadLocalHelper = async (
  connProfilePath: string,
  networkName: string,
  channelName: string,
  contractName: string,
  members: Array<string>,
  logger: any = console
): Promise<void> => {
  //const localMembership = Buffer.from(fs.readFileSync(localMembershipPath)).toString()
  const { gateway } = await fabricHelper({
    channel: channelName,
    contractName: contractName,
    connProfilePath: connProfilePath,
    networkName: networkName,
    mspId: global.__DEFAULT_MSPID__,
    userString: 'networkadmin',
    registerUser: false
  })
  try {
    const response = await MembershipManager.createLocalMembership(gateway, members, networkName, channelName, contractName)
    logger.info('CreateLocalMembership Successful.')
  } catch (e) {
    logger.error(e)
    logger.info('CreateLocalMembership attempting Update')
    const response = await MembershipManager.updateLocalMembership(gateway, members, networkName, channelName, contractName)
    logger.info('Update Local Memebrship response: success: ', response)
  }
}

const configureNetworkHelper = async (
  connProfilePath: string,
  networkName: string,
  channelName: string,
  contractName: string,
  targetNetwork: string,
  accessControlPath: string,
  membershipPath: string,
  verificationPolicyPath: string,
  logger: any = console,
  iinAgent: boolean = false
): Promise<void> => {
  logger.info(`Target Network: ${targetNetwork}`)
  const accessControl = Buffer.from(
    fs.readFileSync(accessControlPath)
  ).toString()

  const verificationPolicy = Buffer.from(
    fs.readFileSync(verificationPolicyPath)
  ).toString()

  const helperInvokeArgs = [
    contractName,
    channelName,
    connProfilePath,
    networkName,
    logger
  ]

  const adminUser = 'networkadmin'

  try {
    await helperInvoke(
      adminUser,
      'CreateAccessControlPolicy',
      accessControl,
      ...helperInvokeArgs
    )
  } catch (e) {
    logger.info('CreateAccessControlPolicy attempting Update')
    await helperInvoke(
      adminUser,
      'UpdateAccessControlPolicy',
      accessControl,
      ...helperInvokeArgs
    )
  }
  try {
    await helperInvoke(
      adminUser,
      'CreateVerificationPolicy',
      verificationPolicy,
      ...helperInvokeArgs
    )
  } catch (e) {
    logger.info('CreateVerificationPolicy attempting Update')
    await helperInvoke(
      adminUser,
      'UpdateVerificationPolicy',
      verificationPolicy,
      ...helperInvokeArgs
    )
  }
  if (iinAgent || !targetNetwork.startsWith('network')) {
    const membership = Buffer.from(fs.readFileSync(membershipPath)).toString()
    const memberRecordingUser = iinAgent ? 'iinagent': adminUser    // HACK until we add IIN Agents for Corda networks
    try {
      await helperInvoke(memberRecordingUser, 'CreateMembership', membership, ...helperInvokeArgs)
    } catch (e) {
      logger.info('CreateMembership attempting Update')
      await helperInvoke(memberRecordingUser, 'UpdateMembership', membership, ...helperInvokeArgs)
    }
  }
}

export { configureNetworkHelper, configureNetwork }
