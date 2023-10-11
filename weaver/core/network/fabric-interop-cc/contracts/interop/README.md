<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Weaver Fabric Interop Chaincode

## Troubleshooting

While running `make test-local`, if you get error like:
```
go: updates to go.mod needed; to update it:
	go mod tidy
```
Then run following to fix it, and commit the changes if everything works good:
```
make run-vendor || go mod tidy && make test-local && go mod tidy && make test && make test-local
```