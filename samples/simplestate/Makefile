mocks:
	cp -r ../../core/network/fabric-interop-cc/contracts/interop/mocks .
test: mocks
	go test simplestate.go simplestate_test.go setup_test.go -v
clean:
	rm -rf mocks simplestate
