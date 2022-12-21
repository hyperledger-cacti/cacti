/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Gateway, Wallets, Contract, X509Identity } from 'fabric-network'
import { commandHelp, getNetworkConfig, saveUserCertToFile, handlePromise } from './helpers'
import * as FabricCAServices from 'fabric-ca-client'
import { Certificate } from '@fidm/x509'
import { Utils, ICryptoKey } from 'fabric-common'
import * as membership_pb from "@hyperledger-labs/weaver-protos-js/common/membership_pb"
import * as iin_agent_pb from "@hyperledger-labs/weaver-protos-js/identity/agent_pb"
import { InteroperableHelper } from '@hyperledger-labs/weaver-fabric-interop-sdk'
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import * as fs from 'fs'

export type InvocationSpec = {
  contractName: string
  channel: string
  args: string[]
  ccFunc: string
}

const getUserCertBase64 = async (
  networkName: string,
  username: string
) => {
  const wallet = await getWalletForNetwork(networkName)
  const userId = await wallet.get(username)
  if (!userId) {
    throw new Error(`User ${username} not present in wallet of ${networkName}.`)
  }
  return Buffer.from((userId as X509Identity).credentials.certificate).toString('base64')
}

const walletSetup = async (
  networkName: string,
  ccp: any,
  mspId: string,
  userName: string,
  userPwd: string = '',
  isNetworkAdmin: boolean = false,
  isIINAgent: boolean = false,
  register: boolean = false,
  logger: any = console
) => {
  // Create a new CA client for interacting with the CA.
  const org = ccp.client['organization']
  const caName = ccp.organizations[org]['certificateAuthorities'][0]
  const caURL = ccp.certificateAuthorities[caName].url
  const ca = new FabricCAServices(caURL)
  const ident = ca.newIdentityService()

  const wallet = await getWalletForNetwork(networkName)

  // build a user object for authenticating with the CA
  // Check to see if we've already enrolled the admin user.
  let adminIdentity = await wallet.get('admin')

  if (adminIdentity) {
    logger.debug(
      'An identity for the admin user "admin" already exists in the wallet.'
    )
  } else {
    // Enroll the admin user, and import the new identity into the wallet.
    const enrollment = await ca.enroll({
      enrollmentID: 'admin',
      enrollmentSecret: 'adminpw'
    })
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes()
      },
      mspId: mspId,
      type: 'X.509'
    }
    await wallet.put('admin', x509Identity)
    adminIdentity = await wallet.get('admin')
  }
  const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type)
  const adminUser = await provider.getUserContext(adminIdentity, 'admin')
  const identity = await wallet.get(userName)
  logger.debug(`user ${userName}`)
  if (!identity) {
    // Register the user, enroll the user, and import the new identity into the wallet.
    if (!register) {
      logger.error(`Identity ${userName} does not exist. Please add user in the network.\n`)
      return
    }
    var secret, enrollment
    var enrollmentDone = false
    var attributes = []
    if (isNetworkAdmin) {
      attributes.push({ "name": "network-admin", "value": "true", "ecert": true })
    }
    if (isIINAgent) {
      attributes.push({ "name": "iin-agent", "value": "true", "ecert": true })
    }
    try {
      if (!userPwd) {
        secret = await ca.register(
          {
            affiliation: 'org1.department1',
            enrollmentID: userName,
            maxEnrollments: -1,
            role: 'client',
            attrs: attributes
          },
          adminUser
        )
      }
      else {
        secret = await ca.register(
          {
            affiliation: 'org1.department1',
            enrollmentID: userName,
            enrollmentSecret: userPwd,
            maxEnrollments: -1,
            role: 'client',
            attrs: attributes
          },
          adminUser
        )
      }
      logger.info(`Wallet Setup: Sucessful ${secret}`)
    } catch(error) {
      const registeredUser = `Identity '${userName}' is already `
      if (!userPwd || !(error.message.includes("Identity ") && error.message.includes(userName) && error.message.includes(" is already registered"))) {
        throw new Error(`user ${userName} registration with Fabric CA failed with error: ${error}`)
      } else {
        try {
          enrollment = await ca.enroll({
            enrollmentID: userName,
            enrollmentSecret: userPwd
          })
          enrollmentDone = true
        } catch (error) {
          throw new Error(`user ${userName} registration/enrollment with Fabric CA failed with error: ${error}`)
        }
      }
    }

    if (!enrollmentDone) {
      enrollment = await ca.enroll({
        enrollmentID: userName,
        enrollmentSecret: secret
      })
    }

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes()
      },
      mspId: mspId,
      type: 'X.509'
    }
    await wallet.put(userName, x509Identity)
  }
  else {
    logger.debug(`Identity ${userName} already exists.\n`)
  }

  return wallet
}

