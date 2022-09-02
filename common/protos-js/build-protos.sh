#!/bin/bash

BUILDDIR=./
PROTOSDIR=../protos
FABRIC_PROTOSDIR=../fabric-protos

# NodeJS Build
# Following build is without GRPC out, use this when no rpc services defined in proto.
grpc_tools_node_protoc --proto_path=$PROTOSDIR --proto_path=$FABRIC_PROTOSDIR  --js_out=import_style=commonjs,binary:$BUILDDIR --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` $PROTOSDIR/common/interop_payload.proto $PROTOSDIR/common/asset_locks.proto $PROTOSDIR/common/asset_transfer.proto $PROTOSDIR/common/ack.proto $PROTOSDIR/common/query.proto $PROTOSDIR/common/state.proto $PROTOSDIR/common/proofs.proto $PROTOSDIR/common/verification_policy.proto $PROTOSDIR/common/membership.proto $PROTOSDIR/common/access_control.proto $PROTOSDIR/common/events.proto
grpc_tools_node_protoc --proto_path=$PROTOSDIR --proto_path=$FABRIC_PROTOSDIR  --js_out=import_style=commonjs,binary:$BUILDDIR --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` $PROTOSDIR/corda/view_data.proto
# Following build is with GRPC out, use this to build rpc proto services.
grpc_tools_node_protoc --proto_path=$PROTOSDIR --proto_path=$FABRIC_PROTOSDIR  --js_out=import_style=commonjs,binary:$BUILDDIR --grpc_out=grpc_js:$BUILDDIR --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` $PROTOSDIR/driver/driver.proto
grpc_tools_node_protoc --proto_path=$PROTOSDIR --proto_path=$FABRIC_PROTOSDIR  --js_out=import_style=commonjs,binary:$BUILDDIR --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` $PROTOSDIR/fabric/view_data.proto
grpc_tools_node_protoc --proto_path=$PROTOSDIR --proto_path=$FABRIC_PROTOSDIR  --js_out=import_style=commonjs,binary:$BUILDDIR --grpc_out=grpc_js:$BUILDDIR --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` $PROTOSDIR/identity/agent.proto
grpc_tools_node_protoc --proto_path=$PROTOSDIR --proto_path=$FABRIC_PROTOSDIR  --js_out=import_style=commonjs,binary:$BUILDDIR --grpc_out=grpc_js:$BUILDDIR --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` $PROTOSDIR/networks/networks.proto
grpc_tools_node_protoc --proto_path=$PROTOSDIR --proto_path=$FABRIC_PROTOSDIR  --js_out=import_style=commonjs,binary:$BUILDDIR --grpc_out=grpc_js:$BUILDDIR --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` $PROTOSDIR/relay/datatransfer.proto $PROTOSDIR/relay/events.proto
grpc_tools_node_protoc --proto_path=$PROTOSDIR --proto_path=$FABRIC_PROTOSDIR  --js_out=import_style=commonjs,binary:$BUILDDIR --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` $FABRIC_PROTOSDIR/msp/identities.proto $FABRIC_PROTOSDIR/peer/proposal_response.proto $FABRIC_PROTOSDIR/peer/proposal.proto $FABRIC_PROTOSDIR/peer/chaincode.proto $FABRIC_PROTOSDIR/common/policies.proto $FABRIC_PROTOSDIR/msp/msp_principal.proto

# Typescript Build
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=$BUILDDIR -I $PROTOSDIR -I $FABRIC_PROTOSDIR $PROTOSDIR/common/interop_payload.proto $PROTOSDIR/common/asset_locks.proto $PROTOSDIR/common/asset_transfer.proto $PROTOSDIR/common/ack.proto $PROTOSDIR/common/query.proto $PROTOSDIR/common/state.proto $PROTOSDIR/common/proofs.proto $PROTOSDIR/common/verification_policy.proto $PROTOSDIR/common/membership.proto $PROTOSDIR/common/access_control.proto $PROTOSDIR/common/events.proto
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=$BUILDDIR -I $PROTOSDIR -I $FABRIC_PROTOSDIR $PROTOSDIR/corda/view_data.proto
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=$BUILDDIR -I $PROTOSDIR -I $FABRIC_PROTOSDIR $PROTOSDIR/driver/driver.proto
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=$BUILDDIR -I $PROTOSDIR -I $FABRIC_PROTOSDIR $PROTOSDIR/fabric/view_data.proto
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=$BUILDDIR -I $PROTOSDIR -I $FABRIC_PROTOSDIR $PROTOSDIR/identity/agent.proto
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=$BUILDDIR -I $PROTOSDIR -I $FABRIC_PROTOSDIR $PROTOSDIR/networks/networks.proto
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=$BUILDDIR -I $PROTOSDIR -I $FABRIC_PROTOSDIR $PROTOSDIR/relay/datatransfer.proto $PROTOSDIR/relay/events.proto
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=$BUILDDIR -I $PROTOSDIR -I $FABRIC_PROTOSDIR $FABRIC_PROTOSDIR/msp/identities.proto $FABRIC_PROTOSDIR/peer/proposal_response.proto $FABRIC_PROTOSDIR/peer/proposal.proto $FABRIC_PROTOSDIR/peer/chaincode.proto $FABRIC_PROTOSDIR/common/policies.proto $FABRIC_PROTOSDIR/msp/msp_principal.proto
