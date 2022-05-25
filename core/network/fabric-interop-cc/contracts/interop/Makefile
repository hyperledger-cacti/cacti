run-vendor:
	go mod vendor
	cp -r ../../../../../common/protos-go/* vendor/github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/
	cp -r ../../libs/* vendor/github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/

build-local: run-vendor
	go build -v .
	
test-local: run-vendor test
	
test:
	go test -v .
	
test-manage-assets: run-vendor
	go test manage_assets.go manage_assets_test.go main.go -v
	
clean:
	rm -rf vendor
