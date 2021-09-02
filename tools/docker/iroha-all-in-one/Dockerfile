FROM ubuntu:20.04 as builder
ARG DEBIAN_FRONTEND=noninteractive

RUN set -e && apt-get update && apt-get install -y --no-install-recommends \
    file build-essential ninja-build git ca-certificates tar curl unzip cmake pkg-config zip
RUN git clone https://github.com/hyperledger/iroha.git -b 1.2.0 
RUN iroha/vcpkg/build_iroha_deps.sh && vcpkg/vcpkg integrate install
WORKDIR /iroha/build/
RUN cmake -DCMAKE_TOOLCHAIN_FILE=/vcpkg/scripts/buildsystems/vcpkg.cmake -DCMAKE_BUILD_TYPE=Release -DBUILD_TYPE=Release -DPACKAGE_DEB=ON -G "Ninja" ..
RUN cmake --build . --target package -- -j$(nproc)

FROM ubuntu:20.04
ARG DEBIAN_FRONTEND=noninteractive  
RUN set -e && apt-get update && \   
    apt-get install -y moreutils jq python3 python3-pip && \
    pip install iroha && \
    apt-get purge -y `apt-get -s purge python3-pip | grep '^ ' | tr -d '*'` && \
    apt-get -y clean && \
    rm -rf /var/lib/apt/lists/*
# irohad is the core of Iroha ledger
COPY --from=builder /iroha/build/bin/irohad /usr/bin/irohad
# copying iroha-cli optional; only copied for debugging purpose
COPY --from=builder /iroha/build/bin/iroha-cli /usr/bin/iroha-cli
# files below are necessary
COPY --from=builder /iroha/example/ /opt/iroha_data/
COPY --from=builder /iroha/docker/release/wait-for-it.sh /
COPY genesis.block /opt/iroha_data/genesis.block
COPY entrypoint.sh healthcheck.py /
RUN chmod +x /entrypoint.sh /wait-for-it.sh

WORKDIR /opt/iroha_data
ENTRYPOINT ["/entrypoint.sh"]
CMD ["irohad"]