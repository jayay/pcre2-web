{
  description = "PCRE2 in a WebAssembly binary";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system: {
      packages.default = nixpkgs.legacyPackages.${system}.callPackage ./package.nix {};
    });
}
