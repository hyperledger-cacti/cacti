ARG BUILD_TAG

# Local build
FROM gradle:4.10.3-jdk8 AS builder-local

WORKDIR /corda-driver
ADD build /corda-driver/build

# Remote build
FROM gradle:4.10.3-jdk8 AS builder-remote

USER root
RUN apt-get update && apt-get install -y maven

WORKDIR /corda-driver
ADD . .
# RUN ./gradlew build --refresh-dependencies
RUN ./gradlew clean installDist

FROM builder-${BUILD_TAG} as builder
RUN echo "Builder ${BUILD_TAG}"

# Deployment Image 
FROM openjdk:8-jre

COPY --from=builder /corda-driver/build/install/corda-driver /corda-driver/

WORKDIR /corda-driver

ARG GIT_URL
LABEL org.opencontainers.image.source ${GIT_URL}
