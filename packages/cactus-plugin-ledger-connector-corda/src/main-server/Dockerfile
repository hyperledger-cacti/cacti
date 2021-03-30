FROM gradle:6.8.0-jdk8 as builder

WORKDIR /
COPY ./kotlin/gen/kotlin-spring /kotlin-spring/

WORKDIR /kotlin-spring/

RUN gradle build
WORKDIR /

FROM openjdk:8u275-jre-slim-buster

ARG APP=/usr/src/app
ENV APP=/usr/src/app

RUN apt-get update
RUN apt-get install -y ca-certificates tzdata curl tini
RUN rm -rf /var/lib/apt/lists/*

ENV TZ=Etc/UTC \
    APP_USER=appuser

RUN groupadd $APP_USER \
    && useradd -g $APP_USER $APP_USER \
    && mkdir -p ${APP}

COPY --from=builder /kotlin-spring/build/ ${APP}/kotlin-spring/build/

RUN chown -R $APP_USER:$APP_USER ${APP}

USER $APP_USER
WORKDIR ${APP}

COPY healthcheck.sh /
COPY start-app.sh /

EXPOSE 8080

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/start-app.sh"]
HEALTHCHECK --interval=1s --timeout=5s --start-period=1s --retries=30 CMD /healthcheck.sh
