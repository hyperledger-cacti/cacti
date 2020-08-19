#!/bin/sh

echo "Starting ssh server..."
nohup /usr/sbin/sshd -D &

echo "Starting corda node.."
java -jar /opt/corda/partyA/corda.jar --base-directory=/opt/corda/partyA & java -jar /opt/corda/partyB/corda.jar --base-directory=/opt/corda/partyB && fg
