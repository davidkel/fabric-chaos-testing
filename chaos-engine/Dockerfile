FROM node:14-alpine
ADD src src
ADD scenarios scenarios
ADD package.json package.json
ADD tsconfig.json tsconfig.json
RUN npm install --production && npm install typescript && npm run build
