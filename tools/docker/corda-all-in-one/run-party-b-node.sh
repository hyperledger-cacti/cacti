#!/bin/sh
set -e

if [ "$PARTY_B_NODE_ENABLED" = "true" ]
then
  java -Dcapsule.jvm.args="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5006 -javaagent:drivers/jolokia-jvm-1.6.0-agent.jar=port=7006,logHandlerClass=net.corda.node.JolokiaSlf4jAdapter" -Dname=ParticipantB -jar /samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantB/corda.jar
else
  sleep infinity
fi
