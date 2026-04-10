#!/bin/bash

# Root of repo
ROOT_DIR=${2:-'.'}

# Repo full go path
REPO='github.com/hyperledger-cacti/cacti'

# install go-checksum
echo "Installing go-checksum..."
go install github.com/vikyd/go-checksum@latest
echo "Installed."

GOMODULE_PATHS=("weaver/common/protos-go"
"weaver/core/network/fabric-interop-cc/libs/utils"
"weaver/core/network/fabric-interop-cc/libs/assetexchange"
"weaver/core/network/fabric-interop-cc/interfaces/asset-mgmt"
"weaver/core/network/fabric-interop-cc/contracts/interop"
"weaver/sdks/fabric/go-sdk"
"weaver/samples/fabric/go-cli"
"weaver/samples/fabric/simpleasset"
"weaver/samples/fabric/satpsimpleasset"
"weaver/samples/fabric/simpleassetandinterop"
"weaver/samples/fabric/simpleassettransfer"
"weaver/samples/fabric/simplestatewithacl"
"weaver/samples/fabric/simplestate")

VERSION=${1:-"2.1.0"}
OLD_VERSION=$(cat weaver/common/protos-go/VERSION)

echo "REPO: $REPO"
echo "OLD_VERSION: $OLD_VERSION"
echo "VERSION: $VERSION"

# Strip leading 'v' if present to normalize version
NORMALIZED_VERSION=$VERSION
if [ "${VERSION:0:1}" = "v" ]; then
  NORMALIZED_VERSION=${VERSION:1}
fi

# Extract major version from normalized VERSION
MAJOR_VERSION=$(echo $NORMALIZED_VERSION | cut -d '.' -f 1)
NEW_MAJOR_VER=""
if [ "$MAJOR_VERSION" -gt "1" ]; then
  NEW_MAJOR_VER="/v${MAJOR_VERSION}"
fi

OLD_MAJOR_VER=$(echo $OLD_VERSION | cut -d '.' -f 1)
if [ "$MAJOR_VERSION" -gt "1" ]; then
  OLD_MAJOR_VER="/v${OLD_MAJOR_VER}"
fi

echo "OLD_MAJOR_VER: $OLD_MAJOR_VER"
echo "NEW_MAJOR_VER: $NEW_MAJOR_VER"

# Function to get OLD major version suffix for a module based on its current VERSION file
get_old_module_major_ver() {
  local module_path=$1
  local version_file="$ROOT_DIR/$module_path/VERSION"
  
  if [ ! -f "$version_file" ]; then
    echo ""
    return
  fi
  
  local old_version=$(cat "$version_file")
  # Strip leading 'v' if present
  if [ "${old_version:0:1}" = "v" ]; then
    old_version=${old_version:1}
  fi
  
  local old_major=$(echo $old_version | cut -d '.' -f 1)
  if [ "$old_major" -gt "1" ]; then
    echo "/v${old_major}"
  else
    echo ""
  fi
}

# Function to update go.mod module declaration
update_gomod_module_name() {
  local go_mod_file="$1"
  local old_module_name="$2"
  local new_module_name="$3"
  
  if [ -f "$go_mod_file" ]; then
    # Update module declaration line
    sed -i.bak "s|^module ${old_module_name}$|module ${new_module_name}|g" "$go_mod_file"
    rm -f "${go_mod_file}.bak"
  fi
}

