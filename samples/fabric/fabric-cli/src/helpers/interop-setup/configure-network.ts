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
  getCredentialPath
} from '../fabric-functions'
import { handlePromise, getNetworkConfig } from '../helpers'

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

const configureNetwork = async (mainNetwork: string, logger: any = console) => {
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
      const localMembershipPath = path.join(
        getCurrentNetworkCredentialPath(network),
        'membership.json'
      )
      if (
        !fs.existsSync(localMembershipPath)
      ) {
        logger.error(`Missing credential file for network: ${network}`)
      } else {
        await loadLocalHelper(
          networkEnv.connProfilePath,
          mainNetwork,
          process.env.DEFAULT_CHANNEL ? process.env.DEFAULT_CHANNEL : 'mychannel',
          process.env.DEFAULT_CHAINCODE
            ? process.env.DEFAULT_CHAINCODE
            : 'interop',
          localMembershipPath,
          logger
        )
      }
      continue;
    }
    const accessControlPath = path.join(
      getCurrentNetworkCredentialPath(network),
      'access-control.json'
    )
    const membershipPath = path.join(
      getCurrentNetworkCredentialPath(network),
      (network.startsWith('network') ? 'attested-membership-' + mainNetwork + '.proto.serialized' : 'membership.json')
    )
    const verificationPolicyPath = path.join(
      getCurrentNetworkCredentialPath(network),
      'verification-policy.json'
    )
    if (
      !fs.existsSync(accessControlPath) ||
      !fs.existsSync(verificationPolicyPath) ||
      !fs.existsSync(membershipPath)
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
        logger
      )
    }
  }
}

const loadLocalHelper = async (
  connProfilePath: string,
  networkName: string,
  channelName: string,
  contractName: string,
  localMembershipPath: string,
  logger: any = console
): Promise<void> => {
  const localMembership = Buffer.from(fs.readFileSync(localMembershipPath)).toString()
  const helperInvokeArgs = [
    contractName,
    channelName,
    connProfilePath,
    networkName,
    logger
  ]
  try {
    await helperInvoke('networkadmin', 'CreateLocalMembership', localMembership, ...helperInvokeArgs)
  } catch (e) {
    logger.info('CreateLocalMembership attempting Update')
    await helperInvoke('networkadmin', 'UpdateLocalMembership', localMembership, ...helperInvokeArgs)
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
  logger: any = console
): Promise<void> => {
  const accessControl = Buffer.from(
    fs.readFileSync(accessControlPath)
  ).toString()

  const verificationPolicy = Buffer.from(
    fs.readFileSync(verificationPolicyPath)
  ).toString()

  const attestedMembership = Buffer.from(fs.readFileSync(membershipPath)).toString()
  const helperInvokeArgs = [
    contractName,
    channelName,
    connProfilePath,
    networkName,
    logger
  ]
  try {
    await helperInvoke(
      '',
      'CreateAccessControlPolicy',
      accessControl,
      ...helperInvokeArgs
    )
  } catch (e) {
    logger.info('CreateAccessControlPolicy attempting Update')
    await helperInvoke(
      '',
      'UpdateAccessControlPolicy',
      accessControl,
      ...helperInvokeArgs
    )
  }
  try {
    await helperInvoke(
      '',
      'CreateVerificationPolicy',
      verificationPolicy,
      ...helperInvokeArgs
    )
  } catch (e) {
    logger.info('CreateVerificationPolicy attempting Update')
    await helperInvoke(
      '',
      'UpdateVerificationPolicy',
      verificationPolicy,
      ...helperInvokeArgs
    )
  }
  const memberRecordingUser = (targetNetwork.startsWith('network') ? 'iinagent': 'networkadmin')    // HACK until we add IIN Agents for Corda networks
  try {
    await helperInvoke(memberRecordingUser, 'CreateMembership', attestedMembership, ...helperInvokeArgs)
  } catch (e) {
    logger.info('CreateMembership attempting Update')
    await helperInvoke(memberRecordingUser, 'UpdateMembership', attestedMembership, ...helperInvokeArgs)
  }
}

export { configureNetworkHelper, configureNetwork }
