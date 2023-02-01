FROM node:10

USER root
WORKDIR /fabric-cli

ADD . .
COPY .npmrc /root

#RUN npm install
#RUN npm install -g yarn

#RUN npm install @res-dlt-interop/fabric-cli
# RUN yarn
RUN npm install
RUN yarn link
RUN rm /root/.npmrc