# Function to update import paths in Go source files and markdown files
update_import_paths() {
  echo "Collecting all files to update..."
  
  # Collect Go files and markdown files separately
  local go_files=""
  local md_files=""
  
  # Collect from each module directory
  for module in ${GOMODULE_PATHS[@]}; do
    local module_go_files=$(find "$ROOT_DIR/$module" -type f -name "*.go" 2>/dev/null)
    local module_md_files=$(find "$ROOT_DIR/$module" -type f -name "*.md" 2>/dev/null)
    go_files="$go_files $module_go_files"
    md_files="$md_files $module_md_files"
  done
  
  # Collect from docs directory
  local docs_files=$(find "$ROOT_DIR/docs" -type f -name "*.md" 2>/dev/null)
  md_files="$md_files $docs_files"
  
  local go_count=$(echo "$go_files" | wc -w | tr -d ' ')
  local md_count=$(echo "$md_files" | wc -w | tr -d ' ')
  echo "Found $go_count .go files and $md_count .md files to check"
  
  echo "Updating import paths across all files..."
  
  # For each dependency module that has a VERSION file, update references
  for dep_module in ${GOMODULE_PATHS[@]}; do
    # Check if this dependency has a VERSION file
    if [ ! -f "$ROOT_DIR/$dep_module/VERSION" ]; then
      continue
    fi
    
    # Get the OLD version for this dependency
    local old_version=$(cat "$ROOT_DIR/$dep_module/VERSION")
    # Strip leading 'v' if present
    if [ "${old_version:0:1}" = "v" ]; then
      old_version=${old_version:1}
    fi
    
    # Calculate old major version suffix
    local old_major=$(echo $old_version | cut -d '.' -f 1)
    local old_dep_major_ver=""
    if [ "$old_major" -gt "1" ]; then
      old_dep_major_ver="/v${old_major}"
    fi
    
    local base_import="$REPO/$dep_module"
    local old_import="${base_import}${old_dep_major_ver}"
    local new_import="${base_import}${NEW_MAJOR_VER}"
    
    # Only update if there's a change
    if [ "$old_import" != "$new_import" ]; then
      echo "  Updating references: $old_import -> $new_import (version: $old_version -> $NORMALIZED_VERSION)"
      
      # Update Go files (import paths only, no version numbers)
      for file in $go_files; do
        if [ -f "$file" ]; then
          sed -i.bak \
            -e "s|${old_import}/|${new_import}/|g" \
            -e "s|${old_import}\"|${new_import}\"|g" \
            "$file"
          
          # Check if file was modified by comparing with backup
          if ! cmp -s "$file" "${file}.bak" 2>/dev/null; then
            echo "    Updated: $file"
          fi
          rm -f "${file}.bak"
        fi
      done
      
      # Update markdown files (import paths AND version numbers)
      for file in $md_files; do
        if [ -f "$file" ]; then
          sed -i.bak -E \
            -e "s|${old_import} v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?|${new_import} v${NORMALIZED_VERSION}|g" \
            -e "s|${old_import}/|${new_import}/|g" \
            -e "s|${old_import}\"|${new_import}\"|g" \
            -e "s|${old_import}\)|${new_import})|g" \
            -e "s|${old_import}$|${new_import}|g" \
            "$file"
          
          # Check if file was modified by comparing with backup
          if ! cmp -s "$file" "${file}.bak" 2>/dev/null; then
            echo "    Updated: $file"
          fi
          rm -f "${file}.bak"
        fi
      done
    fi
  done
}

# First pass: Update testutils dependency if present
echo "========== PHASE 1: Updating testutils dependency =========="
TESTUTILS_MODULE="github.com/hyperledger-cacti/cacti/weaver/core/network/fabric-interop-cc/libs/testutils"
for GOMODULE in ${GOMODULE_PATHS[@]}; do
  if [ -f "$ROOT_DIR/$GOMODULE/go.mod" ]; then
    pushd "$ROOT_DIR/$GOMODULE" > /dev/null
    
    # Check if testutils is a dependency
    if grep -q $TESTUTILS_MODULE go.mod; then
      echo "Updating testutils in $GOMODULE..."

      CURRENT_TESTUTILS_VERSION=$(go list -m -f '{{.Version}}' $TESTUTILS_MODULE)
      COMMIT_HASH=$(git rev-parse main)
      LATEST_TESTUTILS_VERSION=$(go list -m -f '{{.Version}}' $TESTUTILS_MODULE@$COMMIT_HASH)
      
      if [ "$CURRENT_TESTUTILS_VERSION" != "$LATEST_TESTUTILS_VERSION" ]; then
        # Get latest testutils
        go mod edit -require=$TESTUTILS_MODULE@$LATEST_TESTUTILS_VERSION
        go mod tidy
      else
        echo "Skipping: testutils is already up to date in $GOMODULE"
      fi
    fi
    
    popd > /dev/null
  fi
done

# Second pass: Update import paths in source files
echo "========== PHASE 2: Updating import paths in source files =========="
update_import_paths

