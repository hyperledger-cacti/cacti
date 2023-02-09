/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const fabproto6 = require("fabric-protos");

// Input parameter: 'peer.Proposal' protobuf in bytes
const deserializeRemoteProposal = (proposalBytes) => fabproto6.protos.Proposal.decode(proposalBytes);

// Input parameter: 'peer.ProposalResponse' protobuf in bytes
const deserializeRemoteProposalResponse = (proposalResponseBytes) =>
    fabproto6.protos.ProposalResponse.decode(proposalResponseBytes);

// Input parameter: 'peer.Proposal' protobuf encoded in Hex
const deserializeRemoteProposalHex = (proposalBytesHex) =>
    fabproto6.protos.Proposal.decode(Buffer.from(proposalBytesHex, "hex"));

// Input parameter: 'peer.ProposalResponse' protobuf encoded in Hex
const deserializeRemoteProposalResponseHex = (proposalResponseBytesHex) =>
    fabproto6.protos.ProposalResponse.decode(Buffer.from(proposalResponseBytesHex, "hex"));

// Input parameter: 'peer.Proposal' protobuf encoded in Base64
const deserializeRemoteProposalBase64 = (proposalBytes64) =>
    fabproto6.protos.Proposal.decode(Buffer.from(proposalBytes64, "base64"));

// Input parameter: 'peer.ProposalResponse' protobuf encoded in Base64
const deserializeRemoteProposalResponseBase64 = (proposalResponseBytes64) =>
    fabproto6.protos.ProposalResponse.decode(Buffer.from(proposalResponseBytes64, "base64"));

// Input parameter: 'peer.ProposalResponse' protobuf structure
const serializeRemoteProposalResponse = (proposalResponse) =>
    fabproto6.protos.ProposalResponse.encode(proposalResponse).finish();

module.exports = {
    deserializeRemoteProposal,
    deserializeRemoteProposalResponse,
    deserializeRemoteProposalHex,
    deserializeRemoteProposalResponseHex,
    deserializeRemoteProposalBase64,
    deserializeRemoteProposalResponseBase64,
    serializeRemoteProposalResponse,
};
