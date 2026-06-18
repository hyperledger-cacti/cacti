#!/bin/bash

# Without these we get crashes on JDK 17 an above since the introduction of the
# Java Modules system.

for i in 1 2 3; do java -jar ${APP}/kotlin-spring/build/libs/copm-corda-3.0.0-alpha.8.jar && break || sleep 5; done
