#!/bin/bash
# Copyright 2019 Fujitsu Laboratories Ltd.
# SPDX-License-Identifier: Apache-2.0

cd /opt/gopath/src/github.com/hyperledger/fabric/work/server/connector
npm install
cd /opt/gopath/src/github.com/hyperledger/fabric/work/server/connector/lib/dependent
npm install
