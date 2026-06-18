{
  description = "SATP Hermes development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };
        nodeVersion = "22";
        # Fallback when go_1_20 is unavailable in nixpkgs snapshot to default go package (which may be a newer version)
        goToolchain = if pkgs ? go_1_20 then pkgs.go_1_20 else pkgs.go;
        rustVersion = "stable";
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            corepack
            yarn

            goToolchain

            (rust-bin.stable.latest.default.override {
              targets = [ "wasm32-unknown-unknown" ];
              extensions = [ "rust-src" "rustfmt" "clippy" ];
            })

            foundry

            pkg-config
            gnumake
            git
            curl
            wget

            protobuf
            grpc

            docker

            python3
            python3Packages.pip

            openjdk17  
            
            python3
            gcc
            glibc

            shellcheck
            nodePackages.eslint
          ];

          shellHook = ''
            # Set up environment variables
            export NODEJS_VERSION="v22.18.0"
            export GO111MODULE=on
            export CARGO_TERM_COLOR=always

            # Print environment info
            echo "=== SATP Hermes Development Environment ==="
            echo "Node.js version: $(node --version)"
            echo "yarn version: $(yarn --version)"
            echo "Go version: $(go version)"
            echo "Rust version: $(rustc --version)"
            echo "Cargo version: $(cargo --version)"
            echo "Forge version: $(forge --version 2>/dev/null || echo 'Not installed yet')"
            echo ""
            echo "Getting started:"
            echo "  - Install dependencies (in root of the project): yarn run configure"
            echo "  - Build the project: yarn build"
            echo "  - Run tests: yarn test"
            echo ""
          '';
        };

        # Alternative shells for specific tasks
        devShells.node-only = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            corepack
            yarn
            git
          ];
        };

        devShells.rust-only = pkgs.mkShell {
          buildInputs = with pkgs; [
            (rust-bin.stable.latest.default.override {
              targets = [ "wasm32-unknown-unknown" ];
            })
            foundry
            pkg-config
          ];
        };

        devShells.go-only = pkgs.mkShell {
          buildInputs = with pkgs; [
            goToolchain
            git
          ];
        };
      }
    );
}
