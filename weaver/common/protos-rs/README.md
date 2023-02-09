# Weaver Compiled Protos for Rust

## Prerequisites to publish:

* Register on [crates.io](https://crates.io) with github account.
* Run following and follow the instructions to login:
```
  cargo login
```

## Steps to publish:

* Run dry-run before actual publish by running:
```
  make dry-run-publish
```
* If above is successful, publish the module by running (need to commit all the changes before publish else following will ask to commit):
```
  make publish
```

# Steps to Use
1) Add following in `Cargo.toml`, as dependency:
```
weaver_protos_rs = "1.5.3"
```
2) Now to import data structures, e.g. to import `Ack` data structure in `common/ack.proto`, use:
```
use weaverpb::common::ack::Ack; 
```