const enrollAndRecordWalletIdentity = async (
  userName: string,
  userPwd: string,
  networkName: string,
  isNetworkAdmin: boolean = false,
  isIINAgent: boolean = false,
  logger: any = console
) => {
  const net = getNetworkConfig(networkName)
  const ccpPath = path.resolve(__dirname, net.connProfilePath)
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'))
  logger.info(net)

  const wallet = await walletSetup(networkName, ccp, net.mspId, userName, userPwd, isNetworkAdmin, isIINAgent, true)
  saveUserCertToFile(userName, networkName)

  return wallet
}

const getCurrentNetworkCredentialPath = (networkName: string): string => {
  const credentialsPath = process.env.MEMBER_CREDENTIAL_FOLDER
    ? path.resolve(__dirname, process.env.MEMBER_CREDENTIAL_FOLDER, networkName)
    : path.join(__dirname, '../data', 'credentials', networkName)
  return credentialsPath
}

const getCredentialPath = (): string => {
  const credentialsPath = process.env.MEMBER_CREDENTIAL_FOLDER
    ? path.resolve(__dirname, process.env.MEMBER_CREDENTIAL_FOLDER)
    : path.join(__dirname, '../data', 'credentials')
  return credentialsPath
}

const generateAccessControl = async (
  channel: string,
  contractName: string,
  connProfilePath: string,
  networkName: string,
  templatePath: string,
  username: string,
  mspId = global.__DEFAULT_MSPID__,
  logger: any = console
): Promise<void> => {
  const { wallet } = await fabricHelper({
    channel,
    contractName,
    connProfilePath,
    networkName,
    logger,
    mspId
  })
  const templateJSON = JSON.parse(
    Buffer.from(fs.readFileSync(templatePath)).toString()
  )
  const [keyCert, keyCertError] = await handlePromise(
    getKeyAndCertForRemoteRequestbyUserName(wallet, username)
  )
  if (keyCertError) {
    logger.error(
      'Error fetching key and certificate from network',
      keyCertError
    )
  }
  const updatedRules = templateJSON.rules.map(rule => {
    if (rule.principalType == 'ca') {
        rule.principal = mspId
    } else if (rule.principalType == 'certificate') {
        rule.principal = keyCert.cert
    } else {
        logger.error(
          'Error Invalid Principal Type in template file'
        )
    }
    return rule
  })
  const accessControlJSON = {
    ...templateJSON,
    securityDomain: networkName,
    rules: updatedRules
  }
  logger.debug(`AccessControlJSON ${JSON.stringify(accessControlJSON)}`)
  const credentialsPath = getCurrentNetworkCredentialPath(networkName)
  fs.writeFileSync(
    path.join(credentialsPath, `access-control.json`),
    JSON.stringify(accessControlJSON)
  )
}

