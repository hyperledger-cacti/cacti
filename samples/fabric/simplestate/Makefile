run-vendor:
	go mod vendor
	cp -r ../../../core/network/fabric-interop-cc/libs/testutils/* vendor/github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils/
	
test-local: run-vendor
	go test -v .
test:
	go mod tidy
	go test -v .
clean:
	rm -rf mocks simplestate vendor
