import { fromBinary } from "@bufbuild/protobuf";
import { View, Meta_Protocol } from "../generated/protos/common/state_pb";
import { FabricViewSchema } from "../generated/protos/fabric/view_data_pb";
import { ViewDataSchema as CordaViewDataSchema } from "../generated/protos/corda/view_data_pb";
import { ChaincodeActionSchema } from "../generated/protos/peer/proposal_pb";
import {
  ConfidentialPayloadContentsSchema,
  ConfidentialPayloadSchema,
  InteropPayloadSchema,
} from "../generated/protos/common/interop_payload_pb";
import eciesCrypto from "./eciesCrypto.js";
import { KEYUTIL as keyutil } from "jsrsasign";

import crypto from "crypto";

/**
 * Sign a message using SHA256
 * message: string
 * privateKey: pem string
 * returns: signature in base64 string
 **/
export function signMessage(
  message: any,
  privateKey:
    | crypto.KeyLike
    | crypto.SignKeyObjectInput
    | crypto.SignPrivateKeyInput,
  algorithm: string = "SHA256",
) {
  const sign = crypto.createSign(algorithm);
  sign.write(message);
  sign.end();
  return sign.sign(privateKey).toString("base64");
}

/**
 * Extracts actual remote query response (along with full decrypted contents, if the response is encrypted) embedded in view structure.
 * Arguments are a View protobuf ('statePb.View') and a certificate in the form of a PEM string
 * TODO - Also take verification policy as parameter and determine if enough matching responses exist (current logic mandates unanimity among payloads)
 **/
const getResponseDataFromView = (view: View, privKeyPEM = null) => {
  if (view.meta?.protocol == Meta_Protocol.FABRIC) {
    const fabricView = fromBinary(FabricViewSchema, view.data);

    const fabricViewProposalResponses = fabricView.endorsedProposalResponses;

    let viewAddress = "";
    let responsePayload = "";
    const responsePayloadContents = [];
    let payloadConfidential = false;
    for (let i = 0; i < fabricViewProposalResponses.length; i++) {
      const fabricViewChaincodeAction = fromBinary(
        ChaincodeActionSchema,
        fabricViewProposalResponses[i].payload!.extension,
      );
      const interopPayload = fromBinary(
        InteropPayloadSchema,
        fabricViewChaincodeAction.response!.payload,
      );
      if (interopPayload.confidential) {
        // Currently this is only supported for Fabric because it uses ECDSA keys in wallets
        const confidentialPayload = fromBinary(
          ConfidentialPayloadSchema,
          interopPayload.payload,
        );
        const decryptedPayload = decryptData(
          Buffer.from(confidentialPayload.encryptedPayload).toString("base64"),
          privKeyPEM,
        );
        const decryptedPayloadContents = fromBinary(
          ConfidentialPayloadContentsSchema,
          Uint8Array.from(Buffer.from(decryptedPayload)),
        );

        if (i === 0) {
          viewAddress = interopPayload.address;
          responsePayload = Buffer.from(
            decryptedPayloadContents.payload,
          ).toString();
          payloadConfidential = true;
        } else if (!payloadConfidential) {
          throw new Error(
            `Mismatching payload confidentiality flags across proposal responses`,
          );
        } else {
          // Match view addresses in the different proposal responses
          if (viewAddress !== interopPayload.address) {
            throw new Error(
              `Proposal response view addresses mismatch: 0 - ${viewAddress}, ${i} - ${interopPayload.address}`,
            );
          }
          // Match decrypted view payloads from the different proposal responses
          const currentResponsePayload = Buffer.from(
            decryptedPayloadContents.payload,
          ).toString();
          if (responsePayload !== currentResponsePayload) {
            throw new Error(
              `Decrypted proposal response payloads mismatch: 0 - ${responsePayload}, ${i} - ${currentResponsePayload}`,
            );
          }
        }
        responsePayloadContents.push(decryptedPayload.toString("base64"));
      } else {
        if (i === 0) {
          viewAddress = interopPayload.address;
          responsePayload = Buffer.from(interopPayload.payload).toString();
          payloadConfidential = false;
        } else if (payloadConfidential) {
          throw new Error(
            `Mismatching payload confidentiality flags across proposal responses`,
          );
        } else {
          const currentResponsePayload = Buffer.from(
            interopPayload.payload,
          ).toString();
          if (responsePayload !== currentResponsePayload) {
            throw new Error(
              `Proposal response payloads mismatch: 0 - ${responsePayload}, ${i} - ${currentResponsePayload}`,
            );
          }
          if (viewAddress !== interopPayload.address) {
            throw new Error(
              `Proposal response view addresses mismatch: 0 - ${viewAddress}, ${i} - ${interopPayload.address}`,
            );
          }
        }
      }
    }
    if (payloadConfidential) {
      return {
        viewAddress: viewAddress,
        data: responsePayload,
        contents: responsePayloadContents,
      };
    } else {
      return { viewAddress: viewAddress, data: responsePayload };
    }
  } else if (view.meta?.protocol == Meta_Protocol.CORDA) {
    const cordaView = fromBinary(CordaViewDataSchema, view.data);
    const cordaNotarizedPayloads = cordaView.notarizedPayloads;
    let viewAddress = "";
    let responsePayload = "";
    const responsePayloadContents: any[] = [];
    let payloadConfidential = false;
    cordaNotarizedPayloads.forEach((notarizedPayload, i) => {
      const interopPayload = fromBinary(
        InteropPayloadSchema,
        notarizedPayload.payload,
      );
      responsePayloadContents.push(
        Buffer.from(interopPayload.payload).toString("base64"),
      );
      if (interopPayload.confidential) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const confidentialPayload = fromBinary(
          ConfidentialPayloadSchema,
          interopPayload.payload,
        );
        //TODO: Confidentiality in Corda
      } else {
        if (i === 0) {
          viewAddress = interopPayload.address;
          responsePayload = Buffer.from(interopPayload.payload).toString();
          payloadConfidential = false;
        } else if (payloadConfidential) {
          throw new Error(
            `Mismatching payload confidentiality flags across notarized payloads`,
          );
        } else {
          const currentResponsePayload = Buffer.from(
            interopPayload.payload,
          ).toString();
          if (responsePayload !== currentResponsePayload) {
            throw new Error(
              `Proposal response payloads mismatch: 0 - ${responsePayload}, ${i} - ${currentResponsePayload}`,
            );
          }
          if (viewAddress !== interopPayload.address) {
            throw new Error(
              `Proposal response view addresses mismatch: 0 - ${viewAddress}, ${i} - ${interopPayload.address}`,
            );
          }
        }
      }
    });
    if (payloadConfidential) {
      return {
        viewAddress: viewAddress,
        data: responsePayload,
        contents: responsePayloadContents,
      };
    } else {
      return { viewAddress: viewAddress, data: responsePayload };
    }
  } else {
    const protocolType = view.meta?.protocol;
    throw new Error(`Unsupported DLT type: ${protocolType}`);
  }
};

const decryptData = (dataBytes: string, eciesPrivateKeyPEM: any) => {
  // TODO Check getKeyFromPlainPrivatePKCS8PEM
  const privKey = keyutil.getKey(eciesPrivateKeyPEM, "PKCS8PRV");
  const decryptionOptions = { hashAlgorithm: "SHA2" };
  return eciesCrypto.eciesDecryptMessage(privKey, dataBytes, decryptionOptions);
};

export { getResponseDataFromView, decryptData };
