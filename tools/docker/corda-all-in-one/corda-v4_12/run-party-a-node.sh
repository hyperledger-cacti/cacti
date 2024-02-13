#!/bin/sh
set -e

if [ "$PARTY_A_NODE_ENABLED" = "true" ]
then
  java \
    -Dcapsule.jvm.args="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 -javaagent:drivers/jolokia-jvm-1.6.2-agent.jar=port=7005,logHandlerClass=net.corda.node.JolokiaSlf4jAdapter" \
    -Dname=PartyA \
    -Dlog4j2.configurationFile=/samples-kotlin/Advanced/negotiation-cordapp/config/dev/log4j2.xml \
    -jar /opt/bin/corda.jar
else
  sleep infinity
fi
