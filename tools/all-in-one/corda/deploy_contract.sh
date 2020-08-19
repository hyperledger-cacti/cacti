#!/bin/sh

if [ "$#" -ne 1 ]; then
    echo "Illegal number of parameters"
    exit 2
fi

cordapp=$1

echo "building cordapp: $1"
cp smart-contracts
