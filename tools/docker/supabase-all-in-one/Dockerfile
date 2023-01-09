FROM docker:20.10.21-dind

ARG SUPABSE_TAG="v0.22.10"

ENV FREEZE_TMP_DIR="/opt/docker-freeze"

# Install package dependencies
RUN apk update \
  && apk add --no-cache \
    git \
    curl \
    jq \
    bash \
    supervisor

WORKDIR /home
RUN git clone --depth 1 --branch "${SUPABSE_TAG}" "https://github.com/supabase/supabase"

WORKDIR /home/supabase/docker
RUN cp .env.example .env

# Freeze docker images
COPY ./src/freeze-images.sh /usr/bin/freeze-images.sh
RUN bash /usr/bin/freeze-images.sh

# Setup healtcheck
COPY ./src/healthcheck.sh /bin/healthcheck
RUN chmod +x /bin/healthcheck
HEALTHCHECK --interval=5s --timeout=5s --start-period=45s --retries=90 CMD /bin/healthcheck

# Expose ledger ports
EXPOSE 3000
EXPOSE 8000
EXPOSE 5432

# Setup supervisor entrypoint
COPY ./src/run-supabase.sh /usr/bin/run-supabase.sh
COPY ./src/supervisord.conf /etc/supervisord.conf
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
