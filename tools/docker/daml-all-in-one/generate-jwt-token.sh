#!/bin/sh

#This will generate the Auth Bearer Token identical on how will it be generated at https://jwt.io/
header=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | sed s/\+/-/g | sed 's/\//_/g' | sed -E s/=+$//)
payload=$(echo -n '{"https://daml.com/ledger-api": {"ledgerId": "sandbox", "applicationId": "foobar","actAs":["Alice"]}}' | openssl base64 -e -A | sed s/\+/-/ | sed -E s/=+$//)
hmac_signature=$(echo -n '$header.$payload' | openssl dgst -sha256 -hmac secret -binary | openssl base64 -e -A | sed s/\+/-/ | sed -E s/=+$//)

export jwt=$header.$payload.$hmac_signature
echo $jwt > jwt
