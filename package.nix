{
  stdenv ? pkgs.stdenv,
  pkgs ? import (builtins.fetchGit {
    # Descriptive name to make the store path easier to identify
    name = "nixos-unstable";
    url = "https://github.com/nixos/nixpkgs/";
    # `git ls-remote https://github.com/nixos/nixpkgs nixos-unstable`
    ref = "refs/heads/nixos-unstable";
    rev = "a493e93b4a259cd9fea8073f89a7ed9b1c5a1da2";
  }) {},
}:
let
  inherit (pkgs) lib runCommand buildNpmPackage pcre2 nodejs writeTextFile;
  pcre2-wasm = pkgs.pkgsCross.wasi32.stdenv.mkDerivation {
    pname = "pcre2-wasm";
    inherit (pcre2) version src;
    configureFlags = ["--disable-pcre2grep-jit" "--disable-pcre2grep-callout"];
    patches = [ ./patches/counter.patch ];

    dontFixup = true;
    buildPhase = ''
      runHook preBuild
      mv src/pcre2_chartables.c.dist src/pcre2_chartables.c
      cfiles=$(find src -iname '*.c' ! -iname 'pcre2_fuzz*' ! -iname 'pcre2_jit*' -iname '*_*.c' ! -iname 'pcre2posix_test.c' ! -iname 'pcre2_printint.c' ! -iname 'pcre2_ucptables.c' ! -path '*/sljit/*' | xargs)
      $CC -DPCRE2_CODE_UNIT_WIDTH=8 $(./pcre2-config --cflags | xargs) -include src/config.h -include src/pcre2_internal.h $cfiles -nostartfiles -Wl,--no-entry -O2 \
      -Wl,--export-dynamic -static -fno-exceptions -fno-rtti -flto -Wl,--export=malloc -Wl,--export=free  -Wl,--export=pcre2_compile_8 \
      -Wl,--export=pcre2_get_error_message_8 -Wl,--export=pcre2_match_data_create_from_pattern_8 -Wl,--export=pcre2_match_data_step_count -Wl,--export=pcre2_match_8 \
      -Wl,--export=pcre2_match_data_free_8 --rtlib=compiler-rt -mno-bulk-memory -mno-exception-handling -mno-mutable-globals -mno-multimemory -o out.wasm
      runHook postBuild
    '';

    postBuild = ''
      # todo: use -mno-reference-types in later clang version
      ${pkgs.binaryen}/bin/wasm-opt --remove-imports --monomorphize --directize out.wasm -o out.wasm
    '';

    installPhase = ''
      mkdir -p $out/
      mv out.wasm $out/
    '';
  };
  versionFile = writeTextFile {
    name = "pcre2-version.json";
    text = builtins.toJSON {
      "version" = pcre2.version;
    };
  };
in
buildNpmPackage (finalAttrs: {
  name = "pcre2-web";
  src = ./.;
  npmDeps = pkgs.importNpmLock {
    npmRoot = ./.;
  };
  npmConfigHook = pkgs.importNpmLock.npmConfigHook;

  buildPhase = ''
    runHook preBuild
    ${nodejs}/bin/npx tsc -b -v
    runHook postBuild
  '';

  postBuild = ''
    cp -R ${pcre2-wasm}/out.wasm pkg/
    cp ${versionFile} pkg/pcre2-version.json
    cp src/package.template.json pkg/package.json
  '';

  installPhase = ''
    mkdir -p $out
    cp -R pkg/* $out/
    rm -f $out/*.spec.*
  '';

  doCheck = true;
  checkPhase = ''
    ${pkgs.wabt}/bin/wasm-validate --disable-mutable-globals --disable-bulk-memory pkg/out.wasm
    ${pkgs.nodejs}/bin/node --experimental-wasm-modules node_modules/mocha/bin/_mocha
  '';
})
