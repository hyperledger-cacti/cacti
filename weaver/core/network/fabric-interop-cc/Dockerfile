FROM golang:1.20 AS build

COPY .  /fabric-interop-cc
WORKDIR /fabric-interop-cc

RUN apt-get update && apt-get install musl-tools -y

RUN cd /fabric-interop-cc/contracts/interop && CC=musl-gcc go build -o interop

# Production ready image
# Pass the binary to the prod image
FROM alpine:3.11 AS prod

RUN apk add libc6-compat libstdc++ zlib>1.2.11-r4 zlib-dev>1.2.11-r4
COPY --from=build /fabric-interop-cc/contracts/interop/interop /app/interop
RUN chmod +x /app/interop
RUN chown 1000 /app

USER 1000

WORKDIR /app
CMD ./interop

ARG GIT_URL
LABEL org.opencontainers.image.source ${GIT_URL}
