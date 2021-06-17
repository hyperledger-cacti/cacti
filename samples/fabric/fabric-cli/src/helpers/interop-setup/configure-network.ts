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

const helperInvoke = async (ccFunc, ccArg, ...args) => {
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
      logger
    )
  )
  logger.debug(`${ccFunc} Invoke ${JSON.stringify(invokeResponse)}`)
  if (invokeError) {
    logger.error(`${ccFunc} Invoke Error: ${ccArg}`)
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
  for (const index in networkFolders) {
    const network = networkFolders[index]
    const accessControlPath = path.join(
      getCurrentNetworkCredentialPath(network),
      'access-control.json'
    )
    const membershipPath = path.join(
      getCurrentNetworkCredentialPath(network),
      'membership.json'
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
        accessControlPath,
        membershipPath,
        verificationPolicyPath,
        logger
      )
    }
  }
}
const configureNetworkHelper = async (
  connProfilePath: string,
  networkName: string,
  channelName: string,
  contractName: string,
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

  const membership = Buffer.from(fs.readFileSync(membershipPath)).toString()
  const helperInvokeArgs = [
    contractName,
    channelName,
    connProfilePath,
    networkName,
    logger
  ]
  try {
    await helperInvoke(
      'CreateAccessControlPolicy',
      accessControl,
      ...helperInvokeArgs
    )
  } catch (e) {
    logger.info('CreateAccessControlPolicy attempting Update')
    await helperInvoke(
      'UpdateAccessControlPolicy',
      accessControl,
      ...helperInvokeArgs
    )
  }
  try {
    await helperInvoke(
      'CreateVerificationPolicy',
      verificationPolicy,
      ...helperInvokeArgs
    )
  } catch (e) {
    logger.info('CreateVerificationPolicy attempting Update')
    await helperInvoke(
      'UpdateVerificationPolicy',
      verificationPolicy,
      ...helperInvokeArgs
    )
  }
  try {
    await helperInvoke('CreateMembership', membership, ...helperInvokeArgs)
  } catch (e) {
    logger.info('CreateMembership attempting Update')
    await helperInvoke('UpdateMembership', membership, ...helperInvokeArgs)
  }
}

export { configureNetworkHelper, configureNetwork }
