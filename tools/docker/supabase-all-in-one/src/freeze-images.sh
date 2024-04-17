#!/bin/sh

set -e

# Get list of images from docker-compose
for img in `grep 'image:' docker-compose.yml | tr -d ' ' | cut -d':' -f2,3`
do
  img_dir=$(echo "$img" | sed 's/[:\/]/-/g') # replace '\' and ':' with '-'
  img_path="${FREEZE_TMP_DIR}/${img_dir}"
  echo "Freeze image '${img}' in '${img_path}'"
  mkdir -p "${img_path}"

  skopeo copy "docker://${img}" "docker-archive:${img_path}/archive.tar:${img}"
  tar -zcf "${img_path}/archive.tar.gz" "${img_path}/archive.tar"
  rm -fr "${img_path}/archive.tar"
done

echo "Image freeze done."
