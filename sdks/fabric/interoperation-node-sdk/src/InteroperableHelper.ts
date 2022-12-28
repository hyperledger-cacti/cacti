/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This file provides helper functions for interoperability operations.
 **/
/** End file docs */

import log4js from "log4js";
import sshpk from "sshpk";
import { KEYUTIL as keyutil } from "jsrsasign";
import FabCommon from "fabric-common";
//@ts-ignore
import { Identity } from "fabric-common";
import fabproto6 from "fabric-protos";
import crypto from "crypto";
import eciesCrypto from "./eciesCrypto.js";
import * as helpers from "./helpers";
import { deserializeRemoteProposalResponseBase64, serializeRemoteProposalResponse } from "./decoders";
import statePb from "@hyperledger-labs/weaver-protos-js/common/state_pb";
import fabricViewPb from "@hyperledger-labs/weaver-protos-js/fabric/view_data_pb";
import cordaViewPb from "@hyperledger-labs/weaver-protos-js/corda/view_data_pb";
import interopPayloadPb from "@hyperledger-labs/weaver-protos-js/common/interop_payload_pb";
import proposalPb from "@hyperledger-labs/weaver-protos-js/peer/proposal_pb";
import proposalResponsePb from "@hyperledger-labs/weaver-protos-js/peer/proposal_response_pb";
import identitiesPb from "@hyperledger-labs/weaver-protos-js/msp/identities_pb";
import { Relay } from "./Relay";
import { Gateway, Contract } from "fabric-network";
import { v4 as uuidv4 } from "uuid";
import { ICryptoKey } from "fabric-common";
import { InteropJSON, InvocationSpec, Flow, RemoteJSON } from "./types";
const logger = log4js.getLogger("InteroperableHelper");
const contractApi = require("fabric-network/lib/contract.js");

// TODO: Lookup different key and cert pairs for different networks and chaincode functions
/**
 * Generate key pair and obtain certificate from CA (MSP)
 **/
const getKeyAndCertForRemoteRequestbyUserName = async (wallet, username) => {
    if (!wallet) {
        throw new Error("No wallet passed");
    }
    if (!username) {
        throw new Error("No username passed");
    }
    const identity = await wallet.get(username);
    if (!identity) {
        throw new Error(`Identity for username ${username} not present in wallet`);
    }
    // Assume the identity is of type 'fabric-network.X509Identity'
    const privKey = FabCommon.Utils.newCryptoSuite().createKeyFromRaw(identity.credentials.privateKey);
    return { key: privKey, cert: identity.credentials.certificate };
};

const decryptRemoteProposalResponse = (proposalResponseBytes64: string, eciesPrivateKeyPEM: any) => {
    const privKey = keyutil.getKeyFromPlainPrivatePKCS8PEM(eciesPrivateKeyPEM);
    const propResp = deserializeRemoteProposalResponseBase64(proposalResponseBytes64);
    const decryptionOptions = { hashAlgorithm: "SHA2" };
    //@ts-ignore Issue with propResp.payload not being a string but errors when converted to a string
    propResp.payload = eciesCrypto.eciesDecryptMessage(privKey, propResp.payload, decryptionOptions);
    return propResp;
};

const decryptRemoteChaincodeOutput = (proposalResponseBytes64, eciesPrivateKeyPEM) => {
    const privKey = keyutil.getKeyFromPlainPrivatePKCS8PEM(eciesPrivateKeyPEM);
    const propResp = deserializeRemoteProposalResponseBase64(proposalResponseBytes64);
    const decryptionOptions = { hashAlgorithm: "SHA2" };
    //@ts-ignore Issue with propResp.payload not being a string but errors when converted to a string
    propResp.response.payload = eciesCrypto.eciesDecryptMessage(privKey, propResp.response.payload, decryptionOptions);
    return propResp;
};

