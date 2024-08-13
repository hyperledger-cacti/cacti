################################
# Common Args
################################

ARG supabase_tag="v0.24.03"
ARG freeze_tmp_dir="/opt/docker-freeze"

################################
# Build phase
################################

FROM alpine:3.19.1 as builder

ARG supabase_tag
ARG freeze_tmp_dir
ENV SUPABSE_TAG=$supabase_tag
ENV FREEZE_TMP_DIR=$freeze_tmp_dir

RUN apk update && apk add --no-cache skopeo git curl

WORKDIR "/build"
RUN git clone --depth 1 --branch "${SUPABSE_TAG}" "https://github.com/supabase/supabase"

WORKDIR "/build/supabase/docker"
RUN mv .env.example .env

# Freeze docker images
COPY ./src/freeze-images.sh /usr/bin/freeze-images.sh
RUN sh /usr/bin/freeze-images.sh

################################
# Runtime phase
################################

FROM docker:25.0.5-dind

ARG freeze_tmp_dir
ENV FREEZE_TMP_DIR=$freeze_tmp_dir
ENV APP_ROOT="/home/supabase/docker"
ENV PGRST_DB_SCHEMAS="public, storage, graphql_public, fabric, ethereum"

# Install package dependencies
RUN apk update \
  && apk add --no-cache \
  git \
  curl \
  jq \
  bash \
  supervisor

COPY --from=builder $freeze_tmp_dir $freeze_tmp_dir
COPY --from=builder "/build/supabase/docker/" "$APP_ROOT"

# Setup healtcheck
COPY ./src/healthcheck.sh /bin/healthcheck
RUN chmod +x /bin/healthcheck
HEALTHCHECK --interval=5s --timeout=5s --start-period=45s --retries=90 CMD /bin/healthcheck

# Supabase
EXPOSE 8000
# Postgres
EXPOSE 5432

# Setup supervisor entrypoint
COPY ./src/run-supabase.sh /usr/bin/run-supabase.sh
COPY ./src/supervisord.conf /etc/supervisord.conf

VOLUME /home/supabase/docker/volumes/db/data
VOLUME /home/supabase/docker/volumes/storage

ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
