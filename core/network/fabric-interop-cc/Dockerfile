FROM golang:1.16 AS build

RUN apt-get update && apt-get install unzip
RUN curl -LO https://github.com/protocolbuffers/protobuf/releases/download/v3.15.6/protoc-3.15.6-linux-x86_64.zip
RUN mkdir /opt/protoc
RUN unzip protoc-3.15.6-linux-x86_64.zip -d /opt/protoc
ENV PATH="/opt/protoc/bin:${PATH}"
ENV PATH="${PATH}:${HOME}/go/bin"

RUN go get github.com/golang/protobuf/protoc-gen-go

COPY .  /fabric-interop-cc
WORKDIR /fabric-interop-cc

RUN ./scripts/build-protos.sh

RUN cd /fabric-interop-cc/contracts/interop && go build -o interop

# Production ready image
# Pass the binary to the prod image
FROM alpine:3.11 as prod

RUN apk add libc6-compat \
        libstdc++
COPY --from=build /fabric-interop-cc/contracts/interop/interop /app/interop
RUN chmod +x /app/interop
RUN chown 1000 /app

USER 1000

WORKDIR /app
CMD ./interop
