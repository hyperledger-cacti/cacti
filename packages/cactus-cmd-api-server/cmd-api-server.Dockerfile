FROM node:22.4.0-bookworm-slim

# CVE-2023-31484 - perl: CPAN.pm does not verify TLS certificates when downloading distributions over HTTPS...
RUN apt-get remove -y --allow-remove-essential perl perl-base && apt-get autoremove -y

ARG APP_DIR=/opt/cacti/cmd-api-server
WORKDIR ${APP_DIR}

COPY ./dist/bundle/ncc/ ${APP_DIR}
COPY ./cmd-api-server.Dockerfile.healthcheck.mjs ${APP_DIR}
CMD ["node", "index.js"]

HEALTHCHECK --interval=5s --timeout=1s --start-period=1s --retries=60 CMD [ "node", "./cmd-api-server.Dockerfile.healthcheck.mjs", "http", "localhost", "4000" ]

# FIXME: Stop hardcoding the less secure defaults once we've migrated to yarts
# for CMD/ENV configuration file parsing.
ENV COCKPIT_TLS_ENABLED=false
ENV COCKPIT_CORS_DOMAIN_CSV=\*
ENV COCKPIT_MTLS_ENABLED=false
ENV COCKPIT_TLS_CERT_PEM=-
ENV COCKPIT_TLS_KEY_PEM=-
ENV COCKPIT_TLS_CLIENT_CA_PEM=-
        
ENV TZ=Etc/UTC
ENV NODE_ENV=production
