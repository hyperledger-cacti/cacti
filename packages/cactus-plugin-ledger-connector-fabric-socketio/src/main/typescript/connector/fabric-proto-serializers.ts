/*
 * Copyright 2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * fabric-proto-serializers.js
 *
 * Helper utils that are used to serialize and deserialize hyperledger fabric structures
 * so they can be safely sent through the wire. Depends heavily on protobuf specifications from
 * fabric packages.
 */

import Client from "fabric-client";
import { cloneDeep } from "lodash";

// TS import is using newer protobufjs version typings, use nodejs import for now.
const protobuf = require("protobufjs");

//////////////////////////////////
// Helper Functions
//////////////////////////////////

/**
 * Load protobuf definition from fabric module
 * @param protoFilePath module name and relative path to protofile to open
 * @returns protofile builder object (response of `protobuf.loadProtoFile()`)
 */
function loadFabricProto(protoFilePath: string) {
  const fabricModuleProtoPath = require.resolve(protoFilePath);
  return protobuf.loadProtoFile(fabricModuleProtoPath).build();
}

/**
 * Some Fabric SDK functions does not work well with protobuf decoded object type (Message).
 * Also, nested `ByteBuffer` are not unwrapped by top-level decode call, this function will do it manually.
 *
 * @param messageObject - Message produced by protobuf decode call
 * @returns Parsed `messageObject` without any nested `ByteBuffer`, that can be safely used by fabric-sdk methods.
 */
function convertToPlainObject(messageObject: Record<string, any>) {
  let plainObject: Record<string, any> = {};

  for (let i in messageObject) {
    if (messageObject.hasOwnProperty(i)) {
      const currentElem = messageObject[i];

      if (currentElem instanceof protobuf.ByteBuffer) {
        // Convert ByteBuffer fields to nodejs Buffer type.
        plainObject[i] = currentElem.toBuffer();
      } else if (
        typeof currentElem === "object" &&
        !Array.isArray(currentElem) &&
        currentElem !== null
      ) {
        // Convert each other nested objects as well.
        plainObject[i] = convertToPlainObject(currentElem);
      } else {
        // Copy scalar fields as is
        plainObject[i] = currentElem;
      }
    }
  }

  return plainObject;
}

/**
 * Encode some metadata to the message that will be sent to client app.
 *
 * @param typeName Name of the type we serialied.
 * @param encodedData Serialized object representation.
 * @returns JSON with metadata included.
 */
function encodeMetdata(typeName: string, encodedData: string): string {
  return JSON.stringify({
    metadata: {
      typeName,
    },
    encodedData: encodedData,
  });
}

/**
 * Decode the message, read and validate metadata attached to this message.
 *
 * @param typeName Name of the type wa want to deserialize.
 * @param encodedMessage Message received from the client.
 * @returns Encoded object without metadata.
 */
function decodeMetdata(typeName: string, encodedMessage: string): string {
  const { metadata, encodedData } = JSON.parse(encodedMessage);

  // Check metadata
  if (metadata.typeName !== typeName) {
    throw new Error(
      `decodeMetdata(): requested type mismatch. Wanted to decode: ${typeName}, received: ${metadata.typeName}`,
    );
  }

  return encodedData;
}

//////////////////////////////////
// Serializers
//////////////////////////////////

// Protobuf builders
const proposalBuilder = loadFabricProto(
  "fabric-client/lib/protos/peer/proposal.proto",
);
const proposalResponseBuilder = loadFabricProto(
  "fabric-client/lib/protos/peer/proposal_response.proto",
);

/**
 * Client.Proposal serializers
 */
export namespace ProposalSerializer {
  export const ProposalType = proposalBuilder.protos.Proposal;
  const proposalTypeName = ProposalType["$type"].name;

  export function encode(proposal: Client.Proposal): string {
    return encodeMetdata(proposalTypeName, (proposal as any).encodeJSON());
  }

  export function decode(encodedProposal: string): Client.Proposal {
    return ProposalType.decodeJSON(
      decodeMetdata(proposalTypeName, encodedProposal),
    );
  }
}

/**
 * Client.ProposalResponse serializers
 */
export namespace ProposalResponseSerializer {
  export const ProposalResponseType =
    proposalResponseBuilder.protos.ProposalResponse;
  const proposalResponseTypeName = ProposalResponseType["$type"].name;

  export function encode(proposalResponse: Client.ProposalResponse): string {
    let proposalResponseCopy = cloneDeep(proposalResponse) as Record<
      string,
      any
    >;

    // Peer is not part of protobuf definition, remove it.
    delete proposalResponseCopy.peer;

    let proposalResponseMessage = new ProposalResponseType(
      proposalResponseCopy,
    );
    const encodedProposalResponse = proposalResponseMessage.encodeJSON();
    return encodeMetdata(proposalResponseTypeName, encodedProposalResponse);
  }

  export function decode(encodedProposalResponse: string) {
    let decodedProposalResponse = ProposalResponseType.decodeJSON(
      decodeMetdata(proposalResponseTypeName, encodedProposalResponse),
    );
    return convertToPlainObject(decodedProposalResponse);
  }
}
