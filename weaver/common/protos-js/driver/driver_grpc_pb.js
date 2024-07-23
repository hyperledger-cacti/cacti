// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0
//
'use strict';
var grpc = require('@grpc/grpc-js');
var driver_driver_pb = require('../driver/driver_pb.js');
var common_ack_pb = require('../common/ack_pb.js');
var common_query_pb = require('../common/query_pb.js');
var common_events_pb = require('../common/events_pb.js');
var common_state_pb = require('../common/state_pb.js');

function serialize_common_ack_Ack(arg) {
  if (!(arg instanceof common_ack_pb.Ack)) {
    throw new Error('Expected argument of type common.ack.Ack');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_ack_Ack(buffer_arg) {
  return common_ack_pb.Ack.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_common_events_EventSubscription(arg) {
  if (!(arg instanceof common_events_pb.EventSubscription)) {
    throw new Error('Expected argument of type common.events.EventSubscription');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_events_EventSubscription(buffer_arg) {
  return common_events_pb.EventSubscription.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_common_query_Query(arg) {
  if (!(arg instanceof common_query_pb.Query)) {
    throw new Error('Expected argument of type common.query.Query');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_query_Query(buffer_arg) {
  return common_query_pb.Query.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_driver_driver_AssignAssetRequest(arg) {
  if (!(arg instanceof driver_driver_pb.AssignAssetRequest)) {
    throw new Error('Expected argument of type driver.driver.AssignAssetRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_driver_driver_AssignAssetRequest(buffer_arg) {
  return driver_driver_pb.AssignAssetRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_driver_driver_CreateAssetRequest(arg) {
  if (!(arg instanceof driver_driver_pb.CreateAssetRequest)) {
    throw new Error('Expected argument of type driver.driver.CreateAssetRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_driver_driver_CreateAssetRequest(buffer_arg) {
  return driver_driver_pb.CreateAssetRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_driver_driver_ExtinguishRequest(arg) {
  if (!(arg instanceof driver_driver_pb.ExtinguishRequest)) {
    throw new Error('Expected argument of type driver.driver.ExtinguishRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_driver_driver_ExtinguishRequest(buffer_arg) {
  return driver_driver_pb.ExtinguishRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_driver_driver_PerformLockRequest(arg) {
  if (!(arg instanceof driver_driver_pb.PerformLockRequest)) {
    throw new Error('Expected argument of type driver.driver.PerformLockRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_driver_driver_PerformLockRequest(buffer_arg) {
  return driver_driver_pb.PerformLockRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_driver_driver_WriteExternalStateMessage(arg) {
  if (!(arg instanceof driver_driver_pb.WriteExternalStateMessage)) {
    throw new Error('Expected argument of type driver.driver.WriteExternalStateMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_driver_driver_WriteExternalStateMessage(buffer_arg) {
  return driver_driver_pb.WriteExternalStateMessage.deserializeBinary(new Uint8Array(buffer_arg));
}


var DriverCommunicationService = exports.DriverCommunicationService = {
  // Data Sharing 
// the remote relay sends a RequestDriverState request to its driver with a
// query defining the data it wants to receive
requestDriverState: {
    path: '/driver.driver.DriverCommunication/RequestDriverState',
    requestStream: false,
    responseStream: false,
    requestType: common_query_pb.Query,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_common_query_Query,
    requestDeserialize: deserialize_common_query_Query,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // Events Subscription
// the src-relay uses this endpoint to forward the event subscription request from dest-relay to driver
subscribeEvent: {
    path: '/driver.driver.DriverCommunication/SubscribeEvent',
    requestStream: false,
    responseStream: false,
    requestType: common_events_pb.EventSubscription,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_common_events_EventSubscription,
    requestDeserialize: deserialize_common_events_EventSubscription,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // Recommended to have TLS mode on for this unsafe endpoint
// Relay uses this to get Query.requestor_signature and 
// Query.certificate required for event subscription
requestSignedEventSubscriptionQuery: {
    path: '/driver.driver.DriverCommunication/RequestSignedEventSubscriptionQuery',
    requestStream: false,
    responseStream: false,
    requestType: common_events_pb.EventSubscription,
    responseType: common_query_pb.Query,
    requestSerialize: serialize_common_events_EventSubscription,
    requestDeserialize: deserialize_common_events_EventSubscription,
    responseSerialize: serialize_common_query_Query,
    responseDeserialize: deserialize_common_query_Query,
  },
  // Events Publication
// the dest-relay calls the dest-driver on this end point to write the remote network state to the local ledger
writeExternalState: {
    path: '/driver.driver.DriverCommunication/WriteExternalState',
    requestStream: false,
    responseStream: false,
    requestType: driver_driver_pb.WriteExternalStateMessage,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_driver_driver_WriteExternalStateMessage,
    requestDeserialize: deserialize_driver_driver_WriteExternalStateMessage,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // As part of SATP, the source reply (sender gateway) sends a PerformLock request to its driver
// to lock a specific asset
performLock: {
    path: '/driver.driver.DriverCommunication/PerformLock',
    requestStream: false,
    responseStream: false,
    requestType: driver_driver_pb.PerformLockRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_driver_driver_PerformLockRequest,
    requestDeserialize: deserialize_driver_driver_PerformLockRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // As part of SATP, the destination reply (receiver gateway) sends a CreateAsset request to its driver
// to create a specific asset
createAsset: {
    path: '/driver.driver.DriverCommunication/CreateAsset',
    requestStream: false,
    responseStream: false,
    requestType: driver_driver_pb.CreateAssetRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_driver_driver_CreateAssetRequest,
    requestDeserialize: deserialize_driver_driver_CreateAssetRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // As part of SATP, the source reply (sender gateway) sends a Extinguish request to its driver
// to extinguish a specific asset
extinguish: {
    path: '/driver.driver.DriverCommunication/Extinguish',
    requestStream: false,
    responseStream: false,
    requestType: driver_driver_pb.ExtinguishRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_driver_driver_ExtinguishRequest,
    requestDeserialize: deserialize_driver_driver_ExtinguishRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // As part of SATP, the destination reply (receiver gateway) sends a AssignAsset request to its driver
// to assign a specific asset
assignAsset: {
    path: '/driver.driver.DriverCommunication/AssignAsset',
    requestStream: false,
    responseStream: false,
    requestType: driver_driver_pb.AssignAssetRequest,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_driver_driver_AssignAssetRequest,
    requestDeserialize: deserialize_driver_driver_AssignAssetRequest,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
};

exports.DriverCommunicationClient = grpc.makeGenericClientConstructor(DriverCommunicationService);
