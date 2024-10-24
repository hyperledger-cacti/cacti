// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0
//
'use strict';
var grpc = require('@grpc/grpc-js');
var networks_networks_pb = require('../networks/networks_pb.js');
var common_ack_pb = require('../common/ack_pb.js');
var common_state_pb = require('../common/state_pb.js');
var common_events_pb = require('../common/events_pb.js');

function serialize_common_ack_Ack(arg) {
  if (!(arg instanceof common_ack_pb.Ack)) {
    throw new Error('Expected argument of type common.ack.Ack');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_ack_Ack(buffer_arg) {
  return common_ack_pb.Ack.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_common_events_EventStates(arg) {
  if (!(arg instanceof common_events_pb.EventStates)) {
    throw new Error('Expected argument of type common.events.EventStates');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_events_EventStates(buffer_arg) {
  return common_events_pb.EventStates.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_common_events_EventSubscriptionState(arg) {
  if (!(arg instanceof common_events_pb.EventSubscriptionState)) {
    throw new Error('Expected argument of type common.events.EventSubscriptionState');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_events_EventSubscriptionState(buffer_arg) {
  return common_events_pb.EventSubscriptionState.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_common_state_RequestState(arg) {
  if (!(arg instanceof common_state_pb.RequestState)) {
    throw new Error('Expected argument of type common.state.RequestState');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_state_RequestState(buffer_arg) {
  return common_state_pb.RequestState.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_networks_networks_DbName(arg) {
  if (!(arg instanceof networks_networks_pb.DbName)) {
    throw new Error('Expected argument of type networks.networks.DbName');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_networks_networks_DbName(buffer_arg) {
  return networks_networks_pb.DbName.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_networks_networks_GetStateMessage(arg) {
  if (!(arg instanceof networks_networks_pb.GetStateMessage)) {
    throw new Error('Expected argument of type networks.networks.GetStateMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_networks_networks_GetStateMessage(buffer_arg) {
  return networks_networks_pb.GetStateMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_networks_networks_NetworkAssetTransfer(arg) {
  if (!(arg instanceof networks_networks_pb.NetworkAssetTransfer)) {
    throw new Error('Expected argument of type networks.networks.NetworkAssetTransfer');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_networks_networks_NetworkAssetTransfer(buffer_arg) {
  return networks_networks_pb.NetworkAssetTransfer.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_networks_networks_NetworkEventSubscription(arg) {
  if (!(arg instanceof networks_networks_pb.NetworkEventSubscription)) {
    throw new Error('Expected argument of type networks.networks.NetworkEventSubscription');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_networks_networks_NetworkEventSubscription(buffer_arg) {
  return networks_networks_pb.NetworkEventSubscription.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_networks_networks_NetworkEventUnsubscription(arg) {
  if (!(arg instanceof networks_networks_pb.NetworkEventUnsubscription)) {
    throw new Error('Expected argument of type networks.networks.NetworkEventUnsubscription');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_networks_networks_NetworkEventUnsubscription(buffer_arg) {
  return networks_networks_pb.NetworkEventUnsubscription.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_networks_networks_NetworkQuery(arg) {
  if (!(arg instanceof networks_networks_pb.NetworkQuery)) {
    throw new Error('Expected argument of type networks.networks.NetworkQuery');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_networks_networks_NetworkQuery(buffer_arg) {
  return networks_networks_pb.NetworkQuery.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_networks_networks_RelayDatabase(arg) {
  if (!(arg instanceof networks_networks_pb.RelayDatabase)) {
    throw new Error('Expected argument of type networks.networks.RelayDatabase');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_networks_networks_RelayDatabase(buffer_arg) {
  return networks_networks_pb.RelayDatabase.deserializeBinary(new Uint8Array(buffer_arg));
}


// This service is the interface for how the network communicates with
// its relay.
var NetworkService = exports.NetworkService = {
  // Data Sharing endpoints
// endpoint for a network to request remote relay state via local relay
requestState: {
    path: '/networks.networks.Network/RequestState',
    requestStream: false,
    responseStream: false,
    requestType: networks_networks_pb.NetworkQuery,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_networks_networks_NetworkQuery,
    requestDeserialize: deserialize_networks_networks_NetworkQuery,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // This rpc endpoint is for polling the local relay for request state.
getState: {
    path: '/networks.networks.Network/GetState',
    requestStream: false,
    responseStream: false,
    requestType: networks_networks_pb.GetStateMessage,
    responseType: common_state_pb.RequestState,
    requestSerialize: serialize_networks_networks_GetStateMessage,
    requestDeserialize: deserialize_networks_networks_GetStateMessage,
    responseSerialize: serialize_common_state_RequestState,
    responseDeserialize: deserialize_common_state_RequestState,
  },
  // NOTE: This rpc is just for debugging.
requestDatabase: {
    path: '/networks.networks.Network/RequestDatabase',
    requestStream: false,
    responseStream: false,
    requestType: networks_networks_pb.DbName,
    responseType: networks_networks_pb.RelayDatabase,
    requestSerialize: serialize_networks_networks_DbName,
    requestDeserialize: deserialize_networks_networks_DbName,
    responseSerialize: serialize_networks_networks_RelayDatabase,
    responseDeserialize: deserialize_networks_networks_RelayDatabase,
  },
  // SATP endpoints
// endpoint for a network to request asset transfer to a receiving gateway via local gateway
requestAssetTransfer: {
    path: '/networks.networks.Network/RequestAssetTransfer',
    requestStream: false,
    responseStream: false,
    requestType: networks_networks_pb.NetworkAssetTransfer,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_networks_networks_NetworkAssetTransfer,
    requestDeserialize: deserialize_networks_networks_NetworkAssetTransfer,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // Event endpoints
// endpoint for a client to subscribe to event via local relay initiating subscription flow.
subscribeEvent: {
    path: '/networks.networks.Network/SubscribeEvent',
    requestStream: false,
    responseStream: false,
    requestType: networks_networks_pb.NetworkEventSubscription,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_networks_networks_NetworkEventSubscription,
    requestDeserialize: deserialize_networks_networks_NetworkEventSubscription,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // This rpc endpoint is for polling the local relay for subscription state.
getEventSubscriptionState: {
    path: '/networks.networks.Network/GetEventSubscriptionState',
    requestStream: false,
    responseStream: false,
    requestType: networks_networks_pb.GetStateMessage,
    responseType: common_events_pb.EventSubscriptionState,
    requestSerialize: serialize_networks_networks_GetStateMessage,
    requestDeserialize: deserialize_networks_networks_GetStateMessage,
    responseSerialize: serialize_common_events_EventSubscriptionState,
    responseDeserialize: deserialize_common_events_EventSubscriptionState,
  },
  // endpoint for a client to subscribe to event via local relay initiating subscription flow.
unsubscribeEvent: {
    path: '/networks.networks.Network/UnsubscribeEvent',
    requestStream: false,
    responseStream: false,
    requestType: networks_networks_pb.NetworkEventUnsubscription,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_networks_networks_NetworkEventUnsubscription,
    requestDeserialize: deserialize_networks_networks_NetworkEventUnsubscription,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // endpoint for a client to fetch received events. 
// Note: events are marked as deleted from relay database as soon as client fetches them.
getEventStates: {
    path: '/networks.networks.Network/GetEventStates',
    requestStream: false,
    responseStream: false,
    requestType: networks_networks_pb.GetStateMessage,
    responseType: common_events_pb.EventStates,
    requestSerialize: serialize_networks_networks_GetStateMessage,
    requestDeserialize: deserialize_networks_networks_GetStateMessage,
    responseSerialize: serialize_common_events_EventStates,
    responseDeserialize: deserialize_common_events_EventStates,
  },
};

exports.NetworkClient = grpc.makeGenericClientConstructor(NetworkService);
