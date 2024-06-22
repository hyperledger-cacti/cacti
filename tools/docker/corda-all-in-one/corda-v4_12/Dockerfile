FROM ubuntu:22.04 as builder

RUN apt update && apt install openjdk-17-jdk git curl augeas-tools -y
WORKDIR /opt/
RUN git clone https://github.com/corda/corda.git
WORKDIR /opt/corda/

# commit c7514e1c603c077b49987fd79bd77060612967ed (HEAD -> release/os/4.12, upstream/release/os/4.12)
# Author: Chris Cochrane <78791827+chriscochrane@users.noreply.github.com>
# Date:   Wed Feb 7 14:46:18 2024 +0000
#
#     ENT-11443 Function sig changes to support removing enterprise compiler warnings (#7671)
RUN git switch release/os/4.12
RUN git fetch --all && git checkout d578cae797ac5551d8a3c959354d7c6d69f0f97a
RUN ./gradlew jar -x test

FROM ubuntu:22.04

RUN apt update && apt install openjdk-17-jdk supervisor openssh-server sudo git curl iputils-ping netcat augeas-tools -y

RUN useradd -rm -d /home/ubuntu -s /bin/bash -g root -G sudo -u 1000 test 

RUN  echo 'root:root' | chpasswd

RUN mkdir /var/run/sshd

WORKDIR /


# The image has a bleeding edge version of corda baked in for testing conveniece
RUN mkdir -p /opt/bin/
COPY --from=builder /opt/corda/node/capsule/build/libs/corda-4.12-SNAPSHOT.jar /opt/bin/corda.jar

# Make the "corda-shell" alias avaialble on the terminal
RUN java -jar /opt/bin/corda.jar install-shell-extensions

RUN git clone https://github.com/corda/samples-kotlin.git
WORKDIR /samples-kotlin

ARG SAMPLES_KOTLIN_SHA=a5bb03027d7a6e1a5bca880e338a811b875f2815
ARG SAMPLES_KOTLIN_BRANCH=release/4.12

RUN git fetch --all && git switch ${SAMPLES_KOTLIN_BRANCH}
RUN git checkout ${SAMPLES_KOTLIN_SHA}

ARG SAMPLES_KOTLIN_CORDAPP_SUB_DIR_PATH="./Advanced/negotiation-cordapp/"
WORKDIR /samples-kotlin/${SAMPLES_KOTLIN_CORDAPP_SUB_DIR_PATH}

COPY ./negotiation-cordapp/build.gradle /samples-kotlin/Advanced/negotiation-cordapp/build.gradle
COPY ./negotiation-cordapp/contracts/build.gradle /samples-kotlin/Advanced/negotiation-cordapp/contracts/build.gradle
COPY ./negotiation-cordapp/workflows/build.gradle /samples-kotlin/Advanced/negotiation-cordapp/workflows/build.gradle
COPY ./constants.properties /samples-kotlin/Advanced/constants.properties

RUN ./gradlew build deployNodes -x test

WORKDIR /

# Configure the OpenSSH server we just installed
RUN augtool 'set /files/etc/ssh/sshd_config/AuthorizedKeysFile ".ssh/authorized_keys /etc/authorized_keys/%u"' && \
    augtool 'set /files/etc/ssh/sshd_config/PermitRootLogin yes' && \
    augtool 'set /files/etc/ssh/sshd_config/PasswordAuthentication yes' && \
    augtool 'set /files/etc/ssh/sshd_config/PermitEmptyPasswords yes' && \
    augtool 'set /files/etc/ssh/sshd_config/Port 2222' && \
    augtool 'set /files/etc/ssh/sshd_config/LogLevel DEBUG2' && \
    augtool 'set /files/etc/ssh/sshd_config/LoginGraceTime 10'

# Create the server's key - without this sshd will refuse to start
RUN ssh-keygen -A

# Generate an RSA keypair on the fly to avoid having to hardcode one in the image
# which technically does not pose a security threat since this is only a development
# image, but we do it like this anyway.
RUN mkdir ~/.ssh && \
    chmod 700 ~/.ssh/ && \
    touch ~/.ssh/authorized_keys

ENV CACTUS_CFG_PATH=/etc/hyperledger/cactus
RUN mkdir -p $CACTUS_CFG_PATH

RUN ["/bin/bash", "-c", "ssh-keygen -t rsa -N '' -f $CACTUS_CFG_PATH/corda-aio-image"]
RUN mv $CACTUS_CFG_PATH/corda-aio-image $CACTUS_CFG_PATH/corda-aio-image.key
RUN cp $CACTUS_CFG_PATH/corda-aio-image.pub ~/.ssh/authorized_keys

WORKDIR /samples-kotlin/${SAMPLES_KOTLIN_CORDAPP_SUB_DIR_PATH}

# OpenSSH server
EXPOSE 2222

# supervisord web ui/dashboard
EXPOSE 9001

# Party Notary, Party A, Party B RPC ports
EXPOSE 10003 10006 10009

# Jolokia for Party A,B,C and Notary
EXPOSE 7005 7006 7007 7008

# JVM remote debug port
EXPOSE 5005 5006 5008

COPY supervisord.conf /etc/supervisord.conf
COPY run-party-b-node.sh run-notary-node.sh healthcheck.sh run-party-a-node.sh /
COPY ./negotiation-cordapp/log4j2.xml /samples-kotlin/Advanced/negotiation-cordapp/config/dev/log4j2.xml

# By default we only run the absolute minimum which is a single partys node.
# For more complex tests everything else can also be enabled via the env vars
# below so that if needed there is 2 parties, a notary and a dedicated web server
# for all 3 of those nodes.
# "Web server" => the same one as in the official corda samples-kotlin repo
ENV PARTY_A_NODE_ENABLED="true"

ENV PARTY_B_NODE_ENABLED="true"

ENV NOTARY_NODE_ENABLED="true"

ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]

HEALTHCHECK --interval=1s --timeout=5s --start-period=5s --retries=120 CMD /healthcheck.sh
