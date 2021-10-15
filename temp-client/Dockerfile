FROM node:14-alpine
RUN apk add g++ make python
ADD src src
ADD package.json package.json
ADD tsconfig.json tsconfig.json
RUN npm install --production && npm install typescript && npm run build
