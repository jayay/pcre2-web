{ pkgs ? import
  (builtins.fetchGit (builtins.fromJSON (builtins.readFile ./nixpkgs-rev.json)))
  { }, releaseVer ? null }:
let
  inherit (pkgs) lib runCommand buildNpmPackage pcre2 nodejs writeTextFile;
  pcre2-wasm = pkgs.pkgsCross.wasi32.stdenv.mkDerivation {
    pname = "pcre2-wasm";
    inherit (pcre2) version src;
    configureFlags =
      [ "--disable-pcre2grep-jit" "--disable-pcre2grep-callout" ];
    patches = [ ./patches/counter.patch ];

    dontFixup = true;
    buildPhase = ''
      runHook preBuild
      mv src/pcre2_chartables.c.dist src/pcre2_chartables.c

      cfiles=$(find src \
          -iname '*_*.c' \
        ! -iname 'pcre2_fuzz*' \
        ! -iname 'pcre2_jit*' \
        ! -iname 'pcre2posix_test.c' \
        ! -iname 'pcre2_printint.c' \
        ! -iname 'pcre2_ucptables.c' \
        ! -path '*/sljit/*' \
        | sort | xargs)

      cflags="\
        -DPCRE2_CODE_UNIT_WIDTH=8 \
        -include src/config.h \
        -include src/pcre2_internal.h
        -O2 \
        -nostartfiles \
        -static \
        -fno-exceptions \
        -fno-rtti \
        -flto \
        --rtlib=compiler-rt \
        -Wl,--no-entry \
        -Wl,--export-dynamic \
        -Wl,--export=malloc \
        -Wl,--export=free \
        -Wl,--export=pcre2_compile_8 \
        -Wl,--export=pcre2_get_error_message_8 \
        -Wl,--export=pcre2_match_data_create_from_pattern_8 \
        -Wl,--export=pcre2_match_data_step_count \
        -Wl,--export=pcre2_match_8 \
        -Wl,--export=pcre2_match_data_free_8 \
        -mno-bulk-memory \
        -mno-exception-handling \
        -mno-mutable-globals \
        -mno-multimemory"

      $CC $cfiles $(./pcre2-config --cflags) $cflags -o out.wasm

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
    text = builtins.toJSON { "version" = pcre2.version; };
  };
  pcre2webVersion = if releaseVer == null then
    packageTemplate.version
  else
    lib.strings.removePrefix "v" releaseVer;
  packageTemplate =
    builtins.fromJSON (builtins.readFile ./src/package.template.json);
  packageJson = writeTextFile {
    name = "package.json";
    text = builtins.toJSON (packageTemplate // { version = pcre2webVersion; });
  };
in buildNpmPackage (finalAttrs: {
  name = "pcre2-web";
  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.traceVal (lib.fileset.unions [
      ./.npmrc
      ./.mocharc.json
      ./pkg
      ./src
      ./tsconfig.json
      ./package.json
      ./package-lock.json
    ]);
  };

  npmDeps = pkgs.importNpmLock { npmRoot = ./.; };
  npmConfigHook = pkgs.importNpmLock.npmConfigHook;

  buildPhase = ''
    runHook preBuild
    ${nodejs}/bin/npx tsc -b -v
    runHook postBuild
  '';

  postBuild = ''
    cp -R ${pcre2-wasm}/out.wasm pkg/
    cp ${versionFile} pkg/pcre2-version.json
    cp ${packageJson} pkg/package.json
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

  passthru.updateScript = ./update.nu;
})
