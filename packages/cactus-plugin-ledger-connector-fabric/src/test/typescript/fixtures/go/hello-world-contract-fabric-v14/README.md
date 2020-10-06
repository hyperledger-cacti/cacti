# Fabirc v1.4.x Hello World Contract


### Building Locally with v1.4.x ChainCode

This is useful when you want to avoid having to deal with $GOPATH and friends
and instead just keep everything self-contained in a single directory which is
what we want from an ideal test case, so here's how to do it on the terminal:

```sh

# Make sure you are in the right working directory
cd packages/cactus-plugin-ledger-connector-fabric/src/test/typescript/fixtures/go/hello-world-contract-fabric-v14

# Export the go source code to the file system into an actual .go file
npx ts-node ./hello-world-contract-go-source.ts

# Ensure the Go Modules feature is used
export GO111MODULE=on

# If go.mod file is not present,
# otherwise this can be omitted
go mod init hello-world-contract

# This will pin on the latest 1.4 commit
go get github.com/hyperledger/fabric@v1.4.8

go mod tidy
go mod vendor

# Now you can just build it like any other go project
# and deploy the resulting binary as a chain code
# contract on a Fabric v.1.4.x ledger
go build
```
