// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0
//
'use strict';
var grpc = require('@grpc/grpc-js');
var common_ack_pb = require('../common/ack_pb.js');
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

function serialize_common_state_ViewPayload(arg) {
  if (!(arg instanceof common_state_pb.ViewPayload)) {
    throw new Error('Expected argument of type common.state.ViewPayload');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_state_ViewPayload(buffer_arg) {
  return common_state_pb.ViewPayload.deserializeBinary(new Uint8Array(buffer_arg));
}


var EventSubscribeService = exports.EventSubscribeService = {
  // the dest-relay forwards the request from client as EventSubscription to the src-relay
subscribeEvent: {
    path: '/relay.events.EventSubscribe/SubscribeEvent',
    requestStream: false,
    responseStream: false,
    requestType: common_events_pb.EventSubscription,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_common_events_EventSubscription,
    requestDeserialize: deserialize_common_events_EventSubscription,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // Src-relay based upon query (EventSubscription) forwards the same response (Ack) 
// from driver to the dest-relay by calling a new endpoint in dest-relay
sendSubscriptionStatus: {
    path: '/relay.events.EventSubscribe/SendSubscriptionStatus',
    requestStream: false,
    responseStream: false,
    requestType: common_ack_pb.Ack,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_common_ack_Ack,
    requestDeserialize: deserialize_common_ack_Ack,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // Src-driver status of event subscription (Ack) 
// to the src-relay by calling a new endpoint in src-relay
sendDriverSubscriptionStatus: {
    path: '/relay.events.EventSubscribe/SendDriverSubscriptionStatus',
    requestStream: false,
    responseStream: false,
    requestType: common_ack_pb.Ack,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_common_ack_Ack,
    requestDeserialize: deserialize_common_ack_Ack,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
};

exports.EventSubscribeClient = grpc.makeGenericClientConstructor(EventSubscribeService);
var EventPublishService = exports.EventPublishService = {
  // src-driver forwards the state as part of event subscription to src-relay
sendDriverState: {
    path: '/relay.events.EventPublish/SendDriverState',
    requestStream: false,
    responseStream: false,
    requestType: common_state_pb.ViewPayload,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_common_state_ViewPayload,
    requestDeserialize: deserialize_common_state_ViewPayload,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // src-relay will forward the state as part of event subscription to dest-relay
sendState: {
    path: '/relay.events.EventPublish/SendState',
    requestStream: false,
    responseStream: false,
    requestType: common_state_pb.ViewPayload,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_common_state_ViewPayload,
    requestDeserialize: deserialize_common_state_ViewPayload,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
};

exports.EventPublishClient = grpc.makeGenericClientConstructor(EventPublishService);
