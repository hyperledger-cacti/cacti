#!/bin/bash
set -e

cd /CSDE-cordapp-template-kotlin/
while true; do
  echo "Waiting for startCorda to execute..."
  if ./gradlew listVNodes | grep "X500"; then
    echo "Starting v5NodeSetup...";
    ./gradlew 5-vNodeSetup
    break;
  fi
  sleep 5;
done

