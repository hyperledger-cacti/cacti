{
  description = "Hyperledger Cacti — reproducible development environment";

  inputs = {
    # Main nixpkgs (latest unstable) for most packages.
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    # Pinned nixpkgs revision that still ships Node.js 20.
    # Node 20 reached upstream EOL on 2026-04-30 and was removed from
    # nixpkgs-unstable shortly after.  The Cacti monorepo targets
    # Node 20.20 and will migrate to a
    # newer LTS in a future stage.
    #
    # This commit is from 2026-04-28, just before the removal.
    nixpkgs-node20.url = "github:NixOS/nixpkgs/nixos-24.11";

    # flake-utils provides the eachDefaultSystem helper so we don't
    # have to repeat the devShell definition for every platform.
    flake-utils.url = "github:numtide/flake-utils";

    # rust-overlay gives us fine-grained control over the Rust toolchain
    # (stable/nightly, specific versions, extra components like rust-src).
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, nixpkgs-node20, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
          config.allowUnfree = true;
        };

        # Import the pinned nixpkgs that still has Node.js 20.
        pkgsNode20 = import nixpkgs-node20 {
          inherit system;
        };

        # ── Rust toolchain ──────────────────────────────────────────────
        # The weaver Cargo.toml files declare `edition = "2024"`, which
        # requires Rust >= 1.85.  We track the latest stable release and
        # bundle rust-analyzer + sources for IDE support.
        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

      in
      {
        # ================================================================
        # Default dev shell  —  `nix develop`
        #
        # Contains every tool needed to build the full Cacti monorepo,
        # including the weaver sub-projects (Go, Rust, Java/Kotlin).
        # ================================================================
        devShells.default = pkgs.mkShell {
          buildInputs = [
            # ── Core: Node.js / TypeScript ──────────────────────────────
            # Target v20.x as specified in BUILD.md and confirmed by the
            # maintainers.  Pulled from a pinned nixpkgs revision because
            # Node 20 was removed from nixpkgs-unstable after its
            # upstream EOL (2026-04-30).  Corepack (bundled) activates
            # Yarn 4.13.0 via the packageManager field in package.json.
            pkgsNode20.nodejs_20

            # ── Weaver: Go ──────────────────────────────────────────────
            # weaver/*/go.mod files declare `go 1.26`.
            pkgs.go

            # ── Weaver: Rust ────────────────────────────────────────────
            rustToolchain

            # ── Weaver: Java / Kotlin ───────────────────────────────────
            # build.gradle files target JavaVersion.VERSION_17.
            # Temurin is the same JDK distribution used in devcontainer.
            pkgs.temurin-bin-17
            # Gradle wrapper lives in the repo (7.6.1), but having the
            # CLI available lets contributors run `gradle` directly.
            pkgs.gradle
            pkgs.maven

            # ── Code generation ─────────────────────────────────────────
            # protoc >= 3.25.3 required by weaver proto definitions.
            pkgs.protobuf

            # ── System / build tools ────────────────────────────────────
            pkgs.git
            pkgs.curl
            pkgs.gnumake
            pkgs.pkg-config
            pkgs.openssl
            pkgs.python3

            # ── Native compilation (npm modules with C/C++ addons) ─────
            pkgs.gcc
            pkgs.stdenv.cc.cc.lib   # libstdc++ for node-gyp
          ];

          # Environment variables and one-time setup when entering the
          # shell.
          shellHook = ''
            # Corepack ships with Node.js and manages Yarn.  Enabling it
            # makes the version declared in package.json ("yarn@4.13.0")
            # available on PATH without a global install.
            # We install to ~/.local/bin because the Nix store is read-only.
            mkdir -p "$HOME/.local/bin"
            export PATH="$HOME/.local/bin:$PATH"
            corepack enable --install-directory "$HOME/.local/bin"

            # Go module mode (default since Go 1.16, but explicit is
            # clearer in a polyglot shell).
            export GO111MODULE=on
            export GOPATH="''${GOPATH:-$HOME/go}"
            export PATH="$GOPATH/bin:$PATH"

            # Point JAVA_HOME at the Nix-provided JDK so that Gradle and
            # Maven pick it up automatically.
            export JAVA_HOME="${pkgs.temurin-bin-17}"

            # ── Welcome banner ──────────────────────────────────────────
            echo ""
            echo "Cacti Development Shell"
            echo "──────────────────────────────────────────────"
            echo "  Node.js : $(node --version)"
            echo "  Yarn    : $(yarn --version 2>/dev/null || echo 'enable corepack first')"
            echo "  Go      : $(go version 2>/dev/null | cut -d' ' -f3)"
            echo "  Rust    : $(rustc --version 2>/dev/null | cut -d' ' -f2)"
            echo "  Java    : $(java --version 2>&1 | head -1)"
            echo "  Gradle  : $(gradle --version 2>/dev/null | grep -i '^Gradle' | head -1)"
            echo "  protoc  : $(protoc --version 2>/dev/null)"
            echo "──────────────────────────────────────────────"
            echo ""
            echo "Quick start:"
            echo "  yarn run configure   # install deps + build"
            echo ""
          '';
        };

        # ================================================================
        # Node-only dev shell  —  `nix develop .#node`
        #
        # A lighter shell for contributors who only work on the
        # TypeScript / Node.js packages and don't need Go, Rust, or
        # Java toolchains.
        # ================================================================
        devShells.node = pkgs.mkShell {
          buildInputs = [
            pkgsNode20.nodejs_20
            pkgs.git
            pkgs.curl
            pkgs.gnumake
            pkgs.pkg-config
            pkgs.openssl
            pkgs.python3
            pkgs.gcc
            pkgs.stdenv.cc.cc.lib
          ];

          shellHook = ''
            mkdir -p "$HOME/.local/bin"
            export PATH="$HOME/.local/bin:$PATH"
            corepack enable --install-directory "$HOME/.local/bin"

            echo ""
            echo "🌵 Cacti Development Shell (Node.js only)"
            echo "──────────────────────────────────────────────"
            echo "  Node.js : $(node --version)"
            echo "  Yarn    : $(yarn --version 2>/dev/null || echo 'enable corepack first')"
            echo "──────────────────────────────────────────────"
            echo ""
            echo "Quick start:"
            echo "  yarn run configure   # install deps + build"
            echo ""
          '';
        };
      }
    );
}
