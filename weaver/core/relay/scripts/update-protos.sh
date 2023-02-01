#!/bin/sh

directory=$(dirname $0)
if [ -z $WEAVER_ROOT ]; then
    WEAVER_ROOT=$directory/../../..
fi

comment () {
    sed -i'.scriptbak' -e "$1"' s/^weaver_protos_rs/# weaver_protos_rs/' "$2"
}
uncomment() {
    sed -i'.scriptbak' -e "$1"' s/^# weaver_protos_rs/weaver_protos_rs/' "$2"
}

if [ "$1" = "local" ]; then
    rm -rf protos-rs
    cp -r $WEAVER_ROOT/common/protos-rs/pkg protos-rs
    comment 39 Cargo.toml
    uncomment 38 Cargo.toml
else
    uncomment 39 Cargo.toml
    comment 38 Cargo.toml
fi

rm -f Cargo.toml.scriptbak