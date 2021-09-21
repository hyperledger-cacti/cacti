#!/bin/bash

./gradlew clean deployNodes prepareDockerNodes

directory=$(dirname $0)

rm -rf $directory/../build/nodes/Notary/certificates
rm -rf $directory/../build/nodes/Notary/persistence

rm -rf $directory/../build/nodes/PartyA/certificates
rm -rf $directory/../build/nodes/PartyA/persistence

rm -rf $directory/../build/nodes/PartyB/certificates
rm -rf $directory/../build/nodes/PartyB/persistence

cp -r $directory/../credentials/notary-certificates/certificates  $directory/../build/nodes/Notary
cp -r $directory/../credentials/notary-certificates/persistence  $directory/../build/nodes/Notary
cp -r $directory/../credentials/partyA-certificates/certificates  $directory/../build/nodes/PartyA
cp -r $directory/../credentials/partyA-certificates/persistence  $directory/../build/nodes/PartyA
cp -r $directory/../credentials/partyB-certificates/certificates  $directory/../build/nodes/PartyB
cp -r $directory/../credentials/partyB-certificates/persistence  $directory/../build/nodes/PartyB
