run-vendor:
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2=../../../../../common/protos-go/
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/assetexchange/v2=../../libs/assetexchange/
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/utils/v2=../../libs/utils/
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/testutils=../../libs/testutils/
	go mod vendor

undo-vendor:
	rm -rf vendor
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/assetexchange/v2
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/utils/v2
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/testutils

build-local: run-vendor build undo-vendor
	
test-local: run-vendor test undo-vendor
	
test-manage-assets-local: run-vendor test-manage-assets undo-vendor

build:
	go build -v .

test:
	go test -v .
	
test-manage-assets:
	go test manage_assets.go manage_assets_test.go main.go -v
	
clean:
	rm -rf vendor interop
