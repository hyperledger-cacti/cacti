FROM gradle:4.10.3-jdk8 AS builder

USER root
RUN apt-get update && apt-get install -y maven

WORKDIR /corda-driver
ADD . .
RUN ./gradlew build --refresh-dependencies
RUN ./gradlew installDist

FROM openjdk:8-jre-alpine

COPY --from=builder /corda-driver/build/install/corda-driver /corda-driver/

WORKDIR /corda-driver
