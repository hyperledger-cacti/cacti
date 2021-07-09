#!/bin/bash

BUILDDIR=./
PROTOSDIR=./tmp/protos
FABRIC_PROTOSDIR=./tmp/fabric-protos

protoc --proto_path=$PROTOSDIR --proto_path=$FABRIC_PROTOSDIR --go_out=$BUILDDIR --go_opt=paths=source_relative $PROTOSDIR/common/query.proto $PROTOSDIR/common/ack.proto $PROTOSDIR/common/proofs.proto $PROTOSDIR/common/state.proto $PROTOSDIR/corda/view_data.proto $PROTOSDIR/fabric/view_data.proto $PROTOSDIR/common/access_control.proto $PROTOSDIR/common/membership.proto $PROTOSDIR/common/verification_policy.proto $PROTOSDIR/common/interop_payload.proto $PROTOSDIR/common/asset_locks.proto $PROTOSDIR/networks/networks.proto $PROTOSDIR/relay/datatransfer.proto $PROTOSDIR/driver/driver.proto
