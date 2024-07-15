#!/bin/bash
jwt_content=$(cat jwt)
set -e
curl -X GET http://localhost:7575/v1/query   -H "Content-Type: application/json"   -H "Authorization: Bearer $jwt_content"

echo "DAML API Success!"