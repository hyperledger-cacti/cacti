build:
	go build -v .
test:
	go test -v .
clean:
	rm simpleasset
build-local:
	mv go.mod go.mod.rm
	mv go.sum go.sum.rm
	cp go.mod.local go.mod
	cp -r ../../../core/network/fabric-interop-cc/libs .
	cp -r ../../../core/network/fabric-interop-cc/interfaces .
	cp -r ../../../common/protos-go .
	(go mod tidy && go build -v .) || true
	mv go.mod.rm go.mod
	mv go.sum.rm go.sum
	
test-local:
	mv go.mod go.mod.rm
	mv go.sum go.sum.rm
	cp go.mod.local go.mod
	cp -r ../../../core/network/fabric-interop-cc/libs .
	cp -r ../../../core/network/fabric-interop-cc/interfaces .
	cp -r ../../../common/protos-go .
	(go mod tidy && go test -v .) || true
	mv go.mod.rm go.mod
	mv go.sum.rm go.sum


