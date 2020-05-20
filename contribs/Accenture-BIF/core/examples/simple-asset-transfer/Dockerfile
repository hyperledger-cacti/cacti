FROM node:10-slim

RUN apt-get update && apt-get install -y \
  build-essential \
  python-minimal \
  software-properties-common

ADD . /federation
WORKDIR /federation

# Rebuild node modules inside container to compile platform specific dependencies
RUN npm rebuild

CMD node app.js
