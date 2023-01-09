#!/bin/bash

set -e

FREEZE_SCRIPT_NAME="download-frozen-image-v2.sh"
FREEZE_SCRIPT_PATH="/usr/bin/${FREEZE_SCRIPT_NAME}"

echo "Download freeze script..."
curl -sSL https://raw.githubusercontent.com/moby/moby/dedf8528a51c6db40686ed6676e9486d1ed5f9c0/contrib/download-frozen-image-v2.sh > "${FREEZE_SCRIPT_PATH}"
chmod +x "${FREEZE_SCRIPT_PATH}"

# Get list of images from docker-compose
for img in `grep 'image:' docker-compose.yml | tr -d ' ' | cut -d':' -f2,3`
do
  img_path="${FREEZE_TMP_DIR}/${img/\//-}"
  echo "Freeze image '${img}' in '${img_path}"
  mkdir -p "${img_path}"
  bash "${FREEZE_SCRIPT_PATH}" "${img_path}"  "${img}"
done

echo "Image freeze done."