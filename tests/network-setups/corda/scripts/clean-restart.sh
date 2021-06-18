#!/bin/bash

docker-compose down

./gradlew clean

directory=$(dirname $0)

./$directory/generate.sh

if [[ $1 == "local" ]]; then
    ./$directory/get-cordapps.sh local
else 
    ./$directory/get-cordapps.sh
fi

./$directory/start-nodes.sh
