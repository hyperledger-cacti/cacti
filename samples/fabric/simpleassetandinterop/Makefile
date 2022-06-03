run-vendor:
	go mod vendor
	cp -r ../../../common/protos-go/* vendor/github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/
	cp -r ../../../core/network/fabric-interop-cc/libs/assetexchange/* vendor/github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/assetexchange/
	cp -r ../../../core/network/fabric-interop-cc/libs/testutils/* vendor/github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils/

build-local: run-vendor
	go build -v .

build: clean-vendor
	go build -v .

test:
	go test -v .

clean-vendor:
	rm -rf vendor

clean: clean-vendor
	rm simpleassetandinterop || true