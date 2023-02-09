run-vendor:
	go mod edit -replace github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go=../../../common/protos-go/
	go mod edit -replace github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/assetexchange=../../../core/network/fabric-interop-cc/libs/assetexchange/
	go mod edit -replace github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils=../../../core/network/fabric-interop-cc/libs/testutils/
	go mod vendor

undo-vendor:
	rm -rf vendor
	go mod edit -dropreplace github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go
	go mod edit -dropreplace github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/assetexchange
	go mod edit -dropreplace github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils

build-local: run-vendor build undo-vendor
	
test-local: run-vendor test undo-vendor

build:
	go build -v .

test:
	go test -v .

clean-vendor:
	rm -rf vendor

clean: clean-vendor
	rm simpleassetandinterop || true