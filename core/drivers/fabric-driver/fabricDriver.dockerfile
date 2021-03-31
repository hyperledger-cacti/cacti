FROM node:10

WORKDIR /fabric-driver

ADD . /fabric-driver
# Uncomment depending on the name of the network
# ADD config/wallet-apactfn /fabric-driver/wallet-apactfn
# ADD config/wallet-wtln /fabric-driver/wallet-wtln

# Setup protoc
# RUN apt-get update && apt-get install curl
RUN curl -LO https://github.com/protocolbuffers/protobuf/releases/download/v3.12.1/protoc-3.12.1-linux-x86_64.zip
RUN mkdir /opt/protoc
RUN unzip protoc-3.12.1-linux-x86_64.zip -d /opt/protoc
ENV PATH="/opt/protoc/bin:${PATH}"

# Setup fabric driver

RUN npm install --unsafe-perm
RUN npm run postinstall
RUN npm run build
