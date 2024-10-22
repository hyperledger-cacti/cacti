run-vendor:
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2=../../../common/protos-go/
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/utils/v2=../../../core/network/fabric-interop-cc/libs/utils/
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/testutils=../../../core/network/fabric-interop-cc/libs/testutils/
	go mod vendor

undo-vendor:
	rm -rf vendor
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/utils/v2
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/testutils 
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2 

build-local: run-vendor build undo-vendor

test-local: run-vendor test undo-vendor

build:
	go build -v .

test:
	go test -v .

clean-vendor:
	rm -rf vendor
clean: clean-vendor
	rm -rf simplestate
