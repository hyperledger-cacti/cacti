FROM node:16@sha256:f77a1aef2da8d83e45ec990f45df50f1a286c5fe8bbfb8c6e4246c6389705c0b

ENV PACKAGE_PATH=/opt/cactus-plugin-persistence-ethereum

WORKDIR ${PACKAGE_PATH}

# CMake is required by one of npm dependencies (install other packages in this step as well in the future)
RUN apt-get update && apt-get install -y cmake && rm -rf /var/lib/apt/lists/*

COPY ./dist/yarn.lock ./package.json ./
RUN yarn install --production --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
    rm -rf ./.yarnCache

COPY ./dist ./dist
