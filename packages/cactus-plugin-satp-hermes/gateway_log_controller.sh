#!/bin/bash

GATEWAY_LOGDIR="/opt/cacti/satp-hermes/logs"
LOGFILE_MAXSIZE=10485760  # 10MB

if [ "$1" == "stdout" ]; then
    LOGFILE="$GATEWAY_LOGDIR/satp-gateway-output.log"
    OUT_REDIRECT=1 # redirect to stdout
elif [ "$1" == "stderr" ]; then
    LOGFILE="$GATEWAY_LOGDIR/satp-gateway-error.log"
    OUT_REDIRECT=2 # redirect to stderr
else
    echo "ERROR: invalid argument. Can only redirect to 'stdout' or 'stderr'."
    exit 1
fi

touch "$LOGFILE"
exec 3>>"$LOGFILE"

change_logfile() {
    exec 3>&- # close file descriptor 3
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    mv "$LOGFILE" "$LOGFILE.$TIMESTAMP" # rename old log file

    # create and open new log file
    touch "$LOGFILE"
    exec 3>>"$LOGFILE"
}

while IFS= read -r line; do
    SIZE=$(stat -c %s "$LOGFILE")
    if [ "$SIZE" -ge "$LOGFILE_MAXSIZE" ]; then
        change_logfile
    fi

    # Write to log file and redirect to appropriate output
    echo "$line" | tee -a "$LOGFILE" >&$OUT_REDIRECT
done