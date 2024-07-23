// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var relay_satp_pb = require('../relay/satp_pb.js');
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

function serialize_relay_satp_AckCommenceRequest(arg) {
  if (!(arg instanceof relay_satp_pb.AckCommenceRequest)) {
    throw new Error('Expected argument of type relay.satp.AckCommenceRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_AckCommenceRequest(buffer_arg) {
  return relay_satp_pb.AckCommenceRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_relay_satp_AckFinalReceiptRequest(arg) {
  if (!(arg instanceof relay_satp_pb.AckFinalReceiptRequest)) {
    throw new Error('Expected argument of type relay.satp.AckFinalReceiptRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_AckFinalReceiptRequest(buffer_arg) {
  return relay_satp_pb.AckFinalReceiptRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_relay_satp_CommitFinalAssertionRequest(arg) {
  if (!(arg instanceof relay_satp_pb.CommitFinalAssertionRequest)) {
    throw new Error('Expected argument of type relay.satp.CommitFinalAssertionRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_CommitFinalAssertionRequest(buffer_arg) {
  return relay_satp_pb.CommitFinalAssertionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_relay_satp_CommitPrepareRequest(arg) {
  if (!(arg instanceof relay_satp_pb.CommitPrepareRequest)) {
    throw new Error('Expected argument of type relay.satp.CommitPrepareRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_CommitPrepareRequest(buffer_arg) {
  return relay_satp_pb.CommitPrepareRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_relay_satp_CommitReadyRequest(arg) {
  if (!(arg instanceof relay_satp_pb.CommitReadyRequest)) {
    throw new Error('Expected argument of type relay.satp.CommitReadyRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_CommitReadyRequest(buffer_arg) {
  return relay_satp_pb.CommitReadyRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_relay_satp_LockAssertionReceiptRequest(arg) {
  if (!(arg instanceof relay_satp_pb.LockAssertionReceiptRequest)) {
    throw new Error('Expected argument of type relay.satp.LockAssertionReceiptRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_LockAssertionReceiptRequest(buffer_arg) {
  return relay_satp_pb.LockAssertionReceiptRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_relay_satp_LockAssertionRequest(arg) {
  if (!(arg instanceof relay_satp_pb.LockAssertionRequest)) {
    throw new Error('Expected argument of type relay.satp.LockAssertionRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_LockAssertionRequest(buffer_arg) {
  return relay_satp_pb.LockAssertionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_relay_satp_SendAssetStatusRequest(arg) {
  if (!(arg instanceof relay_satp_pb.SendAssetStatusRequest)) {
    throw new Error('Expected argument of type relay.satp.SendAssetStatusRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_SendAssetStatusRequest(buffer_arg) {
  return relay_satp_pb.SendAssetStatusRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_relay_satp_TransferCommenceRequest(arg) {
  if (!(arg instanceof relay_satp_pb.TransferCommenceRequest)) {
    throw new Error('Expected argument of type relay.satp.TransferCommenceRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_TransferCommenceRequest(buffer_arg) {
  return relay_satp_pb.TransferCommenceRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_relay_satp_TransferCompletedRequest(arg) {
  if (!(arg instanceof relay_satp_pb.TransferCompletedRequest)) {
    throw new Error('Expected argument of type relay.satp.TransferCompletedRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_TransferCompletedRequest(buffer_arg) {
  return relay_satp_pb.TransferCompletedRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_relay_satp_TransferProposalClaimsRequest(arg) {
  if (!(arg instanceof relay_satp_pb.TransferProposalClaimsRequest)) {
    throw new Error('Expected argument of type relay.satp.TransferProposalClaimsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_TransferProposalClaimsRequest(buffer_arg) {
  return relay_satp_pb.TransferProposalClaimsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_relay_satp_TransferProposalReceiptRequest(arg) {
  if (!(arg instanceof relay_satp_pb.TransferProposalReceiptRequest)) {
    throw new Error('Expected argument of type relay.satp.TransferProposalReceiptRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_relay_satp_TransferProposalReceiptRequest(buffer_arg) {
  return relay_satp_pb.TransferProposalReceiptRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var SATPService = exports.SATPService = {
  // The sender gateway sends a TransferProposalClaims request to initiate an asset transfer. 
// Depending on the proposal, multiple rounds of communication between the two gateways may happen.
transferProposalClaims: {
    path: '/relay.satp.SATP/TransferProposalClaims',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.TransferProposalClaimsRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_TransferProposalClaimsRequest,
    requestDeserialize: deserialize_relay_satp_TransferProposalClaimsRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // The sender gateway sends a TransferProposalClaims request to signal to the receiver gateway 
// that the it is ready to start the transfer of the digital asset
transferProposalReceipt: {
    path: '/relay.satp.SATP/TransferProposalReceipt',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.TransferProposalReceiptRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_TransferProposalReceiptRequest,
    requestDeserialize: deserialize_relay_satp_TransferProposalReceiptRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // The sender gateway sends a TransferCommence request to signal to the receiver gateway 
// that the it is ready to start the transfer of the digital asset
transferCommence: {
    path: '/relay.satp.SATP/TransferCommence',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.TransferCommenceRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_TransferCommenceRequest,
    requestDeserialize: deserialize_relay_satp_TransferCommenceRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // The receiver gateway sends a AckCommence request to the sender gateway to indicate agreement
// to proceed with the asset transfe
ackCommence: {
    path: '/relay.satp.SATP/AckCommence',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.AckCommenceRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_AckCommenceRequest,
    requestDeserialize: deserialize_relay_satp_AckCommenceRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // Stage 2 endpoints
//
sendAssetStatus: {
    path: '/relay.satp.SATP/SendAssetStatus',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.SendAssetStatusRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_SendAssetStatusRequest,
    requestDeserialize: deserialize_relay_satp_SendAssetStatusRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // The sender gateway sends a LockAssertion request to convey a signed claim to the receiver gateway 
// declaring that the asset in question has been locked or escrowed by the sender gateway in
// the origin network (e.g. to prevent double spending)
lockAssertion: {
    path: '/relay.satp.SATP/LockAssertion',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.LockAssertionRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_LockAssertionRequest,
    requestDeserialize: deserialize_relay_satp_LockAssertionRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // The receiver gateway sends a LockAssertionReceipt request to the sender gateway to indicate acceptance
// of the claim(s) delivered by the sender gateway in the previous message
lockAssertionReceipt: {
    path: '/relay.satp.SATP/LockAssertionReceipt',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.LockAssertionReceiptRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_LockAssertionReceiptRequest,
    requestDeserialize: deserialize_relay_satp_LockAssertionReceiptRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  commitPrepare: {
    path: '/relay.satp.SATP/CommitPrepare',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.CommitPrepareRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_CommitPrepareRequest,
    requestDeserialize: deserialize_relay_satp_CommitPrepareRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  commitReady: {
    path: '/relay.satp.SATP/CommitReady',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.CommitReadyRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_CommitReadyRequest,
    requestDeserialize: deserialize_relay_satp_CommitReadyRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  commitFinalAssertion: {
    path: '/relay.satp.SATP/CommitFinalAssertion',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.CommitFinalAssertionRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_CommitFinalAssertionRequest,
    requestDeserialize: deserialize_relay_satp_CommitFinalAssertionRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  ackFinalReceipt: {
    path: '/relay.satp.SATP/AckFinalReceipt',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.AckFinalReceiptRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_AckFinalReceiptRequest,
    requestDeserialize: deserialize_relay_satp_AckFinalReceiptRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  transferCompleted: {
    path: '/relay.satp.SATP/TransferCompleted',
    requestStream: false,
    responseStream: false,
    requestType: relay_satp_pb.TransferCompletedRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_relay_satp_TransferCompletedRequest,
    requestDeserialize: deserialize_relay_satp_TransferCompletedRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
};

exports.SATPClient = grpc.makeGenericClientConstructor(SATPService);
// Stage 1 endpoints