const decryptData = (dataBytes, eciesPrivateKeyPEM) => {
    const privKey = keyutil.getKeyFromPlainPrivatePKCS8PEM(eciesPrivateKeyPEM);
    const decryptionOptions = { hashAlgorithm: "SHA2" };
    return eciesCrypto.eciesDecryptMessage(privKey, dataBytes, decryptionOptions);
};

/* Validate proposal response received from remote network
 *
 * @param {ProposalResponse} proposalResponse - The endorsement response from the remote peer,
 *                             includes the endorser certificate and signature over the
 *                             proposal + endorsement result + endorser certificate.
 * @returns {boolean} or throw error (caller should catch this)
 **/
const verifyDecryptedRemoteProposalResponse = async (proposalResponse) => {
    logger.debug("verifyDecryptedRemoteProposalResponse - start");
    if (!proposalResponse) {
        throw new Error("Missing proposal response");
    }
    if (proposalResponse instanceof Error) {
        return false;
    }
    if (!proposalResponse.endorsement) {
        throw new Error("Missing ProposalResponse endorsement");
    }

    const { endorsement } = proposalResponse;
    let identity;

    const sid = fabproto6.msp.SerializedIdentity.decode(endorsement.endorser);
    const { mspid } = sid;
    logger.debug("getMSPbyIdentity - found mspid %s", mspid);

    try {
        const idCryptoSuite = FabCommon.Utils.newCryptoSuite();
        idCryptoSuite.setCryptoKeyStore(FabCommon.Utils.newCryptoKeyStore());
        const idPubKey = await idCryptoSuite.importKey(sid.id_bytes.toString(), {
            // algorithm: FabCommon.CryptoAlgorithms.X509Certificate,
            ephemeral: true,
        });
        identity = new Identity(sid.id_bytes, idPubKey, sid.mspid, idCryptoSuite);
        if (!identity) {
            throw new Error("Unable to find the remote endorser identity");
        }
    } catch (error) {
        logger.error("verifyDecryptedRemoteProposalResponse - getting remote endorser identity failed with: ", error);
        return false;
    }

    try {
        // see if the identity is trusted
        if (!identity.isValid()) {
            logger.error("Endorser identity is not valid");
            return false;
        }
        logger.debug("verifyDecryptedRemoteProposalResponse - have a valid identity");

        // check the signature against the endorser and payload hash
        const digest = Buffer.concat([proposalResponse.payload, endorsement.endorser]);
        if (!identity.verify(digest, endorsement.signature)) {
            logger.error("Proposal signature is not valid");
            return false;
        }
    } catch (error) {
        logger.error("verifyDecryptedRemoteProposalResponse - verify failed with: ", error);
        return false;
    }

    logger.debug(
        "verifyDecryptedRemoteProposalResponse - This endorsement has both a valid identity and valid signature",
    );
    return true;
};

const verifyRemoteProposalResponse = async (proposalResponseBase64, isEncrypted, privKeyPEM) => {
    let decryptedProposalResponse = proposalResponseBase64;
    if (isEncrypted) {
        decryptedProposalResponse = decryptRemoteProposalResponse(proposalResponseBase64, privKeyPEM);
        if (!decryptedProposalResponse) {
            return { proposalResponse: null, valid: false };
        }
    } else {
        decryptedProposalResponse = deserializeRemoteProposalResponseBase64(decryptedProposalResponse);
    }

    const isValid = await verifyDecryptedRemoteProposalResponse(decryptedProposalResponse);
    return {
        proposalResponse: (serializeRemoteProposalResponse(decryptedProposalResponse) as Buffer).toString("base64"),
        valid: isValid,
    };
};

/**
 * Extracts actual remote query response (along with full decrypted contents, if the response is encrypted) embedded in view structure.
 * Arguments are a View protobuf ('statePb.View') and a certificate in the form of a PEM string
 **/
