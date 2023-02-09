FROM ubuntu:20.04


RUN apt update
RUN DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC apt install -y zlib1g-dev libbz2-dev python3 python3-pip build-essential git librocksdb-dev libsnappy-dev liblz4-dev libsodium-dev cmake autoconf libtool pkg-config libssl-dev curl

WORKDIR /usr/src/indy_projects

RUN git clone https://github.com/hyperledger/indy-node
RUN git clone -b did_plugin https://github.com/ghoshbishakh/indy-plenum
RUN git clone https://github.com/hyperledger/ursa.git

# build ursa
RUN curl -sSf https://sh.rustup.rs | sh -s -- -y
RUN rm /bin/sh && ln -s /bin/bash /bin/sh
RUN source "$HOME/.cargo/env" && cd ursa && git checkout v0.3.2 && cargo build --release
RUN echo 'export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/src/indy_projects/ursa/target/release/' >> /etc/bash.bashrc


RUN python3 -m pip install -U pip
RUN python3 -m pip uninstall -y indy-plenum
RUN python3 -m pip uninstall -y indy-node

RUN cd indy-plenum && python3 setup.py install

WORKDIR /usr/src/indy_projects/indy-node
RUN python3 setup.py install


WORKDIR /usr/src/indy_projects
COPY scripts/create_dirs_modified.sh /usr/src/indy_projects/indy-node/scripts/
RUN /usr/src/indy_projects/indy-node/scripts/create_dirs_modified.sh

COPY scripts/run_indy_nodes.sh run_indy_nodes.sh
CMD ./run_indy_nodes.sh
