FROM golang:1.16 AS build

COPY .  /fabric-interop-cc
WORKDIR /fabric-interop-cc

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

ARG GIT_URL
LABEL org.opencontainers.image.source ${GIT_URL}