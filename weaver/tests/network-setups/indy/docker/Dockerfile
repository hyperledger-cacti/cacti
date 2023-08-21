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

RUN pip3 install jsonpickle==0.9.6 ujson==1.33 prompt_toolkit==0.57 pygments==2.2.0 rlp==0.5.1 sha3==0.2.1 leveldb ioflo==1.5.4 semver==2.7.9 base58==1.0.0 orderedset==2.0.3 sortedcontainers==1.5.7 psutil==5.6.6 importlib_metadata>=2.0 portalocker==0.5.7 libnacl==1.6.1 six==1.11.0 intervaltree==2.1.0 msgpack-python==0.4.6 python-rocksdb==0.6.9 python-dateutil==2.6.1 pympler==0.8 packaging==19.0 python-ursa==0.1.1 pyzmq==18.1.0


WORKDIR /usr/src/indy_projects/indy-node
RUN python3 setup.py install


WORKDIR /usr/src/indy_projects
COPY scripts/create_dirs_modified.sh /usr/src/indy_projects/indy-node/scripts/
RUN /usr/src/indy_projects/indy-node/scripts/create_dirs_modified.sh

COPY scripts/run_indy_nodes.sh run_indy_nodes.sh
CMD ./run_indy_nodes.sh
