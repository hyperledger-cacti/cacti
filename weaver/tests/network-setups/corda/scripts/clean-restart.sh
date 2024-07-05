#!/bin/bash

# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0

docker compose down

./gradlew clean

directory=$(dirname $0)

./$directory/generate.sh

if [[ $1 == "local" ]]; then
    ./$directory/get-cordapps.sh local
else 
    ./$directory/get-cordapps.sh
fi

./$directory/start-nodes.sh
