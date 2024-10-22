all: clean build

.PHONY: clean
clean:
	rm -rf ./bin
	rm -rf vendor

.PHONY: build
build:
	go build -o ./bin/fabric-cli fabric-cli.go

run-vendor:
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2=../../../common/protos-go/
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/sdks/fabric/go-sdk/v2=../../../sdks/fabric/go-sdk/
	go mod vendor

undo-vendor:
	rm -rf vendor
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/sdks/fabric/go-sdk/v2


.PHONY: build-local
build-local: clean run-vendor build undo-vendor