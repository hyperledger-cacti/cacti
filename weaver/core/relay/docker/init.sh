#!/bin/sh

FINGERPRINT_PATH=$(pwd)/fingerprint.json

if [ -f "${FINGERPRINT_PATH}" ]; then
	
  FINGERPRINT=$(cat ${FINGERPRINT_PATH})
  
  RELAY_VERSION=$(echo ${FINGERPRINT}        | cut -d ',' -f 1 | cut -d ':' -f 2 | tr -d ' "')
  RELAY_PROTOS_VERSION=$(echo ${FINGERPRINT} | cut -d ',' -f 2 | cut -d ':' -f 2 | tr -d ' "')
  RELAY_GIT_COMMIT=$(echo ${FINGERPRINT}     | cut -d ',' -f 3 | cut -d ':' -f 2 | tr -d ' "')
  RELAY_GIT_BRANCH=$(echo ${FINGERPRINT}     | cut -d ',' -f 4 | cut -d ':' -f 2 | tr -d ' "')
  RELAY_TIMESTAMP=$(echo ${FINGERPRINT}      | cut -d ',' -f 5 | cut -d ':' -f 2 | tr -d ' "}')
 
fi

# This function writes the message that is passed as argument
# to the standard output if the environment variable DEBUG is
# set to true, otherwise skips the operation.
# - $1: debug message to be logged
#
function debug() {
  if [ "${DEBUG}" == "true" ]; then
    echo $1
  fi
}

# This function dumps the content of the file located at the
# path that is passed as argument, if the environment variable
# DEBUG is set to true, otherwise it skips the operation.
# - $1: path to the file to cat to the standard output
# 
function debug_cat() {
  if [ "${DEBUG}" == "true" ]; then
     echo ""
     echo "File: $1"
     echo "-----------------------------------------------"
     cat $1
     echo "-----------------------------------------------"
     echo ""
  fi
}

# This function writes the details of the fingerprint
# as it has been extracted by the fingerprint file.
#
function write_fingerprint() {

  echo "    - Fingerprint File           : ${FINGERPRINT_PATH}"
  echo "    - Version:                   : ${RELAY_VERSION}"
  echo "    - Protos Version:            : ${RELAY_PROTOS_VERSION}"
  echo "    - Branch / Commit:           : ${RELAY_GIT_BRANCH}@${RELAY_GIT_COMMIT}"
  echo "    - Build Timestap:            : ${RELAY_TIMESTAMP}"
}

# This function writes an error message in the console log
# and then exits with the specified exit code.
# - $1: error message to print
# - $2: exit code to terminate the process (default: 1)
#
function error() {
   echo "[ERROR] - ${1}"
   exit ${2:-1}  
}

# This function checks that a file exists otherwise it exits
# with the specified exit code.
# - $1: path to the file to check
# - $2: error exit code to use in case the file does not exist (default: 1)
#
function require_file() {

   if [ ! -f "${1}" ]; then
     error "File ${1} does not exist." ${2:-1}  
   fi
}

# This function replaces all the environment variables that are in the
# template file passed as argument and generates a file with the
# corresponding actual values in the path passed as second argument.=
# - $1: path to the template file
# - $2: path to the output file
#
function specialise_file() {
   LIST=$(env | paste -sd ' ' -)
   for PAIR in ${LIST}; do
     KEY=$(echo $PAIR | cut -d '=' -f 1)
     VALUE=$(echo $PAIR | cut -d '=' -f 2)

     debug "(specialise) -e s#\${${KEY}}#${VALUE}#g"
    
     SUBSTITUTION=$SUBSTITUTION'-e s#${'$KEY'}#'${VALUE}'#g '
   done
   
   debug "(specialise) sed: sed ${SUSTITUTION} < $1 > $2"
   
   sed $SUBSTITUTION < $1 > $2

   debug_cat $2
}






