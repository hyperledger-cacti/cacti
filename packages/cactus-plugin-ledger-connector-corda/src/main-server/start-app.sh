#!/bin/bash

# Without these we get crashes on JDK 17 an above since the introduction of the
# Java Modules system.
EXTRA_JVM_ARGS=""

for i in 1 2 3; do java $EXTRA_JVM_ARGS -jar ${APP}/kotlin-spring/build/libs/cactus-connector-corda-server-2.0.0-rc.2.jar && break || sleep 5; done
