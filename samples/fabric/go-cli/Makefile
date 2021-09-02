all: clean build

.PHONY: clean
clean:
	rm -rf ./bin

.PHONY: build
build: clean
	go build -o ./bin/fabric-cli fabric-cli.go

.PHONY: build-local
build-local: clean
	mv go.mod go.mod.latest
	mv go.sum go.sum.latest
	cp go.mod.local go.mod
	cp go.sum.local go.sum
	go build -o ./bin/fabric-cli fabric-cli.go
	mv go.mod.latest go.mod
	mv go.sum.latest go.sum
