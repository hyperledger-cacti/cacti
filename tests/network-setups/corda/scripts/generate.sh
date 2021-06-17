#!/bin/bash

./gradlew clean deployNodes prepareDockerNodes

directory=$(dirname $0)

rm -rf $directory/../build/nodes/Notary/certificates
rm -rf $directory/../build/nodes/Notary/persistence

rm -rf $directory/../build/nodes/PartyA/certificates
rm -rf $directory/../build/nodes/PartyA/persistence

cp -r $directory/../credentials/notary-certificates/certificates  $directory/../build/nodes/Notary
cp -r $directory/../credentials/notary-certificates/persistence  $directory/../build/nodes/Notary
cp -r $directory/../credentials/partyA-certificates/certificates  $directory/../build/nodes/PartyA
cp -r $directory/../credentials/partyA-certificates/persistence  $directory/../build/nodes/PartyA
