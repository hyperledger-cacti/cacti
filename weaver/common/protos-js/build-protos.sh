#!/bin/bash

# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

set -eu

BUILDDIR=./
PROTOSDIR=../protos
FABRIC_PROTOSDIR=../fabric-protos
TS_PLUGIN="$(yarn bin protoc-gen-ts)"

js_no_grpc() {
  yarn grpc_tools_node_protoc \
    --proto_path="$PROTOSDIR" \
    --proto_path="$FABRIC_PROTOSDIR" \
    --js_out=import_style=commonjs,binary:"$BUILDDIR" \
    "$@"
}

js_with_grpc() {
  yarn grpc_tools_node_protoc \
    --proto_path="$PROTOSDIR" \
    --proto_path="$FABRIC_PROTOSDIR" \
    --js_out=import_style=commonjs,binary:"$BUILDDIR" \
    --grpc_out=grpc_js:"$BUILDDIR" \
    "$@"
}

ts_no_grpc() {
  yarn grpc_tools_node_protoc \
    --plugin=protoc-gen-ts="$TS_PLUGIN" \
    --proto_path="$PROTOSDIR" \
    --proto_path="$FABRIC_PROTOSDIR" \
    --ts_out="$BUILDDIR" \
    "$@"
}

ts_with_grpc() {
  yarn grpc_tools_node_protoc \
    --plugin=protoc-gen-ts="$TS_PLUGIN" \
    --proto_path="$PROTOSDIR" \
    --proto_path="$FABRIC_PROTOSDIR" \
    --ts_out=grpc_js:"$BUILDDIR" \
    "$@"
}

# NodeJS Build
js_no_grpc \
  "$PROTOSDIR/common/interop_payload.proto" \
  "$PROTOSDIR/common/asset_locks.proto" \
  "$PROTOSDIR/common/asset_transfer.proto" \
  "$PROTOSDIR/common/ack.proto" \
  "$PROTOSDIR/common/query.proto" \
  "$PROTOSDIR/common/state.proto" \
  "$PROTOSDIR/common/proofs.proto" \
  "$PROTOSDIR/common/verification_policy.proto" \
  "$PROTOSDIR/common/membership.proto" \
  "$PROTOSDIR/common/access_control.proto" \
  "$PROTOSDIR/common/events.proto"

js_no_grpc \
  "$PROTOSDIR/corda/view_data.proto"

js_with_grpc \
  "$PROTOSDIR/driver/driver.proto"

js_no_grpc \
  "$PROTOSDIR/fabric/view_data.proto"

js_with_grpc \
  "$PROTOSDIR/identity/agent.proto"

js_with_grpc \
  "$PROTOSDIR/networks/networks.proto"

js_with_grpc \
  "$PROTOSDIR/relay/datatransfer.proto" \
  "$PROTOSDIR/relay/events.proto" \
  "$PROTOSDIR/relay/satp.proto"

js_no_grpc \
  "$FABRIC_PROTOSDIR/msp/identities.proto" \
  "$FABRIC_PROTOSDIR/peer/proposal_response.proto" \
  "$FABRIC_PROTOSDIR/peer/proposal.proto" \
  "$FABRIC_PROTOSDIR/peer/chaincode.proto" \
  "$FABRIC_PROTOSDIR/common/policies.proto" \
  "$FABRIC_PROTOSDIR/msp/msp_principal.proto"

# TypeScript Build
ts_no_grpc \
  "$PROTOSDIR/common/interop_payload.proto" \
  "$PROTOSDIR/common/asset_locks.proto" \
  "$PROTOSDIR/common/asset_transfer.proto" \
  "$PROTOSDIR/common/ack.proto" \
  "$PROTOSDIR/common/query.proto" \
  "$PROTOSDIR/common/state.proto" \
  "$PROTOSDIR/common/proofs.proto" \
  "$PROTOSDIR/common/verification_policy.proto" \
  "$PROTOSDIR/common/membership.proto" \
  "$PROTOSDIR/common/access_control.proto" \
  "$PROTOSDIR/common/events.proto"

ts_no_grpc \
  "$PROTOSDIR/corda/view_data.proto"

ts_with_grpc \
  "$PROTOSDIR/driver/driver.proto"

ts_no_grpc \
  "$PROTOSDIR/fabric/view_data.proto"

ts_with_grpc \
  "$PROTOSDIR/identity/agent.proto"

ts_with_grpc \
  "$PROTOSDIR/networks/networks.proto"

ts_with_grpc \
  "$PROTOSDIR/relay/datatransfer.proto" \
  "$PROTOSDIR/relay/events.proto" \
  "$PROTOSDIR/relay/satp.proto"

ts_no_grpc \
  "$FABRIC_PROTOSDIR/msp/identities.proto" \
  "$FABRIC_PROTOSDIR/peer/proposal_response.proto" \
  "$FABRIC_PROTOSDIR/peer/proposal.proto" \
  "$FABRIC_PROTOSDIR/peer/chaincode.proto" \
  "$FABRIC_PROTOSDIR/common/policies.proto" \
  "$FABRIC_PROTOSDIR/msp/msp_principal.proto"