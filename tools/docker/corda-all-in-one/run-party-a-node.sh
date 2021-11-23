#!/bin/sh
set -e

if [ "$PARTY_A_NODE_ENABLED" = "true" ]
then
  java -Dcapsule.jvm.args="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 -javaagent:drivers/jolokia-jvm-1.6.0-agent.jar=port=7005,logHandlerClass=net.corda.node.JolokiaSlf4jAdapter" -Dname=ParticipantA -jar /samples-kotlin/Advanced/obligation-cordapp/build/nodes/ParticipantA/corda.jar
else
  sleep infinity
fi
