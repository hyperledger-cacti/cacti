FROM docker:20.10.3-dind

RUN apk update
RUN apk add py-pip python3-dev libffi-dev openssl-dev gcc libc-dev make

# Need curl for healthchecks
RUN apk add --no-cache curl

# Need to run shell script run.sh for Corda CLI
RUN apk add --no-cache bash

# The file binary is used to inspect exectubles when debugging container image issues
RUN apk add --no-cache file
RUN apk add --no-cache ca-certificates
RUN apk add --no-cache tzdata
RUN apk add --no-cache gnupg

#----------------- INSTALLING CORDA CDSE PREREQUISITES --------------------
#--------------------------------------------------------------------------

# Installing Zulu17 JDK
RUN wget -P /etc/apk/keys/ \
https://cdn.azul.com/public_keys/alpine-signing@azul.com-5d5dc44c.rsa.pub
RUN echo "https://repos.azul.com/zulu/alpine" | tee -a /etc/apk/repositories
RUN apk update
RUN apk add --no-cache zulu17-jdk

# ENV JAVA_HOME /usr/lib/jvm/zulu17-ca
# ENV PATH $PATH:$JAVA_HOME/bin

# Installing Corda CLI
RUN mkdir /platform-jars && \
    wget -O /platform-jars/binary.tar.gz \
    https://download.corda.net/c5-release-pack/f82c7008-3b72-48fb-8e25-5ca38a9483b1-5.1.0/platform-jars-5.1.0.tar.gz

RUN cd /platform-jars/ && \
    tar -xvzf binary.tar.gz && \
    cp net/corda/cli/deployment/corda-cli-installer/5.1.0.0/corda-cli-installer-5.1.0.0.zip . && \
    unzip corda-cli-installer-5.1.0.0.zip -d corda-cli-installer && \
    corda-cli-installer/./install.sh
ENV PATH="$PATH:~/.corda/cli"

#--------------------------------------------------------------------------
#--------------------------------------------------------------------------

# Installing CORDA CDSE
RUN apk add --no-cache git
RUN git clone https://github.com/corda/CSDE-cordapp-template-kotlin.git

RUN cd CSDE-cordapp-template-kotlin/ && \
    git checkout release/corda-5-0 && \
    sed -i 's/cordaNotaryPluginsVersion=5.0.0.0/cordaNotaryPluginsVersion=5.0.1.0/' gradle.properties && \
    sed -i 's/combinedWorkerJarVersion=5.0.0.0/combinedWorkerJarVersion=5.0.1.0/' gradle.properties && \
    sed -i 's/import static org.gradle.api.JavaVersion.VERSION_11/import static org.gradle.api.JavaVersion.VERSION_17/' build.gradle && \
    sed -i 's/def javaVersion = VERSION_11/def javaVersion = VERSION_17/' build.gradle

RUN apk add --no-cache supervisor
## TO FIX: Exposing the required ports 5005, 5432 and 8888 for CSDE
## and 9001 for supervisor. Currently commented because of "--network host" being used to run the container
# EXPOSE 5005
# EXPOSE 5432
# EXPOSE 8888
# EXPOSE 9001
EXPOSE 22

COPY supervisord.conf /etc/supervisord.conf

COPY start-services.sh /start-services.sh
RUN chmod +x /start-services.sh

COPY healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

WORKDIR /CSDE-cordapp-template-kotlin/

# Extend the parent image's entrypoint
# https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]

HEALTHCHECK --interval=30s --timeout=60s --start-period=200s --retries=100 CMD /healthcheck.sh
