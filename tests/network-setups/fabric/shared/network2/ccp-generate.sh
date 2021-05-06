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
    sed -e "s/\${ORG}/$1/" \
        -e "s/\${P0PORT}/$2/" \
        -e "s/\${CAPORT}/$3/" \
        -e "s#\${PEERPEM}#$PP#" \
        -e "s#\${CAPEM}#$CP#" \
        $6/ccp-template.yaml | sed -e $'s/\\\\n/\\\n        /g'
}

ORG=1
P0PORT=9051
CAPORT=5054
PEERPEM=$1/peerOrganizations/org1.network2.com/tlsca/tlsca.org1.network2.com-cert.pem
CAPEM=$1/peerOrganizations/org1.network2.com/ca/ca.org1.network2.com-cert.pem

echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM $1)" > $1/peerOrganizations/org1.network2.com/connection-org1.json
echo "$(yaml_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM $1)" > $1/peerOrganizations/org1.network2.com/connection-org1.yaml
echo "PEER PEM:" $PEERPEM
echo "CA PEM:" $CAPEM

#ORG=2
#P0PORT=9051
#CAPORT=8054
#PEERPEM=organizations/peerOrganizations/org2.network2.com/tlsca/tlsca.org2.network2.com-cert.pem
#CAPEM=organizations/peerOrganizations/org2.network2.com/ca/ca.org2.network2.com-cert.pem

#echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/org2.network2.com/connection-org2.json
#echo "$(yaml_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/org2.network2.com/connection-org2.yaml
