// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0
//
'use strict';
var grpc = require('@grpc/grpc-js');
var identity_agent_pb = require('../identity/agent_pb.js');
var common_ack_pb = require('../common/ack_pb.js');

function serialize_common_ack_Ack(arg) {
  if (!(arg instanceof common_ack_pb.Ack)) {
    throw new Error('Expected argument of type common.ack.Ack');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_ack_Ack(buffer_arg) {
  return common_ack_pb.Ack.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_identity_agent_AttestedMembership(arg) {
  if (!(arg instanceof identity_agent_pb.AttestedMembership)) {
    throw new Error('Expected argument of type identity.agent.AttestedMembership');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_identity_agent_AttestedMembership(buffer_arg) {
  return identity_agent_pb.AttestedMembership.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_identity_agent_CounterAttestedMembership(arg) {
  if (!(arg instanceof identity_agent_pb.CounterAttestedMembership)) {
    throw new Error('Expected argument of type identity.agent.CounterAttestedMembership');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_identity_agent_CounterAttestedMembership(buffer_arg) {
  return identity_agent_pb.CounterAttestedMembership.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_identity_agent_SecurityDomainMemberIdentity(arg) {
  if (!(arg instanceof identity_agent_pb.SecurityDomainMemberIdentity)) {
    throw new Error('Expected argument of type identity.agent.SecurityDomainMemberIdentity');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_identity_agent_SecurityDomainMemberIdentity(buffer_arg) {
  return identity_agent_pb.SecurityDomainMemberIdentity.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_identity_agent_SecurityDomainMemberIdentityRequest(arg) {
  if (!(arg instanceof identity_agent_pb.SecurityDomainMemberIdentityRequest)) {
    throw new Error('Expected argument of type identity.agent.SecurityDomainMemberIdentityRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_identity_agent_SecurityDomainMemberIdentityRequest(buffer_arg) {
  return identity_agent_pb.SecurityDomainMemberIdentityRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


// definitions of all messages used in the datatransfer protocol
var IINAgentService = exports.IINAgentService = {
  // user or agent triggers a sync of external/foreign network unit's state
syncExternalState: {
    path: '/identity.agent.IINAgent/SyncExternalState',
    requestStream: false,
    responseStream: false,
    requestType: identity_agent_pb.SecurityDomainMemberIdentity,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_identity_agent_SecurityDomainMemberIdentity,
    requestDeserialize: deserialize_identity_agent_SecurityDomainMemberIdentity,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // Requesting network unit's state from a foreign IIN agent.
requestIdentityConfiguration: {
    path: '/identity.agent.IINAgent/RequestIdentityConfiguration',
    requestStream: false,
    responseStream: false,
    requestType: identity_agent_pb.SecurityDomainMemberIdentityRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_identity_agent_SecurityDomainMemberIdentityRequest,
    requestDeserialize: deserialize_identity_agent_SecurityDomainMemberIdentityRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // Handling network unit's state sent by a foreign IIN agent.
sendIdentityConfiguration: {
    path: '/identity.agent.IINAgent/SendIdentityConfiguration',
    requestStream: false,
    responseStream: false,
    requestType: identity_agent_pb.AttestedMembership,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_identity_agent_AttestedMembership,
    requestDeserialize: deserialize_identity_agent_AttestedMembership,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // Requesting attestation from a local IIN agent.
requestAttestation: {
    path: '/identity.agent.IINAgent/RequestAttestation',
    requestStream: false,
    responseStream: false,
    requestType: identity_agent_pb.CounterAttestedMembership,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_identity_agent_CounterAttestedMembership,
    requestDeserialize: deserialize_identity_agent_CounterAttestedMembership,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // Handling attestation sent by a local IIN agent.
sendAttestation: {
    path: '/identity.agent.IINAgent/SendAttestation',
    requestStream: false,
    responseStream: false,
    requestType: identity_agent_pb.CounterAttestedMembership,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_identity_agent_CounterAttestedMembership,
    requestDeserialize: deserialize_identity_agent_CounterAttestedMembership,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
};

exports.IINAgentClient = grpc.makeGenericClientConstructor(IINAgentService);
