FROM alpine AS build
WORKDIR /

RUN apk add --update nodejs yarn

COPY package.json .
COPY yarn.lock .
COPY tsconfig.json .
COPY src ./src

RUN yarn install --frozen-lockfile
RUN yarn build

FROM alpine
WORKDIR /

COPY --from=build /node_modules/ ./node_modules
COPY --from=build /dist ./dist

RUN apk add --update postgresql-client nodejs yarn

ENTRYPOINT [ "node", "dist/index.js" ]