const getResponseDataFromView = (view, privKeyPEM = null) => {
    if (view.getMeta().getProtocol() == statePb.Meta.Protocol.FABRIC) {
        const fabricView = fabricViewPb.FabricView.deserializeBinary(view.getData());
        const fabricViewProposalResponses = fabricView.getEndorsedProposalResponsesList();
        let viewAddress = '';
        let responsePayload = '';
        let responsePayloadContents = [];
        let payloadConfidential = false;
        for (let i = 0; i < fabricViewProposalResponses.length; i++) {
            const fabricViewChaincodeAction = proposalPb.ChaincodeAction.deserializeBinary(fabricViewProposalResponses[i].getPayload().getExtension_asU8());
            const interopPayload = interopPayloadPb.InteropPayload.deserializeBinary(Uint8Array.from(Buffer.from(fabricViewChaincodeAction.getResponse().getPayload())));
            if (interopPayload.getConfidential()) {    // Currently this is only supported for Fabric because it uses ECDSA keys in wallets
                const confidentialPayload = interopPayloadPb.ConfidentialPayload.deserializeBinary(Uint8Array.from(Buffer.from(interopPayload.getPayload())));
                const decryptedPayload = decryptData(Buffer.from(confidentialPayload.getEncryptedPayload()), privKeyPEM);
                const decryptedPayloadContents = interopPayloadPb.ConfidentialPayloadContents.deserializeBinary(Uint8Array.from(Buffer.from(decryptedPayload)));
                if (i === 0) {
                    viewAddress = interopPayload.getAddress();
                    responsePayload = Buffer.from(decryptedPayloadContents.getPayload()).toString();
                    payloadConfidential = true;
                } else if (!payloadConfidential) {
                    throw new Error(`Mismatching payload confidentiality flags across proposal responses`);
                } else {
                    // Match view addresses in the different proposal responses
                    if (viewAddress !== interopPayload.getAddress()) {
                        throw new Error(`Proposal response view addresses mismatch: 0 - ${viewAddress}, ${i} - ${interopPayload.getAddress()}`);
                    }
                    // Match decrypted view payloads from the different proposal responses
                    const currentResponsePayload = Buffer.from(decryptedPayloadContents.getPayload()).toString();
                    if (responsePayload !== currentResponsePayload) {
                        throw new Error(`Decrypted proposal response payloads mismatch: 0 - ${responsePayload}, ${i} - ${currentResponsePayload}`);
                    }
                }
                responsePayloadContents.push(decryptedPayload.toString("base64"));
            } else {
                if (i === 0) {
                    viewAddress = interopPayload.getAddress();
                    responsePayload = Buffer.from(interopPayload.getPayload()).toString();
                    payloadConfidential = false;
                } else if (payloadConfidential) {
                    throw new Error(`Mismatching payload confidentiality flags across proposal responses`);
                } else {
                    const currentResponsePayload = Buffer.from(interopPayload.getPayload()).toString();
                    if (responsePayload !== currentResponsePayload) {
                        throw new Error(`Proposal response payloads mismatch: 0 - ${responsePayload}, ${i} - ${currentResponsePayload}`);
                    }
                    if (viewAddress !== interopPayload.getAddress()) {
                        throw new Error(`Proposal response view addresses mismatch: 0 - ${viewAddress}, ${i} - ${interopPayload.getAddress()}`);
                    }
                }
            }
        }
        if (payloadConfidential) {
            return { viewAddress: viewAddress, data: responsePayload, contents: responsePayloadContents };
        } else {
            return { viewAddress: viewAddress, data: responsePayload };
        }
    } else if (view.getMeta().getProtocol() == statePb.Meta.Protocol.CORDA) {
        const cordaView = cordaViewPb.ViewData.deserializeBinary(view.getData());
        const interopPayload = interopPayloadPb.InteropPayload.deserializeBinary(Uint8Array.from(Buffer.from(cordaView.getPayload())));
        return { viewAddress: interopPayload.getAddress(), data: Buffer.from(interopPayload.getPayload()).toString() };
    } else {
        const protocolType = view.getMeta().getProtocol();
        throw new Error(`Unsupported DLT type: ${protocolType}`);
    }
}

