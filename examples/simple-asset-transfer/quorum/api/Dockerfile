FROM node:8
RUN apt-get update \
        && apt-get install -y --no-install-recommends apt-utils \
        && apt-get install -y netcat && rm -rf /var/lib/apt/lists/*
ADD ./api /src
ADD ./contracts /contracts
WORKDIR /src
RUN git config --global url."https://github.com/".insteadOf git@github.com: \
        && git config --global url."https://".insteadOf git:// \
        && npm install --unsafe-perm
CMD sh -c './scripts/wait-for.sh -t 6000 qserver1:5050 -- node index.js'