FROM node:14-alpine AS build
RUN apk add g++ make python dumb-init
COPY --chown=node:node src src
COPY --chown=node:node package.json package.json
COPY --chown=node:node tsconfig.json tsconfig.json

RUN npm install --production
RUN npm install typescript
RUN npm run build

FROM node:14-alpine
ENV NODE_ENV production

COPY --chown=node:node --from=build . .
USER node
ENTRYPOINT [ "dumb-init", "--", "npm", "run"]
CMD ["start"]