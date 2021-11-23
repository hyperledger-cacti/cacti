#!/bin/bash
# Copyright 2019 Fujitsu Laboratories Ltd.
# SPDX-License-Identifier: Apache-2.0

cd /opt/gopath/src/github.com/hyperledger/fabric/work/server/serviceapi
npm install
cd /opt/gopath/src/github.com/hyperledger/fabric/work/server/
mongod --config /opt/gopath/src/github.com/hyperledger/fabric/work/server/mongodb/mongodb.config
