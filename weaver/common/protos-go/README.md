# Compiled Protos for Golang

## Pre-requisites:

- Golang: [sample instructions](https://golang.org/dl/) (Version 1.15 or above)
- Protoc (Protobuf compiler): _Golang should already be installed and configured._
  * Default method: Run the following with `sudo` if necessary. This will install both the protobuf compiler and the Go code generator plugin.
    ```
    apt-get install protobuf-compiler
    go get -u google.golang.org/protobuf/cmd/protoc-gen-go
    go get -u google.golang.org/grpc/cmd/protoc-gen-go-grpc
    ```
  * If the above method installs an older version of `protoc` (check using `protoc --version`), say below 3.12.x, you should download pre-compiled binaries instead. (With an older version, you may see errors while attempting to launch and setup the Fabric networks).
    ```
    sudo apt-get remove protobuf-compiler
    curl -LO https://github.com/protocolbuffers/protobuf/releases/download/v3.15.6/protoc-3.15.6-linux-x86_64.zip
    sudo apt-get install unzip
    unzip protoc-3.15.6-linux-x86_64.zip -d <some-folder-path>
    export PATH="$PATH:<some-folder-path>/bin"
    go get -u google.golang.org/protobuf/cmd/protoc-gen-go
    go get -u google.golang.org/grpc/cmd/protoc-gen-go-grpc
    ```
    _Note_: The latest version at present is `3.15.6`, but you should check the above link to find the most current version before running the above steps.

## Steps to Build:

To build, run:
```
make build
```

To clean, run:
```
make clean
```

To clean the builds, run:
```
make clean-build
```

## Steps to Use
* Just add `github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go` to your imports, to use it.
* Run `go mod tidy` to populate your `go.mod` with the latest version.

## Publish

* After building, pushing into github already publishes it.
* To have proper versions (by default go uses commit id as version if there are no git tag created), tag the commit in Git, with format: `common/protos-go/va.b.c`, where:
    - `a`: Major Version.
    - `b`: Minor Version.
    - `c`: Patch Version.
