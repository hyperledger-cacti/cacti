#!/bin/bash
# Copyright 2019 Fujitsu Laboratories Ltd.
# SPDX-License-Identifier: Apache-2.0

cd /opt/gopath/src/github.com/hyperledger/fabric/work/server/coreapi
npm install
cd /opt/gopath/src/github.com/hyperledger/fabric/work/server/coreapi/lib/common/exp
npm install
cd /opt/gopath/src/github.com/hyperledger/fabric/work/server/coreapi/lib/common/fabric_v1.0
npm install
