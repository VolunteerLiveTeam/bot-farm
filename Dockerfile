FROM node AS build

WORKDIR /usr/src/app

COPY package.json package.json
COPY yarn.lock yarn.lock
RUN yarn --frozen-lockfile

COPY . .

RUN yarn run build

FROM node

WORKDIR /usr/src/app

COPY package.json package.json
COPY yarn.lock yarn.lock

COPY --from=build /usr/src/app/dist ./dist

RUN yarn --frozen-lockfile --production

CMD ["node", "dist/index.js"]