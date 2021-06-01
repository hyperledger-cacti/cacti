#!/bin/sh

IROHA_NODE="iroha_node_"
TTY="/dev/pts/"

if [ "$(uname -s)" = "Darwin" ]; then
  N=$(w -h | wc -l)

  w -h >/tmp/i.$$
  cat /tmp/i.$$ | grep -v console >/tmp/ilogs.$$
  rm /tmp/i.$$

  TTY="/dev/tty"
else
  ps -ef | awk '{print $6}' | grep pts | sort | uniq | sed 's/\// /' >/tmp/ilogs.$$
  N=$(cat /tmp/ilogs.$$ | wc -l)
fi

if [ $N -gt 4 ]; then
  N=4
fi

for i in $(seq ${N}); do
  NAME=$(cat /tmp/ilogs.$$ | sed -n ${i}p | awk '{ print $2 }')

  docker logs -f ${IROHA_NODE}$((i)) >${TTY}${NAME} &
done

rm /tmp/ilogs.$$

exit 0
