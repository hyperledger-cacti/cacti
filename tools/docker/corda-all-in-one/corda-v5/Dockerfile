FROM cruizba/ubuntu-dind:20.10.9

WORKDIR /

RUN apt update
RUN apt -y upgrade

# # Install git so we can check out the corda5-solarsystem-contracts-demo repo of Corda
RUN apt install -y git

# Need curl to run healthchecks
RUN apt install -y curl

RUN export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends openjdk-11-jdk

# jq is needed by the /download-frozen-image-v2.sh script to pre-fetch docker images without docker.
RUN apt install -y jq

# Get the utility script that can pre-fetch the container images without
# a functioning Docker daemon available which we do not have at image build
# time so have to resort to manually get the images instead of just saying
# "docker pull my/cool-image..." etc.
# The reason to jump trough these hoops is to avoid DockerHub rate limiting issues
RUN curl -sSL https://raw.githubusercontent.com/moby/moby/dedf8528a51c6db40686ed6676e9486d1ed5f9c0/contrib/download-frozen-image-v2.sh > /download-frozen-image-v2.sh
RUN chmod +x /download-frozen-image-v2.sh
RUN mkdir -p /etc/corda/corda-dev/
RUN /download-frozen-image-v2.sh /etc/corda/corda-dev/ corda/corda-dev:5.0.0-devpreview-1.0

RUN curl https://download.corda.net/corda-cli/1.0.0-DevPreview/get-corda-cli.sh > /get-corda-cli.sh
RUN chmod +x /get-corda-cli.sh
RUN /get-corda-cli.sh

RUN curl https://download.corda.net/cordapp-builder/5.0.0-DevPreview-1.0/cordapp-builder-installer.jar --output /cordapp-builder-installer.jar
RUN java -jar /cordapp-builder-installer.jar

RUN git clone https://github.com/corda/corda5-solarsystem-contracts-demo.git
WORKDIR /corda5-solarsystem-contracts-demo

# Placing the ARG here instead of the top may seem like bad form, but it has
# better build performance this way when we change the ARG's value it will
# not spend 5 to 10 minutes installing the OS level dependencies on the top of
# the image definition file because the cached layers will be the same for those.
ARG SOLARSYSTEM_DEMO_SHA=a3be5ad48d249be7f71c5f15074c874dc0d09b41
RUN git checkout ${SOLARSYSTEM_DEMO_SHA}

RUN /root/bin/corda-cli/bin/corda-cli network config docker-compose solar-system
RUN chmod +x gradlew
RUN ./gradlew build

RUN /root/bin/corda-cli/bin/corda-cli network deploy -n solar-system -f solar-system.yaml > docker-compose.yaml

RUN sed -i 's+corda/corda-dev:latest+corda/corda-dev:5.0.0-devpreview-1.0+g' /corda5-solarsystem-contracts-demo/docker-compose.yaml

RUN /root/.local/lib/cordapp-builder/bin/cordapp-builder create --cpk contracts/build/libs/corda5-solar-system-contracts-demo-contracts-1.0-SNAPSHOT-cordapp.cpk --cpk workflows/build/libs/corda5-solar-system-contracts-demo-workflows-1.0-SNAPSHOT-cordapp.cpk -o solar-system.cpb

# OpenSSH server
EXPOSE 22

# supervisord web ui/dashboard
EXPOSE 9001

# earth-node RPC
EXPOSE 12112

# mars-node RPC
EXPOSE 12116

# pluto-node RPC
EXPOSE 12119

# notary-node RPC
EXPOSE 12122

COPY ./start-services.sh /start-services.sh

COPY ./supervisor/ /etc/supervisor/conf.d/
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--nodaemon"]

# Add our healthcheck script that determines when do we consider the container healthy
COPY healthcheck.sh /
HEALTHCHECK --interval=2s --timeout=5s --start-period=30s --retries=180 CMD /healthcheck.sh
#RUN ~/bin/corda-cli/bin/corda-cli package install -n solar-system solar-system.cpb