/**
 * Extracts endorsements and the signing authorities backing those endorsements from a Fabric view.
 * Argument is a View protobuf ('statePb.View')
 **/
const getEndorsementsAndSignatoriesFromFabricView = (view) => {
    if (view.getMeta().getProtocol() != statePb.Meta.Protocol.FABRIC) {
        throw new Error(`Not a Fabric view`);
    }
    const fabricView = fabricViewPb.FabricView.deserializeBinary(view.getData());
    const endorsedProposalResponses = fabricView.getEndorsedProposalResponsesList();
    let serializedEndorsementsWithSignatories = [];
    for (let i = 0; i < endorsedProposalResponses.length; i++) {
        const endorsement = endorsedProposalResponses[i].getEndorsement();
        const endorsementSerializedBase64 = Buffer.from(endorsement.serializeBinary()).toString('base64');
        const sid = identitiesPb.SerializedIdentity.deserializeBinary(Uint8Array.from(Buffer.from(endorsement.getEndorser())));
        serializedEndorsementsWithSignatories.push([sid.getMspid(), endorsementSerializedBase64]);
    }
    return serializedEndorsementsWithSignatories;
}

/**
 * Extracts endorsements and the signing authorities backing those endorsements from a Corda view.
 * Argument is a View protobuf ('statePb.View')
 **/
const getEndorsementsAndSignatoriesFromCordaView = (view) => {
    if (view.getMeta().getProtocol() != statePb.Meta.Protocol.CORDA) {
        throw new Error(`Not a Corda view`);
    }
    const cordaView = cordaViewPb.ViewData.deserializeBinary(view.getData());
    const notarizations = cordaView.getNotarizationsList();
    const signatures = [];
    const certs = [];
    const ids = [];
    for (let i = 0 ; i < notarizations.length ; i++) {
        signatures.push(notarizations[i].getSignature());
        const cert = notarizations[i].getCertificate();
        certs.push(Buffer.from(cert).toString('base64'));
        ids.push(notarizations[i].getId());
    }
    return { signatures, certs, ids };
}

/**
 * Extracts signing authority (i.e., organization MSP) a Fabric endorsement.
 * Argument is an 'Endorsement' in base64 format.
 **/
const getSignatoryOrgMSPFromFabricEndorsementBase64 = (endorsementBase64) => {
    const endorsement = proposalResponsePb.Endorsement.deserializeBinary(Buffer.from(endorsementBase64, 'base64'));
    const sid = identitiesPb.SerializedIdentity.deserializeBinary(Uint8Array.from(Buffer.from(endorsement.getEndorser())));
    return sid.getMspid();
}

/**
 * Accepts a base 64 encoded string of the protobuf view binary and returns a javascript object.
 **/
const decodeView = (viewBase64) => {
    try {
        const view = statePb.View.deserializeBinary(viewBase64);
        return view;
    } catch (e) {
        throw new Error(`Decode view failed: ${e}`);
    }
};

/**
 * Sign a message using SHA256
 * message: string
 * privateKey: pem string
 * returns: signature in base64 string
**/
function signMessage(message, privateKey, algorithm: string = "SHA256") {
    const sign = crypto.createSign(algorithm);
    sign.write(message);
    sign.end();
    return sign.sign(privateKey).toString('base64');
};
/**
 * Verifies a signature over message using SHA256
 * message: string
 * certificate: pem string
 * signature: base64 string
 * returns: True/False
 **/
function verifySignature(message, certificate, signature, algorithm: string = "SHA256") {
    const messageBuffer = Buffer.from(message);
    const signBuffer = Buffer.from(signature, 'base64');
    const publicKey = crypto.createPublicKey(certificate).export({type:'spki', format:'pem'});
    return crypto.verify(algorithm, messageBuffer, publicKey, signBuffer);
};

const validPatternString = (pattern: string): boolean => {
    // count number of stars in pattern
    const numStars = (pattern.match(/\*/g) || []).length;

    // check if 0 or 1 stars
    if (numStars <= 1) {
        // if 0 stars, return true, if 1 star, make sure its at the end
        return pattern.endsWith("*") || numStars == 0;
    }

    return false;
};

