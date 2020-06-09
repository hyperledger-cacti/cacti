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