#!/bin/bash

echo $1

function one_line_pem {
    echo "`awk 'NF {sub(/\\n/, ""); printf "%s\\\\\\\n",$0;}' $1`"
}

function json_ccp {
    local PP=$(one_line_pem $4)
    local CP=$(one_line_pem $5)
    sed -e "s/\${ORG}/$1/" \
        -e "s/\${P0PORT}/$2/" \
        -e "s/\${CAPORT}/$3/" \
        -e "s#\${PEERPEM}#$PP#" \
        -e "s#\${CAPEM}#$CP#" \
        $6/ccp-template.json
}

function yaml_ccp {
    local PP=$(one_line_pem $4)
    local CP=$(one_line_pem $5)
    local OP=$(one_line_pem $7)
    sed -e "s/\${ORG}/$1/" \
        -e "s/\${P0PORT}/$2/" \
        -e "s/\${CAPORT}/$3/" \
        -e "s#\${PEERPEM}#$PP#" \
        -e "s#\${CAPEM}#$CP#" \
        -e "s#\${ORDERER_PORT}#$6#" \
        -e "s#\${ORDERER_PEM}#$OP#" \
        $8/ccp-template.yaml | sed -e $'s/\\\\n/\\\n        /g'
}

ORDERER_PORT=7050
ORDERER_PEM=$1/ordererOrganizations/network1.com/msp/tlscacerts/tlsca.network1.com-cert.pem
ORG=1
P0PORT=7051
CAPORT=7054
PEERPEM=$1/peerOrganizations/org1.network1.com/tlsca/tlsca.org1.network1.com-cert.pem
CAPEM=$1/peerOrganizations/org1.network1.com/ca/ca.org1.network1.com-cert.pem

echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM $1)" > $1/peerOrganizations/org1.network1.com/connection-org1.json
echo "$(yaml_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM $ORDERER_PORT $ORDERER_PEM $1)" > $1/peerOrganizations/org1.network1.com/connection-org1.yaml
echo "PEER PEM:" $PEERPEM
echo "CA PEM:" $CAPEM

ORG=2
P0PORT=7061
CAPORT=7064
PEERPEM=$1/peerOrganizations/org2.network1.com/tlsca/tlsca.org2.network1.com-cert.pem
CAPEM=$1/peerOrganizations/org2.network1.com/ca/ca.org2.network1.com-cert.pem

echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM $1)" > $1/peerOrganizations/org2.network1.com/connection-org2.json
echo "$(yaml_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM $ORDERER_PORT $ORDERER_PEM $1)" > $1/peerOrganizations/org2.network1.com/connection-org2.yaml
echo "PEER PEM:" $PEERPEM
echo "CA PEM:" $CAPEM