const isPatternAndAddressMatch = (pattern: string, address: string): boolean => {
    // make sure the pattern is valid
    if (!validPatternString(pattern)) {
        return false;
    }

    // count number of stars in pattern
    const numStars = (pattern.match(/\*/g) || []).length;

    // if 0 stars, and exact match, return true
    if (numStars == 0 && pattern == address) {
        return true;
    }

    // if 1 star and pattern is a substring of address, return true
    if (numStars == 1 && address.includes(pattern.slice(0, -1))) {
        return true;
    }
};

/**
 * Lookup verification policy in the interop chaincode and get the criteria related to query
 **/
const getPolicyCriteriaForAddress = async (contract: Contract, address: string): Promise<null | any> => {
    try {
        const parsedAddress = helpers.parseAddress(address);
        const [queryResponse, queryResponseError] = await helpers.handlePromise(
            contract.evaluateTransaction("GetVerificationPolicyBySecurityDomain", parsedAddress.networkSegment),
        );
        if (queryResponseError) {
            throw new Error(`Error evaluating transaction GetVerificationPolicyBySecurityDomain ${queryResponseError}`);
        }
        if (!queryResponse || queryResponse.length === 0) {
            throw new Error(`No verification policy for address ${address}`);
        }
        const verificationPolicy = JSON.parse(queryResponse.toString());
        // Get policy criteria matching the requested information in the address
        let matchingIdentifier = null;
        verificationPolicy.identifiers.forEach((item) => {
            if (item.pattern === parsedAddress.viewSegment) {
                return true;
            }
            return false;
        });
        for (const item of verificationPolicy.identifiers) {
            // short circuit if there is an exact match
            if (item.pattern === parsedAddress.viewSegment) {
                matchingIdentifier = item;
                break;
            }
            if (
                validPatternString(item.pattern) &&
                isPatternAndAddressMatch(item.pattern, parsedAddress.viewSegment) &&
                (!matchingIdentifier || item.pattern.length > matchingIdentifier.pattern.length)
            ) {
                matchingIdentifier = item;
            }
        }
        if (matchingIdentifier?.policy?.criteria) {
            return matchingIdentifier.policy.criteria;
        }
        return null;
    } catch (e) {
        throw new Error(`Error during getPolicyCriteriaForAddress: ${e}`);
    }
};

/**
 * Verifies the view by using chaincode function in interop chaincode. Verification is based on verification policy of the network, proof type and protocol type.
 **/
const verifyView = async (contract: Contract, base64ViewProto: string, address: string): Promise<boolean> => {
    try {
        await contract.evaluateTransaction("VerifyView", base64ViewProto, address);
        return true;
    } catch (e) {
        throw new Error(`Unable to verify view: ${e}`);
    }
};

/**
 * Verifies a view's contents and extracts confidential payload by using chaincode function in interop chaincode. Verification is based on verification policy of the network, proof type and protocol type.
 **/
const parseAndValidateView = async (contract: Contract, address: string, base64ViewProto: string, b64ViewContent: string): Promise<Buffer> => {
    try {
        const viewPayload = await contract.evaluateTransaction("ParseAndValidateView", address, base64ViewProto, b64ViewContent);
        return viewPayload;
    } catch (e) {
        throw new Error(`Unable to parse and validate view: ${e}`);
    }
};

/**
 * Creates an address string based on a query object, networkid and remote url.
 **/
const createAddress = (invocationSpec: InvocationSpec, networkID, remoteURL) => {
    const { channel, contractName, ccFunc, ccArgs } = invocationSpec;
    const addressString = `${remoteURL}/${networkID}/${channel}:${contractName}:${ccFunc}:${ccArgs.join(":")}`;
    return addressString;
};

/**
 * Creates an address string based on a flow object, networkid and remote url.
 **/
