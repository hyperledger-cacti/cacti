#!/bin/sh
set -e

if [ "$PARTY_C_NODE_ENABLED" = "true" ]
then
  java \
  -Dcapsule.jvm.args="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5007 -javaagent:drivers/jolokia-jvm-1.6.0-agent.jar=port=7007,logHandlerClass=net.corda.node.JolokiaSlf4jAdapter" \
  -Dname=ParticipantC \
  -jar \
  /samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantC/corda.jar
else
  sleep infinity
fi
