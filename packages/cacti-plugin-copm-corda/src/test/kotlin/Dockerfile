FROM gradle:8.1.1-jdk17-jammy AS builder

WORKDIR /
COPY src/test/kotlin/com /kotlin-spring/src/test/kotlin/com
COPY src/main/kotlin/org /kotlin-spring/src/main/kotlin/org
COPY src/test/kotlin/localdeps /kotlin-spring/src/test/kotlin/localdeps
COPY src/test/kotlin/build.gradle /kotlin-spring/src/test/kotlin
COPY src/test/kotlin/settings.gradle /kotlin-spring/src/test/kotlin
COPY src/test/kotlin/gradle.properties /kotlin-spring/src/test/kotlin
WORKDIR /kotlin-spring/src/test/kotlin

RUN gradle clean build
WORKDIR /

FROM openjdk:24-slim-bookworm

ARG APP=/usr/src/app
ENV APP=/usr/src/app

RUN apt update
RUN apt install -y ca-certificates tzdata curl tini iputils-ping netcat-openbsd
RUN rm -rf /var/lib/apt/lists/*

ENV TZ=Etc/UTC \
    APP_USER=appuser

RUN groupadd $APP_USER \
    && useradd -g $APP_USER $APP_USER \
    && mkdir -p ${APP}

COPY --from=builder /kotlin-spring/src/test/kotlin/build/libs/ ${APP}/kotlin-spring/build/libs/

RUN chown -R $APP_USER:$APP_USER ${APP}

USER $APP_USER
WORKDIR ${APP}

COPY src/test/kotlin/start-app.sh /

EXPOSE 9090

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/start-app.sh"]