const createFlowAddress = (flow: Flow, networkID, remoteURL) => {
    const { cordappAddress, cordappId, flowId, flowArgs } = flow;
    const addressString = `${remoteURL}/${networkID}/${cordappAddress}#${cordappId}.${flowId}:${flowArgs.join(":")}`;
    return addressString;
};

/**
 * Flow of communicating with the local relay and requesting information from a remote network.
 * It will then invoke the local network with the response.
 * 1. For each view address, send a relay request and get a (verified) view in response
 * 2. Prepare arguments and call WriteExternalState.
 **/
const interopFlow = async (
    interopContract: Contract,
    networkID: string,
    invokeObject: InvocationSpec,
    org: string,
    localRelayEndpoint: string,
    interopArgIndices: Array<number>,
    interopJSONs: Array<InteropJSON>,
    keyCert: { key: ICryptoKey; cert: any },
    endorsingOrgs: Array<string> = [],
    returnWithoutLocalInvocation: boolean = false,
    useTls: boolean = false,
    tlsRootCACertPaths?: Array<string>,
    confidential: boolean = false,
    gateway: Gateway = null,
): Promise<{ views: Array<any>; result: any }> => {
    if (interopArgIndices.length !== interopJSONs.length) {
        throw new Error(`Number of argument indices ${interopArgIndices.length} does not match number of view addresses ${interopJSONs.length}`);
    }
    // Step 1: Iterate through the view addresses, and send remote requests and get views in response for each
    let views = [], viewsSerializedBase64 = [], computedAddresses = [], viewContentsBase64 = [];
    for(let i = 0 ; i < interopJSONs.length ; i++) {
        const [requestResponse, requestResponseError] = await helpers.handlePromise(
            getRemoteView(
                interopContract,
                networkID,
                org,
                localRelayEndpoint,
                interopJSONs[i],
                keyCert,
                useTls,
                tlsRootCACertPaths,
                confidential
            ),
        );
        if (requestResponseError) {
            throw new Error(`InteropFlow remote view request error: ${requestResponseError}`);
        }
        views.push(requestResponse.view);
        viewsSerializedBase64.push(Buffer.from(requestResponse.view.serializeBinary()).toString("base64"));
        computedAddresses.push(requestResponse.address);
        if (confidential) {
            const respData = getResponseDataFromView(requestResponse.view, keyCert.key.toBytes());
            viewContentsBase64.push(respData.contents);
        } else {
            viewContentsBase64.push([]);
        }
    }
    // Return here if caller just wants the views and doesn't want to invoke a local chaincode
    if (returnWithoutLocalInvocation) {
        const ccArgs = getCCArgsForProofVerification(
            invokeObject,
            interopArgIndices,
            computedAddresses,
            viewsSerializedBase64,
            viewContentsBase64,
        );
        return { views, result: ccArgs };
    }
    // Step 2
    const result = await submitTransactionWithRemoteViews(
        interopContract,
        invokeObject,
        interopArgIndices,
        computedAddresses,
        viewsSerializedBase64,
        viewContentsBase64,
        endorsingOrgs,
        gateway
    );
    return { views, result };
};

/**
 * Prepare arguments for WriteExternalState chaincode transaction to verify a view and write data to ledger.
 **/
const getCCArgsForProofVerification = (
    invokeObject: InvocationSpec,
    interopArgIndices: Array<number>,
    viewAddresses: Array<string>,
    viewsSerializedBase64: Array<string>,
    viewContentsBase64: Array<Array<string>>,
): Array<any> => {
    const {
        ccArgs: localCCArgs,
        channel: localChannel,
        ccFunc: localCCFunc,
        contractName: localChaincode,
    } = invokeObject;
    const ccArgs = [
        localChaincode,
        localChannel,
        localCCFunc,
        JSON.stringify(localCCArgs),
        JSON.stringify(interopArgIndices),
        JSON.stringify(viewAddresses),
        JSON.stringify(viewsSerializedBase64),
        JSON.stringify(viewContentsBase64),
    ];
    return ccArgs;
};