const generateVerificationPolicy = async (
  channel,
  contractName,
  connProfilePath,
  networkName: string,
  templatePath: string,
  mspId = global.__DEFAULT_MSPID__,
  logger: any = console
): Promise<void> => {
  const templateJSON = JSON.parse(
    Buffer.from(fs.readFileSync(templatePath)).toString()
  )
  const { gateway } = await fabricHelper({
    channel,
    contractName,
    connProfilePath,
    networkName,
    mspId,
    logger
  })

  const network = await gateway.getNetwork(channel)
  const mspConfig = await getMspConfig(network, logger)
  const criteria = Object.keys(formatMSP(mspConfig, networkName).members)
  const newIdentifiers = templateJSON.identifiers.map(identifier => {
    identifier.policy.criteria = criteria
    return identifier
  })
  const verificationPolicy = {
    ...templateJSON,
    identifiers: newIdentifiers,
    securityDomain: networkName
  }
  logger.debug(`VerificationPolicyJSON ${JSON.stringify(verificationPolicy)}`)
  const credentialsPath = getCurrentNetworkCredentialPath(networkName)
  logger.debug('Credential Path', credentialsPath)
  fs.writeFileSync(
    path.join(credentialsPath, `verification-policy.json`),
    JSON.stringify(verificationPolicy)
  )
}

