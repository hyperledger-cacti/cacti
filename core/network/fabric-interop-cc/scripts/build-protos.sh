#!/bin/bash

protoc --proto_path=protos --proto_path=fabric-protos --go_out=contracts/interop/protos-go --go_opt=paths=source_relative protos/common/query.proto protos/common/ack.proto protos/common/proofs.proto protos/common/state.proto protos/corda/view_data.proto protos/fabric/view_data.proto protos/common/access_control.proto protos/common/membership.proto protos/common/verification_policy.proto protos/common/interop_payload.proto protos/common/asset_locks.proto
