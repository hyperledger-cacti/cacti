FROM node:22.4.0-bookworm-slim

RUN apt-get update && apt-get install -y supervisor curl

# CVE-2023-31484 - perl: CPAN.pm does not verify TLS certificates when downloading distributions over HTTPS...
RUN apt-get remove -y --allow-remove-essential perl perl-base && apt-get autoremove -y

ARG APP_DIR=/opt/cacti/satp-hermes
WORKDIR ${APP_DIR}
RUN mkdir -p /opt/cacti/satp-hermes/log/

COPY ./dist/bundle/ncc/ ${APP_DIR}
COPY ./satp-hermes-gateway.Dockerfile.healthcheck.mjs ${APP_DIR}
COPY ./gateway-config.json /gateway-config.json
COPY ./src/knex/ ${APP_DIR}/src/knex/
COPY ./supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY ./supervisord.conf /etc/supervisord.conf

# fabric-common cannot be bundled  due to some exotic transitive depenedencies
# so we have to install it within the container manually.
RUN npm install fabric-common

ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]


HEALTHCHECK --interval=5s --timeout=1s --start-period=1s --retries=5 CMD [ "node", "./satp-hermes-gateway.Dockerfile.healthcheck.mjs", "http", "localhost", "4010" ]

ENV TZ=Etc/UTC
ENV NODE_ENV=production

EXPOSE 3010 3011 4010
