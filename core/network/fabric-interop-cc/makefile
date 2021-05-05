.PHONY: build protos all clean

all: protos-local build

protos-local:
	echo "Calling update-protos script"
	./scripts/update-protos-local.sh
	echo "Generating go from protos"
	protoc --proto_path=protos --proto_path=fabric-protos --go_out=contracts/interop/protos-go --go_opt=paths=source_relative protos/common/query.proto protos/common/ack.proto protos/common/proofs.proto protos/common/state.proto protos/corda/view_data.proto protos/fabric/view_data.proto protos/common/access_control.proto protos/common/membership.proto protos/common/verification_policy.proto protos/common/interop_payload.proto protos/common/asset_locks.proto
	cp -r contracts/interop/protos-go interfaces/asset-mgmt/

protos:
	echo "Calling update-protos script"
	./scripts/update-protos.sh
	echo "Generating go from protos"
	protoc --proto_path=protos --proto_path=fabric-protos --go_out=contracts/interop/protos-go --go_opt=paths=source_relative protos/common/query.proto protos/common/ack.proto protos/common/proofs.proto protos/common/state.proto protos/corda/view_data.proto protos/fabric/view_data.proto protos/common/access_control.proto protos/common/membership.proto protos/common/verification_policy.proto protos/common/interop_payload.proto protos/common/asset_locks.proto
	cp -r contracts/interop/protos-go interfaces/asset-mgmt/
	
build:
	echo "Building chaincode binary"
	./scripts/build.sh
	
clean:
	rm -rf ./bin
