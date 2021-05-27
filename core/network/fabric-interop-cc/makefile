.PHONY: build protos all clean

all: protos-local build

protos-local:
	echo "Calling update-protos script"
	./scripts/update-protos-local.sh
	echo "Generating go from protos"
	./scripts/build-protos.sh
	cp -r contracts/interop/protos-go interfaces/asset-mgmt/

protos:
	echo "Calling update-protos script"
	./scripts/update-protos.sh
	echo "Generating go from protos"
	./scripts/build-protos.sh
	cp -r contracts/interop/protos-go interfaces/asset-mgmt/

build:
	echo "Building chaincode binary"
	./scripts/build.sh

clean:
	rm -rf ./bin
