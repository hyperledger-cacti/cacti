FROM corda/corda-zulu-4.0:latest AS corda
FROM adoptopenjdk/openjdk8:alpine
RUN mkdir -p /opt/corda/bin
COPY --from=corda /opt/corda/bin/ /opt/corda/bin/

ARG KEYPATH=~/.ssh/id_rsa.pub


# Set up Open-SSH server
RUN apk update && \
    apk add openssh augeas supervisor && \
    mkdir -p ~root/.ssh /etc/authorized_keys && chmod 700 ~root/.ssh/ && \
    augtool 'set /files/etc/ssh/sshd_config/AuthorizedKeysFile ".ssh/authorized_keys /etc/authorized_keys/%u"' && \
    augtool 'set /files/etc/ssh/sshd_config/PermitRootLogin yes' && \
    augtool 'set /files/etc/ssh/sshd_config/PasswordAuthentication yes' && \
    augtool 'set /files/etc/ssh/sshd_config/Port 22' && \
    cp -a /etc/ssh /etc/ssh.cache && \
    ssh-keygen -A && \
    rm -rf /var/cache/apk/* && \
    echo 'root:root' | chpasswd

RUN chmod 700 ~/
RUN chmod 700 ~/.ssh
RUN touch ~/.ssh/authorized_keys
RUN chmod 600 ~/.ssh/authorized_keys
ADD corda_image.pub corda_image.pub
RUN cp corda_image.pub ~/.ssh/authorized_keys
RUN mkdir ~/smart-contracts

RUN echo $'JAVA_HOME=/opt/java/openjdk/bin/java \n\
export PATH=/opt/java/openjdk/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \n\
export PAGER=less \n\
export PS1='\h:\w\$ ' \n\
umask 022 \n\
for script in /etc/profile.d/*.sh ; do \n\
        if [ -r $script ] ; then \n\
                . $script \n\
        fi \n\
done' > /etc/profile

EXPOSE 22

# Set up corda nodes
RUN mkdir -p /opt/corda/bin
COPY --from=corda /opt/corda/bin/ /opt/corda/bin/

# Creating node for PartyA
RUN mkdir -p /opt/corda/partyA/cordapps
RUN mkdir -p /opt/corda/partyA/config
RUN mkdir -p /opt/corda/partyA/persistence
RUN mkdir -p /opt/corda/partyA/certificates
RUN mkdir -p /opt/corda/partyA/drivers
RUN mkdir -p /opt/corda/partyA/logs
RUN mkdir -p /opt/corda/partyA/bin
RUN mkdir -p /opt/corda/partyA/additional-node-infos
RUN cp /opt/corda/bin/corda.jar /opt/corda/partyA/corda.jar
ADD network-parameters /opt/corda/partyA/network-parameters
ADD PartyA/certificates/nodekeystore.jks /opt/corda/partyA/certificates/nodekeystore.jks
ADD PartyA/certificates/truststore.jks /opt/corda/partyA/certificates/truststore.jks
ADD PartyA/certificates/sslkeystore.jks /opt/corda/partyA/certificates/sslkeystore.jks
ADD PartyA/node.conf /opt/corda/partyA/node.conf
ADD additional-node-infos /opt/corda/partyA/additional-node-infos

# Creating node for PartyB
RUN mkdir -p /opt/corda/partyB/cordapps
RUN mkdir -p /opt/corda/partyB/config
RUN mkdir -p /opt/corda/partyB/persistence
RUN mkdir -p /opt/corda/partyB/certificates
RUN mkdir -p /opt/corda/partyB/drivers
RUN mkdir -p /opt/corda/partyB/logs
RUN mkdir -p /opt/corda/partyB/bin
RUN mkdir -p /opt/corda/partyB/additional-node-infos
RUN cp /opt/corda/bin/corda.jar /opt/corda/partyB/corda.jar
ADD network-parameters /opt/corda/partyB/network-parameters
ADD PartyB/certificates/nodekeystore.jks /opt/corda/partyB/certificates/nodekeystore.jks
ADD PartyB/certificates/truststore.jks /opt/corda/partyB/certificates/truststore.jks
ADD PartyB/certificates/sslkeystore.jks /opt/corda/partyB/certificates/sslkeystore.jks
ADD PartyB/node.conf /opt/corda/partyB/node.conf
ADD additional-node-infos /opt/corda/partyB/additional-node-infos

# set up gradle
RUN mkdir -p /opt/corda/builder
ADD deploy_contract.sh /opt/corda/builder/deploy_contract.sh
RUN chmod +x /opt/corda/builder/deploy_contract.sh
ADD builder/gradlew /opt/corda/builder/gradlew
ADD builder/gradle /opt/corda/builder/gradle

EXPOSE 10013
EXPOSE 10014
EXPOSE 10003
EXPOSE 10004
EXPOSE 20013
EXPOSE 20014

WORKDIR /opt/corda

COPY supervisord.conf /etc/supervisord.conf
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
