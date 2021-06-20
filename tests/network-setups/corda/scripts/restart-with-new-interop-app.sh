#!/bin/bash

directory=$(dirname $0)
version="0.5"

echo Stopping nodes...
echo
docker-compose down

echo Building interop jars...
echo
(cd $directory/../../../../corda-interop-app && ./gradlew jar)

echo Deleting existing jar...
echo
rm $directory/../artifacts/interop-workflows-$version.jar
rm $directory/../artifacts/interop-contracts-$version.jar

echo Copying jar from corda-interop-app repo...
echo
cp $directory/../../../../corda-interop-app/interop-workflows/build/libs/interop-workflows-$version.jar $directory/../artifacts
cp $directory/../../../../corda-interop-app/interop-contracts/build/libs/interop-contracts-$version.jar $directory/../artifacts

echo Starting nodes...
echo
(./$directory/start-nodes.sh)&
