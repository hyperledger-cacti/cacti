// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright IBM Corp. All Rights Reserved.
//
// SPDX-License-Identifier: Apache-2.0
//
'use strict';
var grpc = require('@grpc/grpc-js');
var common_ack_pb = require('../common/ack_pb.js');
var common_state_pb = require('../common/state_pb.js');
var common_query_pb = require('../common/query_pb.js');

function serialize_common_ack_Ack(arg) {
  if (!(arg instanceof common_ack_pb.Ack)) {
    throw new Error('Expected argument of type common.ack.Ack');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_ack_Ack(buffer_arg) {
  return common_ack_pb.Ack.deserializeBinary(new Uint8Array(buffer_arg));
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

function serialize_common_state_ViewPayload(arg) {
  if (!(arg instanceof common_state_pb.ViewPayload)) {
    throw new Error('Expected argument of type common.state.ViewPayload');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_common_state_ViewPayload(buffer_arg) {
  return common_state_pb.ViewPayload.deserializeBinary(new Uint8Array(buffer_arg));
}


// definitions of all messages used in the datatransfer protocol
var DataTransferService = exports.DataTransferService = {
  // the requesting relay sends a RequestState request to the remote relay with a
// query defining the data it wants to receive
requestState: {
    path: '/relay.datatransfer.DataTransfer/RequestState',
    requestStream: false,
    responseStream: false,
    requestType: common_query_pb.Query,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_common_query_Query,
    requestDeserialize: deserialize_common_query_Query,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // the remote relay asynchronously sends back the requested data with
// SendState
sendState: {
    path: '/relay.datatransfer.DataTransfer/SendState',
    requestStream: false,
    responseStream: false,
    requestType: common_state_pb.ViewPayload,
    responseType: common_ack_pb.Ack,
    requestSerialize: serialize_common_state_ViewPayload,
    requestDeserialize: deserialize_common_state_ViewPayload,
    responseSerialize: serialize_common_ack_Ack,
    responseDeserialize: deserialize_common_ack_Ack,
  },
  // Handling state sent from the driver.
sendDriverState: {
    path: '/relay.datatransfer.DataTransfer/SendDriverState',
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

exports.DataTransferClient = grpc.makeGenericClientConstructor(DataTransferService);
