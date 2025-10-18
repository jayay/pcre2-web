#!/usr/bin/env nix-shell
#!nix-shell --arg nixpkgs 'import (builtins.fetchGit (builtins.fromJSON (builtins.readFile ./nixpkgs-rev.json)) ) {}' -i nu -p nushell git

const file = "nixpkgs-rev.json"

let source = open $file
let latest = git ls-remote $source.url $source.ref | split column "\t" rev ref | first

$source | merge $latest | save -f $file
