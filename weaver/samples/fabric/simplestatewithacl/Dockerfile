FROM golang:1.14.6-alpine AS build

COPY . /go/src/github.com/simplestatewithacl
WORKDIR /go/src/github.com/simplestatewithacl

# Build application
RUN go build -o simplestatewithacl -v .

# Production ready image
# Pass the binary to the prod image
FROM alpine:3.11 as prod

COPY --from=build /go/src/github.com/simplestatewithacl/simplestate /app/simplestatewithacl

USER 1000

WORKDIR /app
CMD ./simplestatewithacl
