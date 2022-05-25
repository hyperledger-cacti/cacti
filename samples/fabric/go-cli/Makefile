all: clean build

.PHONY: clean
clean:
	rm -rf ./bin
	rm -rf vendor

.PHONY: build
build: clean
	go build -o ./bin/fabric-cli fabric-cli.go

run-vendor:
	go mod vendor
	cp -r ../../../sdks/fabric/go-sdk/* vendor/github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk/

.PHONY: build-local
build-local: clean run-vendor build