const generateMembership = async (
  channel: string,
  contractName: string,
  connProfilePath: string,
  networkName: string,
  mspId = global.__DEFAULT_MSPID__,
  logger: any = console,
  iinAgent: boolean = false
): Promise<any> => {
  const { gateway } = await fabricHelper({
    channel,
    contractName,
    connProfilePath,
    networkName,
    mspId,
    logger
  })

  const network = await gateway.getNetwork(channel)
  const mspConfig = await getMspConfig(network, logger)
  const membershipJSON = formatMSP(mspConfig, networkName)
  const membershipJSONStr = JSON.stringify(membershipJSON)
  logger.debug(`membershipJSON: ${membershipJSONStr}`)

  const credentialsPath = getCurrentNetworkCredentialPath(networkName)
  logger.debug(`Credentials Path: ${credentialsPath}`)
  if (!fs.existsSync(credentialsPath)) {
    logger.debug(`Creating directory`)
    fs.mkdirSync(credentialsPath, { recursive: true })
  }

  fs.writeFileSync(
    path.join(credentialsPath, `membership.json`),
    membershipJSONStr
  )

  if (iinAgent) {
    // Generate protobufs and attestations for all other networks that have IIN Agents
    const credentialFolderPath = getCredentialPath()
    const otherNetworkNames = fs
      .readdirSync(credentialFolderPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .filter(item => item.name.startsWith('network'))    // HACK until we add IIN Agents for Corda networks
      .map(item => item.name)
    // Reorder the array so that the local network is the first element
    // We need to record local membership before recording other networks' memberships
    otherNetworkNames.splice(otherNetworkNames.indexOf(networkName), 1)

    if (otherNetworkNames.length > 0) {
      // Convert membership object to protobuf
      let membershipProto = new membership_pb.Membership()
      membershipProto.setSecuritydomain(membershipJSON.securityDomain)
      Object.keys(membershipJSON.members).forEach( (memberName, index) => {
        const certInfo = membershipJSON.members[memberName]
        let memberProto = new membership_pb.Member()
        memberProto.setType(certInfo.type)
        memberProto.setValue(certInfo.value)
        membershipProto.getMembersMap().set(memberName, memberProto)
      })

      // For every other network, generate a counter attested membership set
      const serializedMembership = membershipProto.serializeBinary()
      const serializedMembershipBase64 = Buffer.from(serializedMembership).toString('base64')
      const nonce = 'j849j94j40f440fkfjkld0e043'    // Some random string
      const membershipBase64WithNonce = serializedMembershipBase64 + nonce
      // Get wallet key and cert for this network's IIN Agent
      const localWallet = await getWalletForNetwork(networkName)
      const localKeyCert = await getKeyAndCertForRemoteRequestbyUserName(localWallet, 'iinagent')
      // Sign <membership + nonce> using wallet identity
      let securityDomainMember = new iin_agent_pb.SecurityDomainMemberIdentity()
      securityDomainMember.setSecurityDomain(membershipJSON.securityDomain)
      securityDomainMember.setMemberId(Object.keys(membershipJSON.members)[0])
      let localAttestation = new iin_agent_pb.Attestation()
      localAttestation.setUnitIdentity(securityDomainMember)
      localAttestation.setCertificate(localKeyCert.cert)
      const localSig = InteroperableHelper.signMessage(membershipBase64WithNonce, localKeyCert.key.toBytes())
      localAttestation.setSignature(localSig)
      localAttestation.setNonce(nonce)
      let attestedMembershipSet = new iin_agent_pb.CounterAttestedMembership.AttestedMembershipSet()
      attestedMembershipSet.setMembership(serializedMembershipBase64)
      attestedMembershipSet.setAttestationsList( [ localAttestation ] )
      const serializedAttestedMembershipSet = attestedMembershipSet.serializeBinary()
      const serializedttestedMembershipSetBase64 = Buffer.from(serializedAttestedMembershipSet).toString('base64')
      const serializedttestedMembershipSetBase64WithNonce = serializedttestedMembershipSetBase64 + nonce
      for (const otherNetworkName of otherNetworkNames) {
        // Get wallet key and cert for other network's IIN Agent
        const otherWallet = await getWalletForNetwork(otherNetworkName)
        const otherKeyCert = await getKeyAndCertForRemoteRequestbyUserName(otherWallet, 'iinagent')
        // Sign <attested membership set + nonce> using wallet identity
        let otherSecurityDomainMember = new iin_agent_pb.SecurityDomainMemberIdentity()
        otherSecurityDomainMember.setSecurityDomain(otherNetworkName)
        otherSecurityDomainMember.setMemberId(getNetworkConfig(otherNetworkName).mspId)
        let otherAttestation = new iin_agent_pb.Attestation()
        otherAttestation.setUnitIdentity(otherSecurityDomainMember)
        otherAttestation.setCertificate(otherKeyCert.cert)
        const otherSig = InteroperableHelper.signMessage(serializedttestedMembershipSetBase64WithNonce, otherKeyCert.key.toBytes())
        otherAttestation.setSignature(otherSig)
        otherAttestation.setNonce(nonce)

        // Generate chaincode argument and save it in a file
        let counterAttestedMembership = new iin_agent_pb.CounterAttestedMembership()
        counterAttestedMembership.setAttestedMembershipSet(serializedttestedMembershipSetBase64)
        counterAttestedMembership.setAttestationsList( [ otherAttestation ] )

        fs.writeFileSync(
          path.join(credentialsPath, `attested-membership-${otherNetworkName}.proto.serialized`),
          Buffer.from(counterAttestedMembership.serializeBinary()).toString('base64')
        )
      }
    }
  }
  return membershipJSON
}

const formatMSP = (mspConfig: MspConfig, networkId: string) => {
  const memberObject = { members: {}, securityDomain: networkId }
  Object.entries(mspConfig).forEach(([name, value], _) => {
    // const cert = Certificate.fromPEM(Buffer.from(value.root_certs[0], 'base64'))
    memberObject.members[name] = {
      type: 'ca',
      value: Buffer.from(value.root_certs[0], 'base64').toString('utf8')
    }
  })
  return memberObject
}

type MspConfig = {
  [key: string]: { admins: any; root_certs: any; name: string }
}

const getMspConfig = async (
  network,
  logger: any = console
): Promise<MspConfig> => {
  const mspConfigs = network.channel.getMspids()
  const orgMspConfig = {}
  logger.debug(mspConfigs)
  logger.debug(network.channel.getMsp(mspConfigs[0]))

  mspConfigs.forEach(mspId => {
    if (mspId !== 'OrdererMSP') {
      logger.info('Getting MSP Info for org with MSP ID: ' + mspId + '.')
      const mspConfig = network.getChannel().getMsp(mspId)
      delete mspConfig.id
      if (Array.isArray(mspConfig.admins)) {
        for (let i = 0; i < mspConfig.admins.length; i++) {
          mspConfig.admins[i] = Buffer.from(mspConfig.admins[i]).toString(
            'base64'
          )
        }
      } else if (mspConfig.admins.length === 0) {
        mspConfig.admins = []
      } else {
        mspConfig.admins = [Buffer.from(mspConfig.admins).toString('base64')]
      }
      if (Array.isArray(mspConfig.rootCerts)) {
        for (let i = 0; i < mspConfig.rootCerts.length; i++) {
          mspConfig.rootCerts[i] = Buffer.from(mspConfig.rootCerts[i]).toString(
            'base64'
          )
        }
      } else if (mspConfig.rootCerts.length === 0) {
        mspConfig.rootCerts = []
      } else {
        mspConfig.rootCerts = [
          Buffer.from(mspConfig.rootCerts).toString('base64')
        ]
      }
      mspConfig.root_certs = mspConfig.rootCerts
      delete mspConfig.rootCerts
      if (Array.isArray(mspConfig.intermediateCerts)) {
        for (let i = 0; i < mspConfig.intermediateCerts.length; i++) {
          mspConfig.intermediateCerts[i] = Buffer.from(
            mspConfig.intermediateCerts[i]
          ).toString('base64')
        }
      } else if (mspConfig.intermediateCerts.length === 0) {
        mspConfig.intermediateCerts = []
      } else {
        mspConfig.intermediateCerts = [
          Buffer.from(mspConfig.intermediateCerts).toString('base64')
        ]
      }
      mspConfig.intermediate_certs = mspConfig.intermediateCerts
      delete mspConfig.intermediateCerts
      if (Array.isArray(mspConfig.tlsRootCerts)) {
        for (let i = 0; i < mspConfig.tlsRootCerts.length; i++) {
          mspConfig.tlsRootCerts[i] = Buffer.from(
            mspConfig.tlsRootCerts[i]
          ).toString('base64')
        }
      } else if (mspConfig.tlsRootCerts.length === 0) {
        mspConfig.tlsRootCerts = []
      } else {
        mspConfig.tlsRootCerts = [
          Buffer.from(mspConfig.tlsRootCerts).toString('base64')
        ]
      }
      mspConfig.tls_root_certs = mspConfig.tlsRootCerts
      delete mspConfig.tlsRootCerts
      if (Array.isArray(mspConfig.tlsIntermediateCerts)) {
        for (let i = 0; i < mspConfig.tlsIntermediateCerts.length; i++) {
          mspConfig.tlsIntermediateCerts[i] = Buffer.from(
            mspConfig.tlsIntermediateCerts[i]
          ).toString('base64')
        }
      } else if (mspConfig.tlsIntermediateCerts.length === 0) {
        mspConfig.tlsIntermediateCerts = []
      } else {
        mspConfig.tlsIntermediateCerts = [
          Buffer.from(mspConfig.tlsIntermediateCerts).toString('base64')
        ]
      }
      mspConfig.tls_intermediate_certs = mspConfig.tlsIntermediateCerts
      delete mspConfig.tlsIntermediateCerts
      orgMspConfig[mspId] = mspConfig
    }
  })
  return orgMspConfig
}

async function fabricHelper({
  channel,
  contractName,
  connProfilePath,
  networkName,
  mspId = global.__DEFAULT_MSPID__,
  logger = console,
  discoveryEnabled = true,
  userString = '',
  userPwd = '',
  registerUser = true
}: {
  channel: string
  contractName: string
  connProfilePath: string
  networkName: string
  mspId?: string
  discoveryEnabled?: boolean
  logger?: any
  userString?: string
  userPwd?: string
  registerUser?: boolean
}): Promise<{ gateway: Gateway; contract: Contract; wallet: any }> {
  // load the network configuration
  const ccpPath = path.resolve(__dirname, connProfilePath)
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'))
  // Create a new file system based wallet for managing identities.
  // const walletPath = process.env.WALLET_PATH
  //   ? process.env.WALLET_PATH
  //   : path.join(__dirname, '../', `wallet-${networkName}`)

  if (!userString) {
    userString = `user1`
    userPwd = `user1pw`
  }

  const wallet = await walletSetup(networkName, ccp, mspId, userString, userPwd, false, false, registerUser, logger)
  // Check to see if we've already enrolled the user.
  const identity = await wallet.get(userString)
  if (!identity) {
    logger.info(
      `An identity for the user "${userString}" does not exist in the wallet`
    )
    logger.info('Run the registerUser.ts application before retrying')
  }
  // Create a new gateway for connecting to our peer node.
  const gateway = new Gateway()
  await gateway.connect(ccp, {
    wallet,
    identity: identity,
    discovery: {
      enabled: discoveryEnabled,
      asLocalhost: process.env.LOCAL === 'false' ? false : true
    }
  })
  const network = await gateway.getNetwork(channel)
  // Get the contract from the network.
  const contract = network.getContract(contractName)
  return { gateway, contract, wallet }
}

async function query(
  invocationSpec: InvocationSpec,
  connProfilePath: string,
  networkName: string,
  mspId = global.__DEFAULT_MSPID__,
  logger: any = console,
  userString = '',
  registerUser = true
): Promise<string> {
  logger.debug('Running invoke on fabric network')
  try {
    logger.debug(
      `QUERY: ${JSON.stringify(
        invocationSpec
      )} connProfilePath: ${connProfilePath} networkName ${networkName} `
    )
    const { contract, gateway } = await fabricHelper({
      channel: invocationSpec.channel,
      contractName: invocationSpec.contractName,
      connProfilePath: connProfilePath,
      networkName: networkName,
      mspId: mspId,
      logger: logger,
      userString: userString,
      registerUser: registerUser
    })
    const read = await contract.evaluateTransaction(invocationSpec.ccFunc, ...invocationSpec.args)
    const state = Buffer.from(read).toString()
    if (state) {
      logger.debug(`State From Network:`, state)
    } else {
      logger.debug(`No State from network`)
    }
    // Disconnect from the gateway.
    await gateway.disconnect()
    return state
  } catch (error) {
    logger.error(`Failed to submit transaction: ${error}`)
    throw new Error(error)
  }
}

async function invoke(
  invocationSpec: InvocationSpec,
  connProfilePath: string,
  networkName: string,
  mspId = global.__DEFAULT_MSPID__,
  logger: any = console,
  userString = '',
  registerUser = true
): Promise<string> {
  logger.debug('Running invoke on fabric network')
  try {
    const { contract, gateway } = await fabricHelper({
      channel: invocationSpec.channel,
      contractName: invocationSpec.contractName,
      connProfilePath: connProfilePath,
      networkName: networkName,
      mspId: mspId,
      logger: logger,
      userString: userString,
      registerUser: registerUser
    })
    logger.debug(
      `CCFunc: ${invocationSpec.ccFunc} 'CCArgs: ${JSON.stringify(invocationSpec.args)}`
    )
    const read = await contract.submitTransaction(invocationSpec.ccFunc, ...invocationSpec.args)
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

const getKeyAndCertForRemoteRequestbyUserName = async (
  wallet: any,
  username: string
): Promise<{ key: ICryptoKey; cert: any }> => {
  if (!wallet) {
    throw new Error('No wallet passed')
  }
  if (!username) {
    throw new Error('No username passed')
  }
  const identity = await wallet.get(username)
  if (!identity) {
    throw new Error(
      'Identity for username ' + username + ' not present in wallet'
    )
  }
  // Assume the identity is of type 'fabric-network.X509Identity'
  const privKey = Utils.newCryptoSuite().createKeyFromRaw(
    identity.credentials.privateKey
  )
  return { key: privKey, cert: identity.credentials.certificate }
}

const getWalletForNetwork = async (
  networkName: string,
) => {
  const walletPath = process.env.WALLET_PATH
    ? process.env.WALLET_PATH
    : path.join(__dirname, '../', `wallet-${networkName}`)

  const wallet = await Wallets.newFileSystemWallet(walletPath)
  return wallet
}


export {
  getUserCertBase64,
  walletSetup,
  invoke,
  query,
  enrollAndRecordWalletIdentity,
  fabricHelper,
  generateMembership,
  generateAccessControl,
  getKeyAndCertForRemoteRequestbyUserName,
  getCredentialPath,
  getCurrentNetworkCredentialPath,
  generateVerificationPolicy
}
