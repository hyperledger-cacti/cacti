run-vendor:
	go mod edit -replace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2=../../../common/protos-go/
	go mod vendor

undo-vendor:
	rm -rf vendor
	go mod edit -dropreplace github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2

build-local: run-vendor build undo-vendor

build:
	go build -v ./...

test-local: run-vendor test undo-vendor

test:
	cd helpers && go test -v .
	cd asset-manager && go test -v .
	cd interoperablehelper && go test -v .

clean:
	rm -rf vendor
