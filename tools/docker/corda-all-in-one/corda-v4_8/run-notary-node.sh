#!/bin/sh
set -e

if [ "$NOTARY_NODE_ENABLED" = "true" ]
then
  java \
    -Dcapsule.jvm.args="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5008 -javaagent:drivers/jolokia-jvm-1.6.0-agent.jar=port=7008,logHandlerClass=net.corda.node.JolokiaSlf4jAdapter" \
    -Dname=Notary \
    -jar \
    /samples-kotlin/Advanced/obligation-cordapp/build/nodes/Notary/corda.jar
else
  sleep infinity
fi
