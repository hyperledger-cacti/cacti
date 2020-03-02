FROM node:10-slim

RUN apt-get update && apt-get install -y \
  build-essential \
  python-minimal \
  software-properties-common

ADD ./api /src
ADD ./contracts /contracts
ADD ./artifacts /artifacts

WORKDIR /src

RUN npm install

# Rebuild node modules inside container to compile platform specific dependencies
RUN npm rebuild

ENV HOST 0.0.0.0
ENV PORT 4000

CMD ["node", "app.js"]