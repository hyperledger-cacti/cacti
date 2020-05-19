# Copyright 2019 Fujitsu Laboratories Ltd.
# SPDX-License-Identifier: Apache-2.0
FROM hyperledger/fabric-ccenv:x86_64-1.0.4
#ENV http_proxy $HTTP_PROXY
#ENV https_proxy $HTTP_PROXY
#ENV HTTP_PROXY $HTTP_PROXY
#ENV HTTPS_PROXY $HTTP_PROXY
#ENV NO_PROXY "rest-server,ec1-connector,ec2-connector,geth1,geth2"
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv A15703C6
RUN echo "deb [ arch=amd64 ] http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.4.list
RUN apt update
RUN apt-get install -y --allow-unauthenticated mongodb-org=3.4.7 mongodb-org-server=3.4.7 mongodb-org-shell=3.4.7 mongodb-org-mongos=3.4.7 mongodb-org-tools=3.4.7
RUN apt-get install -y screen
RUN apt-get install -y npm
#RUN npm -g config set proxy $HTTP_PROXY
RUN npm -g install n
RUN n --version
RUN n 6.9.1
RUN npm -g install express
