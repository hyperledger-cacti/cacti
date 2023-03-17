FROM node:16

ENV PACKAGE_PATH=/opt/cactus-plugin-persistence-ethereum

WORKDIR ${PACKAGE_PATH}

# CMake is required by one of npm dependencies (install other packages in this step as well in the future)
RUN apt-get update && apt-get install -y cmake && rm -rf /var/lib/apt/lists/*

COPY ./dist/yarn.lock ./package.json ./
RUN yarn install --production --ignore-engines --non-interactive --cache-folder ./.yarnCache && \
    rm -rf ./.yarnCache

COPY ./dist ./dist
