#!/bin/sh

# Check if CPI has been generated
check_cpi_exists() {
  local file_path="/CSDE-cordapp-template-kotlin/workflows/build/MyCorDapp-1.0-SNAPSHOT.cpi"

  if [ ! -f "$file_path" ]; then
    echo "CPI file not found at $file_path. Exiting with status code 1."
    exit 1
  else
    echo "CPI file found at $file_path."
  fi
}

# Check if the endpoint is accessible
checkCurlSuccess() {
    echo "Executing checkCurlSuccess function..."
    local response_code
    response_code=$(curl -k -s -o /dev/null -w "%{http_code}" -u admin:admin "https://localhost:8888/api/v1/cpi")
    if [ "$response_code" -eq 200 ]; then
        echo "CURL request successful."
    else
        echo "CURL request failed with response code: $response_code"
        exit 1
    fi
}
check_cpi_exists
checkCurlSuccess

exit 0