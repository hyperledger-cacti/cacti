all: clean build

.PHONY: clean
clean:
	rm -rf ./bin
	rm -rf vendor

.PHONY: build
build:
	go build -o ./bin/fabric-cli fabric-cli.go

run-vendor:
	go mod edit -replace github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go=../../../common/protos-go/
	go mod edit -replace github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk=../../../sdks/fabric/go-sdk/
	go mod vendor

undo-vendor:
	rm -rf vendor
	go mod edit -dropreplace github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go
	go mod edit -dropreplace github.com/hyperledger-labs/weaver-dlt-interoperability/sdks/fabric/go-sdk


.PHONY: build-local
build-local: clean run-vendor build undo-vendor