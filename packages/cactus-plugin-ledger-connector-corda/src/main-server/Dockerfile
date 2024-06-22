FROM gradle:8.1.1-jdk17-jammy as builder

WORKDIR /
COPY ./kotlin/gen/kotlin-spring /kotlin-spring/

WORKDIR /kotlin-spring/

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

COPY --from=builder /kotlin-spring/build/libs/ ${APP}/kotlin-spring/build/libs/

RUN chown -R $APP_USER:$APP_USER ${APP}

USER $APP_USER
WORKDIR ${APP}

COPY healthcheck.sh /
COPY start-app.sh /

EXPOSE 8080

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/start-app.sh"]
HEALTHCHECK --interval=1s --timeout=5s --start-period=1s --retries=90 CMD /healthcheck.sh
