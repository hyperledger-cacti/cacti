all: clean build

.PHONY: clean
clean:
	rm -rf ./bin

.PHONY: build
build: clean
	go build -o ./bin/fabric-cli fabric-cli.go
