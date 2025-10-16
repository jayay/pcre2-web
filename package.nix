{
  stdenv ? pkgs.stdenv,
  pkgs ? import (builtins.fetchGit {
    # Descriptive name to make the store path easier to identify
    name = "nixos-unstable";
    url = "https://github.com/nixos/nixpkgs/";
    # Commit hash for nixos-unstable as of 2018-09-12
    # `git ls-remote https://github.com/nixos/nixpkgs nixos-unstable`
    ref = "refs/heads/nixos-unstable";
    rev = "a493e93b4a259cd9fea8073f89a7ed9b1c5a1da2";
  }) {},
  # pkgs ? import <nixpkgs> {},
}:
let
  inherit (pkgs) lib runCommand pcre2;
in
pkgs.pkgsCross.wasi32.stdenv.mkDerivation (finalAttrs: {
  pname = "pcre2-wasm";
  inherit (pcre2) version src;
  configureFlags = ["--disable-pcre2grep-jit" "--disable-pcre2grep-callout"];

  dontFixup = true;
  buildPhase = ''
    runHook preBuild
    mv src/pcre2_chartables.c.dist src/pcre2_chartables.c
    cfiles=$(find src -iname '*.c' ! -iname 'pcre2_fuzz*' ! -iname 'pcre2_jit*' -iname '*_*.c' ! -iname 'pcre2posix_test.c' ! -iname 'pcre2_printint.c' ! -iname 'pcre2_ucptables.c' ! -path '*/sljit/*' | xargs)
    $CC -DPCRE2_CODE_UNIT_WIDTH=8 $(./pcre2-config --cflags | xargs) -include src/config.h -include src/pcre2_internal.h $cfiles -nostartfiles -Wl,--no-entry -O2 \
    -Wl,--export-dynamic -static -fno-exceptions -fno-rtti -flto -Wl,--export=malloc -Wl,--export=free  -Wl,--export=pcre2_compile_8 \
    -Wl,--export=pcre2_get_error_message_8 -Wl,--export=pcre2_match_data_create_from_pattern_8 -Wl,--export=pcre2_match_8 \
    -Wl,--export=pcre2_match_data_free_8 --rtlib=compiler-rt -mno-bulk-memory -mno-exception-handling -mno-mutable-globals -mno-multimemory -o out.wasm
    runHook postBuild
  '';

  postBuild = ''
    # todo: use -mno-reference-types in later clang version
    ${pkgs.binaryen}/bin/wasm-opt --directize out.wasm -o out.wasm
  '';

  installPhase = ''
    mkdir -p $out/
    mv out.wasm $out/
  '';

  passthru.tests.validate = (runCommand "validate" { } ''
    ${pkgs.wabt}/bin/wasm-validate --disable-mutable-globals --disable-bulk-memory ${finalAttrs.finalPackage}/out.wasm > $out
  '');
})