# Third pass: Update VERSION files and go.mod module names
echo "========== PHASE 3: Updating VERSION files and go.mod module declarations =========="
for GOMODULE in ${GOMODULE_PATHS[@]}; do
  if [ -f "$ROOT_DIR/$GOMODULE/VERSION" ]; then
    echo "Processing $GOMODULE..."
    
    # Get old major version suffix
    OLD_MODULE_MAJOR_VER=$(get_old_module_major_ver "$GOMODULE")
    
    # Update VERSION file
    echo "$NORMALIZED_VERSION" > "$ROOT_DIR/$GOMODULE/VERSION"
    echo "  Updated VERSION file to $NORMALIZED_VERSION"
    
    # Update go.mod module name if major version changed
    if [ "$OLD_MODULE_MAJOR_VER" != "$NEW_MAJOR_VER" ]; then
      OLD_MODULE_NAME="$REPO/$GOMODULE$OLD_MODULE_MAJOR_VER"
      NEW_MODULE_NAME="$REPO/$GOMODULE$NEW_MAJOR_VER"
      update_gomod_module_name "$ROOT_DIR/$GOMODULE/go.mod" "$OLD_MODULE_NAME" "$NEW_MODULE_NAME"
      echo "  Updated go.mod module: $OLD_MODULE_NAME -> $NEW_MODULE_NAME"
    fi
  fi
done

# Fourth pass: Generate checksums and update go.mod/go.sum
echo "========== PHASE 4: Generating checksums and updating dependencies =========="
for GOMODULE in ${GOMODULE_PATHS[@]}; do
  echo "############# START $GOMODULE ################"
  pushd "$ROOT_DIR/$GOMODULE" > /dev/null
  
  GOMODULE_PATH=$GOMODULE
  if [ -f VERSION ]; then
    GOMODULE_PATH="$GOMODULE$NEW_MAJOR_VER"
  fi

  # skip if make run-vendor doesn't exists in Makefile as target or if makefile doesn't exist
  if [ ! -f Makefile ] || ! grep -q "run-vendor" Makefile; then
    echo "  Skipping $GOMODULE as make run-vendor doesn't exists in Makefile as target"
    echo "############# END $GOMODULE ################"
    popd > /dev/null
    continue
  fi

  make run-vendor > /dev/null 2>&1
  GOMOD_DEPS=$((go mod graph | grep "$REPO/$GOMODULE_PATH $REPO" | cut -d ' ' -f 2) || (make undo-vendor && echo "ERROR: In generating dependency graph" && exit 1))
  make undo-vendor > /dev/null 2>&1
  popd > /dev/null

  for GOMOD_DEP in ${GOMOD_DEPS[@]}; do
    echo "--------- START DEP -----------"
    GOMOD_DEP_VERSION=$(echo $GOMOD_DEP | awk -F "@" '{print $2}')
    GOMOD_DEP_MAJOR_VERSION=""
    if [ "${GOMOD_DEP_VERSION:1:1}" -gt "1" ]; then
      GOMOD_DEP_MAJOR_VERSION="/${GOMOD_DEP_VERSION:0:2}"
    fi
    GOMOD_PATH=$(echo $GOMOD_DEP | awk -F "$GOMOD_DEP_MAJOR_VERSION@" '{print $1}' | awk -F "$REPO/" '{print $2}')
    echo DEP: $GOMOD_DEP
    echo DEP: $GOMOD_PATH
    cp "$ROOT_DIR/LICENSE" "$ROOT_DIR/$GOMOD_PATH"
    pushd "$ROOT_DIR/$GOMOD_PATH" > /dev/null
    
    OLD_GOMOD_NAME="$REPO/$GOMOD_PATH$OLD_MAJOR_VER"
    GOMOD_NAME="$REPO/$GOMOD_PATH$NEW_MAJOR_VER"
    
    if [ ! -f VERSION ]; then
      echo "INFO: VERSION absent"
      popd > /dev/null
      echo "------------ END --------------"
      continue
    fi

    # Verify that dependencies in go.mod are already updated to new version
    echo "  Verifying dependencies in go.mod are updated..."
    if [ -f go.mod ]; then
      # Check if any old version references exist in go.mod
      if grep -q "$REPO.*$OLD_MAJOR_VER v" go.mod 2>/dev/null; then
        echo "  WARNING: Found old version references in $GOMOD_PATH/go.mod:"
        grep "$REPO.*$OLD_MAJOR_VER v" go.mod
        echo "  ERROR: Dependencies must be updated before calculating checksum"
        popd > /dev/null
        echo "------------ END --------------"
        exit 1
      fi
      echo "  Verification passed: All dependencies updated to new version"
    fi
    
    # (cat VERSION | grep "$NORMALIZED_VERSION") || echo "$NORMALIZED_VERSION" > VERSION
    GOMOD_VERSION=v$(cat VERSION)
    GOMOD_SUM=$(go-checksum . "$GOMOD_NAME@$GOMOD_VERSION" | grep "GoCheckSum" | cut -d ' ' -f 2 | cut -d '"' -f 2)
    GOMOD_DOTMOD_SUM=$(go-checksum go.mod | grep "GoCheckSum" | cut -d ' ' -f 2 | cut -d '"' -f 2)
    GOMOD_SUM_ENTRY="$GOMOD_NAME $GOMOD_VERSION $GOMOD_SUM"
    GOMOD_DOTMOD_SUM_ENTRY="$GOMOD_NAME $GOMOD_VERSION/go.mod $GOMOD_DOTMOD_SUM"
    echo GOSUM: $GOMOD_SUM_ENTRY
    echo GOSUM: $GOMOD_DOTMOD_SUM_ENTRY
    popd > /dev/null
    rm "$ROOT_DIR/$GOMOD_PATH/LICENSE"
    
    pushd "$ROOT_DIR/$GOMODULE" > /dev/null
    UPDATE="false"
    (cat go.mod | grep -q "$GOMOD_NAME $GOMOD_VERSION") || UPDATE="true"
    if [ "$UPDATE" = "true" ]; then
      # Remove old version entries using OLD_MAJOR_VER
      grep -v "$OLD_GOMOD_NAME v" go.mod > go.mod.tmp
      mv go.mod.tmp go.mod
      go mod edit -require "$GOMOD_NAME@$GOMOD_VERSION"
    else
      echo "INFO: Version $GOMOD_VERSION already in go.mod for $GOMOD_PATH in $GOMODULE"
    fi
    UPDATE="false"
    (cat go.sum | grep -q "$GOMOD_SUM_ENTRY") || UPDATE="true"
    (cat go.sum | grep -q "$GOMOD_DOTMOD_SUM_ENTRY") || UPDATE="true"
    if [ "$UPDATE" = "true" ]; then
      # Remove old version entries using OLD_MAJOR_VER
      grep -v "$OLD_GOMOD_NAME v" go.sum > go.sum.tmp 2>/dev/null || touch go.sum.tmp
      mv go.sum.tmp go.sum
      echo "$GOMOD_SUM_ENTRY" >> go.sum
      echo "$GOMOD_DOTMOD_SUM_ENTRY" >> go.sum
    else
      echo "INFO: Version $GOMOD_VERSION already in go.sum for $GOMOD_PATH in $GOMODULE"
    fi
    popd > /dev/null
    echo "------------ END --------------"
  done
  echo "############# END $GOMODULE ################"
