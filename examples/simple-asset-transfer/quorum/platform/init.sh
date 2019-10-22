#!/bin/bash
set -u
set -e

function usage() {
  echo ""
  echo "Usage:"
  echo "    $0 [raft | istanbul | clique]"
  echo ""
  echo "Where:"
  echo "    raft | istanbul | clique (default = raft): specifies which consensus algorithm to use"
  echo ""
  exit -1
}

consensus=raft
while (( "$#" )); do
    case "$1" in
        raft)
            consensus=raft
            shift
            ;;
        istanbul)
            consensus=istanbul
            shift
            ;;
        clique)
            consensus=clique
            shift
            ;;
        --help)
            shift
            usage
            ;;
        *)
            echo "Error: Unsupported command line parameter $1"
            usage
            ;;
    esac
done

./$consensus-init.sh