#!/usr/bin/env bash

# shellcheck disable=SC2154
if [[ -n "${TZ}" ]]; then
  echo "Setting timezone to ${TZ}"
  ln -snf "/usr/share/zoneinfo/$TZ" /etc/localtime && echo "$TZ" > /etc/timezone
fi

cd /chia-blockchain || exit 1

# shellcheck disable=SC1091
. ./activate

chia init --fix-ssl-permissions

echo "configure testnet"
chia configure --testnet true

if [[ ${keys} == "persistent" ]]; then
  echo "Not touching key directories"
elif [[ ${keys} == "generate" ]]; then
  echo "to use your own keys pass the mnemonic as a text file -v /path/to/keyfile:/path/in/container and -e keys=\"/path/in/container\""
  chia keys generate
elif [[ ${keys} == "copy" ]]; then
  if [[ -z ${ca} ]]; then
    echo "A path to a copy of the farmer peer's ssl/ca required."
    exit
  else
  chia init -c "${ca}"
  fi
else
  chia keys add -f "${keys}" -l ""
fi

for p in ${plots_dir//:/ }; do
  mkdir -p "${p}"
  if [[ ! $(ls -A "$p") ]]; then
    echo "Plots directory '${p}' appears to be empty, try mounting a plot directory with the docker -v command"
  fi
  chia plots add -d "${p}"
done

chia configure --upnp "${upnp}"

if [[ -n "${log_level}" ]]; then
  chia configure --log-level "${log_level}"
fi

if [[ -n "${peer_count}" ]]; then
  chia configure --set-peer-count "${peer_count}"
fi

if [[ -n "${outbound_peer_count}" ]]; then
  chia configure --set_outbound-peer-count "${outbound_peer_count}"
fi

if [[ -n ${farmer_address} && -n ${farmer_port} ]]; then
  chia configure --set-farmer-peer "${farmer_address}:${farmer_port}"
fi

if [[ -n ${crawler_db_path} ]]; then
  chia configure --crawler-db-path "${crawler_db_path}"
fi

if [[ -n ${crawler_minimum_version_count} ]]; then
  chia configure --crawler-minimum-version-count "${crawler_minimum_version_count}"
fi

if [[ -n ${self_hostname} ]]; then
  sed -i "s/self_hostname: localhost/self_hostname: $self_hostname/g" "$CHIA_ROOT/config/config.yaml"
fi

# TODO: Document why this is needed
sed -i 's/localhost/127.0.0.1/g' "$CHIA_ROOT/config/config.yaml"

if [[ ${log_to_file} != 'true' ]]; then
  sed -i 's/log_stdout: false/log_stdout: true/g' "$CHIA_ROOT/config/config.yaml"
else
  sed -i 's/log_stdout: true/log_stdout: false/g' "$CHIA_ROOT/config/config.yaml"
fi

# Map deprecated legacy startup options.
if [[ ${farmer} == "true" ]]; then
  service="farmer-only"
elif [[ ${harvester} == "true" ]]; then
  service="harvester"
fi

if [[ ${service} == "harvester" ]]; then
  if [[ -z ${farmer_address} || -z ${farmer_port} || -z ${ca} ]]; then
    echo "A farmer peer address, port, and ca path are required."
    exit
  fi
fi

exec "$@"
