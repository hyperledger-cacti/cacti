#!/bin/bash

for i in $(seq 4); do
  mkdir -p iroha${i}/tmp/block_store
done

exit 0
