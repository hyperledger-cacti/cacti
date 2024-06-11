#!/bin/sh

# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

directory=$(dirname $0)
if [ -z $WEAVER_ROOT ]; then
    WEAVER_ROOT=$directory/../../..
fi

comment () {
    sed -i'.scriptbak' -e "$1"' s/^cacti_weaver_protos_rs/# cacti_weaver_protos_rs/' "$2"
}
uncomment() {
    sed -i'.scriptbak' -e "$1"' s/^# cacti_weaver_protos_rs/cacti_weaver_protos_rs/' "$2"
}

lineNum="$(grep -n "cacti_weaver_protos_rs" Cargo.toml | head -n 1 | cut -d: -f1)"

if [ "$1" = "local" ]; then
    rm -rf protos-rs
    cp -r $WEAVER_ROOT/common/protos-rs/pkg protos-rs
    comment $((lineNum+1)) Cargo.toml
    uncomment $lineNum Cargo.toml
else
    uncomment $((lineNum+1)) Cargo.toml
    comment $lineNum Cargo.toml
fi

rm -f Cargo.toml.scriptbak
