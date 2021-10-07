FROM ubuntu:xenial

RUN apt-get update && apt-get upgrade -y && apt-get install -y software-properties-common gnupg 
#RUN gnupg1 gnupg2

RUN apt-get install -y \
      apt-utils \
      apt-transport-https \
      software-properties-common \
      wget \
      curl \
      telnet \
      sudo \
      build-essential \
      libffi-dev \
      libssl-dev \
      zlib1g-dev \
      liblzma-dev \
      libbz2-dev \
      libreadline-dev \
      libsqlite3-dev \
      git \
      gnupg

# install python 3.9.5
#RUN apt-get install -y python3 python3-pip
RUN git clone https://github.com/pyenv/pyenv.git ~/.pyenv
RUN echo 'export PATH="$HOME"/.pyenv/bin:$PATH' >> ~/.rc
RUN . ~/.rc && pyenv install 3.9.5
RUN echo 'eval "$(pyenv init -)"' >> ~/.rc
RUN echo 'eval "$(pyenv init --path)"' >> ~/.rc
RUN cat ~/.rc >> ~/.bashrc
RUN . ~/.rc && pyenv global 3.9.5

RUN apt-get install -y nodejs npm
RUN npm install n -g
RUN n 12
RUN apt purge -y nodejs npm

CMD [ "tail", "-f", "/dev/null" ]
