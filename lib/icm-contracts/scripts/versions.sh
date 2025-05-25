#!/usr/bin/env bash
# Copyright (C) 2023, Ava Labs, Inc. All rights reserved.
# See the file LICENSE for licensing terms.

set -e
set -o pipefail

ICM_CONTRACTS_PATH=$(
  cd "$(dirname "${BASH_SOURCE[0]}")"
  cd .. && pwd
)

# Pass in the full name of the dependency.
# Parses go.mod for a matching entry and extracts the version number.
function getDepVersion() {
    grep -m1 "^\s*$1" $ICM_CONTRACTS_PATH/go.mod | cut -d ' ' -f2
}

function extract_commit() {
  local version=$1

  # Regex for a commit hash (assumed to be a 12+ character hex string)
  commit_hash_regex="-([0-9a-f]{12,})$"

  if [[ "$version" =~ $commit_hash_regex ]]; then
      # Extract the substring after the last '-'
      version=${BASH_REMATCH[1]}
  fi
  echo "$version"
}

# AWM_RELAYER_VERSION is needed for the docker run setup, but is not a go module dependency.
AWM_RELAYER_VERSION=${AWM_RELAYER_VERSION:-'v1.0.0'}

# Don't export them as they're used in the context of other calls
AVALANCHEGO_VERSION=${AVALANCHEGO_VERSION:-$(extract_commit "$(getDepVersion github.com/ava-labs/avalanchego)")}
# Temporarily hardcode the Avalanchego version until outbound networking relaxation is available
AVALANCHEGO_VERSION=v1.12.0-fuji
GINKGO_VERSION=${GINKGO_VERSION:-$(extract_commit "$(getDepVersion github.com/onsi/ginkgo/v2)")}
SUBNET_EVM_VERSION=${SUBNET_EVM_VERSION:-$(extract_commit "$(getDepVersion github.com/ava-labs/subnet-evm)")}


# Set golangci-lint version
GOLANGCI_LINT_VERSION=${GOLANGCI_LINT_VERSION:-'v1.60'}

# Extract the Solidity version from foundry.toml
SOLIDITY_VERSION=$(awk -F"'" '/^solc_version/ {print $2}' $ICM_CONTRACTS_PATH/foundry.toml)
EVM_VERSION=$(awk -F"'" '/^evm_version/ {print $2}' $ICM_CONTRACTS_PATH/foundry.toml)
