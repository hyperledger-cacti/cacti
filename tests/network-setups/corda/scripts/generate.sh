#!/bin/bash

directory=$(dirname $0)

cp -r $directory/../shared/Corda_Network build

# ./gradlew clean deployNodes prepareDockerNodes

