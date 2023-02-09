run-vendor:
	go mod edit -replace github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go=../../../common/protos-go/
	go mod vendor

undo-vendor:
	rm -rf vendor
	go mod edit -dropreplace github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go

build-local: run-vendor build undo-vendor

build:
	go build -v .

clean:
	rm -rf vendor