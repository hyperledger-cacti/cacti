FROM paritytech/ci-linux:production as builder

RUN cargo install contracts-node

## second stage
FROM ubuntu:20.04

COPY --from=builder /usr/local/cargo/bin/substrate-contracts-node /usr/local/bin/

RUN apt-get update && apt-get install -y supervisor \
    && apt-get install wget -y \
    && wget -qO /usr/local/bin/websocat https://github.com/vi/websocat/releases/download/v1.11.0/websocat.x86_64-unknown-linux-musl \
    && chmod a+x /usr/local/bin/websocat

COPY ./healthcheck.sh /usr/bin/

RUN chmod a+x /usr/bin/healthcheck.sh

HEALTHCHECK --interval=10s --timeout=10s --start-period=30s --retries=10 \
    CMD ["/usr/bin/healthcheck.sh"]

# for substrate node
EXPOSE 9944
# for supervisord
EXPOSE 9001

COPY supervisord.conf /etc/supervisord.conf

ENTRYPOINT ["/usr/bin/supervisord"]

CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
