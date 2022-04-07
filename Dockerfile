FROM node:15
WORKDIR /docstore-satellite
COPY package.json ./docstore-satellite
RUN npm i
RUN npm i -g ts-node
RUN npm i -g nodemon
COPY . /docstore-satellite