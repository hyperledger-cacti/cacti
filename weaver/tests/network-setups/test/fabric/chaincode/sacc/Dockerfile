FROM golang:1.14.6-alpine AS build

COPY . /go/src/github.com/sacc
WORKDIR /go/src/github.com/sacc

# Build application
RUN go build -o sacc -v .

# Production ready image
# Pass the binary to the prod image
FROM alpine:3.11 as prod

COPY --from=build /go/src/github.com/sacc/sacc /app/sacc

USER 1000

WORKDIR /app
CMD ./sacc
