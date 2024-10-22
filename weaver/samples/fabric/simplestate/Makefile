run-vendor:
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/testutils=../../../core/network/fabric-interop-cc/libs/testutils/
	go mod vendor

undo-vendor:
	rm -rf vendor
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/testutils

build-local: run-vendor build undo-vendor

test-local: run-vendor test undo-vendor

build:
	go build -v .

test:
	go test -v .

clean:
	rm -rf simplestate vendor
