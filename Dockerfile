# syntax = docker/dockerfile:1

FROM node:20

LABEL fly_launch_runtime="Node.js"

WORKDIR /app
ENV NODE_ENV="production"
ENV PORT="8080"

EXPOSE 8080
CMD [ "node", "server.js" ]