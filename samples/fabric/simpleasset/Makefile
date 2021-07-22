base-class:
	cp -r ../../../core/network/fabric-interop-cc/interfaces/asset-mgmt .
build: base-class
	go build -v .
test: base-class
	cp -r ../../../core/network/fabric-interop-cc/contracts/interop/mocks .
	go test -v .
clean:
	rm -rf asset-mgmt
	rm -rf mocks
	rm simpleasset || true
