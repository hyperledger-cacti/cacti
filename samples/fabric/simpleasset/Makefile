build:
	go build -v .
test:
	cp -r ../../../core/network/fabric-interop-cc/contracts/interop/mocks .
	go test -v .
clean:
	rm -rf mocks
	rm simpleasset || true
