#!/usr/bin/env sh

echo "# Stop running indy"
docker compose down

echo "# Clean Indy data"
rm -fr /tmp/indy-all-in-one

echo "# Remove cacti wallets from '~/.afj' (Aries JS Framework)"
sudo find ~/.afj/data/wallet/ -iname '*cacti*' -exec rm -fr {} \;

echo "# OK"