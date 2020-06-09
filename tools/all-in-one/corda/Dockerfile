FROM azul/zulu-openjdk:8u192
FROM corda/corda-zulu-4.0:latest AS corda

# create party A dir structure
RUN echo "Creating node directory structure for PartyA"
RUN mkdir -p /opt/corda/partyA/cordapps
RUN mkdir -p /opt/corda/partyA/config
RUN mkdir -p /opt/corda/partyA/persistence
RUN mkdir -p /opt/corda/partyA/certificates
RUN mkdir -p /opt/corda/partyA/drivers
RUN mkdir -p /opt/corda/partyA/logs
RUN mkdir -p /opt/corda/partyA/bin
RUN mkdir -p /opt/corda/partyA/additional-node-infos

# copy corda jar
RUN mkdir -p /opt/corda/bin
COPY --from=corda /opt/corda/bin/ /opt/corda/bin/

# set up node file for party A
RUN cp /opt/corda/bin/corda.jar /opt/corda/partyA/corda.jar
ADD network-parameters /opt/corda/partyA/network-parameters
ADD PartyA/certificates/nodekeystore.jks /opt/corda/partyA/certificates/nodekeystore.jks
ADD PartyA/certificates/truststore.jks /opt/corda/partyA/certificates/truststore.jks
ADD PartyA/certificates/sslkeystore.jks /opt/corda/partyA/certificates/sslkeystore.jks
ADD PartyA/node.conf /opt/corda/partyA/node.conf
ADD additional-node-infos /opt/corda/partyA/additional-node-infos

# run nodes
ADD init_node.sh /opt/corda/bin/init_node.sh
CMD /opt/corda/bin/init_node.sh