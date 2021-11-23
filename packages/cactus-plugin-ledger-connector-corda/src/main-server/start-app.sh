#!/bin/bash

for i in 1 2 3 4 5; do java -jar ${APP}/kotlin-spring/build/libs/cactus-connector-corda-server-0.3.0.jar && break || sleep 15; done
