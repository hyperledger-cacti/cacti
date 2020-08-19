#!/bin/sh

cp /root/smart-contracts/upload.zip /opt/corda/builder/upload.zip
cd /opt/corda/builder
unzip upload.zip

echo "Kill all running corda nodes"
supervisorctl stop partyA partyB

echo "Building Cordapps"
./gradlew build -x test
./gradlew jar
./gradlew deployNodes

echo "Deploying Cordapps"
cp /opt/corda/builder/build/nodes/PartyA/cordapps/*.jar /opt/corda/partyA/cordapps/
cp /opt/corda/builder/build/nodes/PartyA/cordapps/*.jar /opt/corda/partyB/cordapps/
supervisorctl start partyA partyB
