#!/bin/bash

# Without these we get crashes on JDK 17 an above since the introduction of the
# Java Modules system.

for i in 1 2 3; do java -jar ${APP}/kotlin-spring/build/libs/copm-corda-2.1.0.jar && break || sleep 5; done
