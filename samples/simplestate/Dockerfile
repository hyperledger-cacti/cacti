FROM golang:1.14.6-alpine AS build

COPY . /go/src/github.com/simplestate
WORKDIR /go/src/github.com/simplestate

# Build application
RUN go build -o simplestate -v .

# Production ready image
# Pass the binary to the prod image
FROM alpine:3.11 as prod

COPY --from=build /go/src/github.com/simplestate/simplestate /app/simplestate

USER 1000

WORKDIR /app
CMD ./simplestate
