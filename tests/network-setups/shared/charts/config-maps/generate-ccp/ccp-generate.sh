#!/bin/bash

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
        -e "s/\${NW}/$6/" \
        -e "s/\${ORGMSP}/$7/" \
        $8
}

echo "$(json_ccp $ORG $P0PORT $CAPORT $PEERPEM $CAPEM $NW $ORGMSP $CCP_TEMPLATE)" > $CCPPATH
echo "PEER PEM:" $PEERPEM
echo "CA PEM:" $CAPEM
