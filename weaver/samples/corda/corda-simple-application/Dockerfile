FROM openjdk:8-alpine AS builder


WORKDIR /build
ADD . .
RUN ./gradlew installDist

FROM openjdk:8-alpine AS all

WORKDIR /client

COPY --from=builder /build/clients/build/install /client
RUN chmod +x /client/clients/bin/clients