/**
  * Add application chaincode's endorsement policy constraints to the interop chaincode
  **/
const addAppCCEndorsementPolicy = async (
    interopContract: Contract,
    invokeObject: InvocationSpec,
    gateway: Gateway = null,
): Promise<Contract> => {
    if (!gateway) {
        // Assume here that the caller doesn't intend to add the app cc's endorsement policy
        // or that the app cc's endorsement policy is identical to the interop cc's policy
        // NOTE: this is absolutely not recommended for production
        return interopContract;
    }
    const appContract = new contractApi.ContractImpl((await gateway.getNetwork(invokeObject.channel)), invokeObject.contractName, '');
    const appDiscInterests = appContract.getDiscoveryInterests();
    appDiscInterests.forEach((interest) => { interopContract.addDiscoveryInterest(interest); });
    return interopContract;
};

/**
 * Submit local chaincode transaction to verify a view and write data to ledger.
 * - Prepare arguments and call WriteExternalState.
 **/
const submitTransactionWithRemoteViews = async (
    interopContract: Contract,
    invokeObject: InvocationSpec,
    interopArgIndices: Array<number>,
    viewAddresses: Array<string>,
    viewsSerializedBase64: Array<string>,
    viewContentsBase64: Array<Array<string>>,
    endorsingOrgs: Array<string>,
    gateway: Gateway = null,
): Promise<any> => {
    const ccArgs = getCCArgsForProofVerification(
        invokeObject,
        interopArgIndices,
        viewAddresses,
        viewsSerializedBase64,
        viewContentsBase64,
    );

    interopContract = await addAppCCEndorsementPolicy(interopContract, invokeObject, gateway);
    const tx = interopContract.createTransaction("WriteExternalState")
    if (endorsingOrgs.length > 0) {
        tx.setEndorsingOrganizations(...endorsingOrgs)
    }
    const [result, submitError] = await helpers.handlePromise(
        tx.submit(...ccArgs)
    );
    if (submitError) {
        throw new Error(`submitTransaction Error: ${submitError}`);
    }
    return result;
};

/**
 * Send a relay request with a view address and get a view in response
 * 1. Will get address from input, if address not there it will create the address from interopJSON
 * 2. Get policy from chaincode for supplied address.
 * 3. Call the relay Process request which will send a request to the remote network via local relay and poll for an update in the request status.
 * 4. Call the local chaincode to verify the view before trying to submit to chaincode.
 **/
const getRemoteView = async (
    interopContract: Contract,
    networkID: string,
    org: string,
    localRelayEndpoint: string,
    interopJSON: InteropJSON,
    keyCert: { key: ICryptoKey; cert: any },
    useTls: boolean = false,
    tlsRootCACertPaths?: Array<string>,
    confidential: boolean = false,
): Promise<{ view: any; address: any }> => {
    const {
        address,
        ChaincodeFunc,
        ChaincodeID,
        ChannelID,
        RemoteEndpoint,
        NetworkID: RemoteNetworkID,
        Sign,
        ccArgs: args,
    } = interopJSON;
    // Step 1
    const computedAddress =
        address ||
        createAddress(
            { ccFunc: ChaincodeFunc, contractName: ChaincodeID, channel: ChannelID, ccArgs: args },
            RemoteNetworkID,
            RemoteEndpoint,
        );
    // Step 2
    const [policyCriteria, policyCriteriaError] = await helpers.handlePromise(
        getPolicyCriteriaForAddress(interopContract, computedAddress),
    );
    if (policyCriteriaError) {
        throw new Error(`InteropFlow failed to get policy criteria: ${policyCriteriaError}`);
    }
    const relay = useTls ? new Relay(localRelayEndpoint, Relay.defaultTimeout, true, tlsRootCACertPaths) : new Relay(localRelayEndpoint);
    const uuidValue = uuidv4();
    // Step 3
    // TODO fix types here so can return proper view
    const [relayResponse, relayResponseError] = await helpers.handlePromise(
        relay.ProcessRequest(
            computedAddress,
            policyCriteria,
            networkID,
            keyCert.cert,
            Sign ? signMessage(computedAddress + uuidValue, keyCert.key.toBytes()) : "",
            uuidValue,
            // Org is empty as the name is in the certs for
            org,
            confidential,
        ),
    );
    if (relayResponseError) {
        throw new Error(`InteropFlow relay response error: ${relayResponseError}`);
    }
    // Step 4
    // Verify view to ensure it is valid before starting expensive WriteExternalState flow.
    const [, verifyError] = await helpers.handlePromise(
        verifyView(
            interopContract,
            Buffer.from(relayResponse.getView().serializeBinary()).toString("base64"),
            computedAddress,
        ),
    );
    if (verifyError) {
        throw new Error(`View verification failed ${verifyError}`);
    }
    return { view: relayResponse.getView(), address: computedAddress };
};