done

# Fifth pass: Update Makefiles
echo ""
echo "========== PHASE 5: Updating Makefiles =========="
for GOMODULE in ${GOMODULE_PATHS[@]}; do
  if [ -f "$ROOT_DIR/$GOMODULE/VERSION" ]; then
    # Only update if major version changed
    if [ "$OLD_MAJOR_VER" != "$NEW_MAJOR_VER" ]; then
      # Update Makefile/makefile if it exists (case insensitive)
      MAKEFILE_PATH=""
      if [ -f "$ROOT_DIR/$GOMODULE/Makefile" ]; then
        MAKEFILE_PATH="$ROOT_DIR/$GOMODULE/Makefile"
      elif [ -f "$ROOT_DIR/$GOMODULE/makefile" ]; then
        MAKEFILE_PATH="$ROOT_DIR/$GOMODULE/makefile"
      fi
      
      if [ -n "$MAKEFILE_PATH" ]; then
        echo "Updating $GOMODULE/$(basename $MAKEFILE_PATH)..."
        # Update all module paths with old version suffix to new version suffix
        # Check each module path and update if present
        for dep_module in ${GOMODULE_PATHS[@]}; do
          OLD_DEP_PATH="$REPO/$dep_module$OLD_MAJOR_VER"
          NEW_DEP_PATH="$REPO/$dep_module$NEW_MAJOR_VER"
          # Only update if the old path exists in the Makefile
          if grep -q "$OLD_DEP_PATH" "$MAKEFILE_PATH" 2>/dev/null; then
            sed -i.bak "s|$OLD_DEP_PATH|$NEW_DEP_PATH|g" "$MAKEFILE_PATH"
          fi
        done
        rm -f "${MAKEFILE_PATH}.bak"
        echo "  Updated Makefile module references"
      fi
    fi
  fi
done

echo ""
echo "========== COMPLETE =========="
echo "All modules updated to version $NORMALIZED_VERSION with major version suffix $NEW_MAJOR_VER"