/**
 * Handles invoke for user and determines when the invoke should be an interop call
 * or a local invoke depending on the remoteJSON configuration provided. Will add the view response as the final arguement to the chaincode.
 **/
const invokeHandler = async (
    contract: Contract,
    networkID: string,
    org: string,
    invocationSpec: InvocationSpec,
    remoteJSON: RemoteJSON,
    keyCert: { key: ICryptoKey; cert: any },
): Promise<any> => {
    // If the function exists in the remoteJSON it will start the interop flow
    // Otherwise it will treat it as a nomral invoke function
    if (remoteJSON?.viewRequests?.[invocationSpec.ccFunc]) {
        return interopFlow(
            contract,
            networkID,
            invocationSpec,
            org,
            remoteJSON.LocalRelayEndpoint,
            remoteJSON.viewRequests[invocationSpec.ccFunc].invokeArgIndices,
            remoteJSON.viewRequests[invocationSpec.ccFunc].interopJSONs,
            keyCert,
        );
    }
    // Normal invoke function
    const [result, submitError] = await helpers.handlePromise(
        contract.submitTransaction(invocationSpec.ccFunc, ...invocationSpec.ccArgs),
    );
    if (submitError) {
        throw new Error(`submitTransaction Error: ${submitError}`);
    }
    return result;
};

/**
 * Get signatory node (Corda) from certificate
 **/
const getSignatoryNodeFromCertificate = async (certBase64: string) => {
    const cert = sshpk.parseCertificate(Buffer.from(certBase64, "base64"), "pem");
    if (!cert) {
        throw new Error("Unable to parse Corda certificate");
    }
    if (!cert.subjects || !(cert.subjects instanceof Array) || cert.subjects.length === 0) {
        throw new Error("No subject found in X.509 certificate");
    }
    // Filter out the Organization components ('O' attribute)
    const subjectComponents = cert.subjects[0].components.filter((subject) => subject.name === "o");
    if (!subjectComponents || subjectComponents.length === 0) {
        throw new Error("No subject found in X.509 certificate with 'O' (Organization) attribute");
    }
    return subjectComponents[0].value;
};

export {
    getSignatoryNodeFromCertificate,
    getKeyAndCertForRemoteRequestbyUserName,
    getPolicyCriteriaForAddress,
    verifyView,
    parseAndValidateView,
    decryptRemoteChaincodeOutput,
    decryptRemoteProposalResponse,
    verifyRemoteProposalResponse,
    verifyDecryptedRemoteProposalResponse,
    getResponseDataFromView,
    getEndorsementsAndSignatoriesFromFabricView,
    getEndorsementsAndSignatoriesFromCordaView,
    getSignatoryOrgMSPFromFabricEndorsementBase64,
    decodeView,
    signMessage,
    verifySignature,
    invokeHandler,
    interopFlow,
    getCCArgsForProofVerification,
    submitTransactionWithRemoteViews,
    getRemoteView,
    createFlowAddress,
    createAddress,
    decryptData
};
