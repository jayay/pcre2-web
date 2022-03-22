#!/bin/sh
set -e

cd wasi-libc
patch -p1 -N -r /dev/null < ../patches/wasi-libc.patch || true
make install TARGET=wasm32-unknown-wasi WASM_CFLAGS="-D_WASI_EMULATED_MMAN --target=wasm32-unknown-wasi" LDFLAGS="-lwasi-emulated-mman" INSTALL_DIR=/tmp/wasi-libc
cd ../pcre2/src
cp config.h.generic config.h
cp pcre2.h.generic pcre2.h
cp pcre2_chartables.c.dist pcre2_chartables.c      
LIBRARY_PATH=/tmp/wasi-libc/lib/wasm32-wasi CFLAGS="--target=wasm32-unknown-wasi --sysroot /tmp/wasi-libc -I/tmp/wasi-libc/include -Wl,--import-memory -Wl,--no-entry -Wl,--export-all" LDFLAGS="-undefined dynamic_lookup --target=wasm32-unknown-wasi -lwasi-emulated-mman --export-dynamic --export-table -shared --import-memory -L/tmp/wasi-libc/lib/wasm32-wasi --sysroot /tmp/wasi-libc/" LD=wasm-ld TARGET="wasm32-unknown-wasi" clang --target=wasm32-unknown-wasi  "-DPCRE2_CODE_UNIT_WIDTH=8" "-DWASI_EMULATED_MMAN" -DNDEBUG "-DHEAP_LIMIT=20000000" "-DLINK_SIZE=2" "-DMATCH_LIMIT=10000000" "-DMATCH_LIMIT_DEPTH=10000000" "-DMAX_NAME_COUNT=10000" "-DMAX_NAME_SIZE=32" "-DNEWLINE_DEFAULT=2" "-DPARENS_NEST_LIMIT=250"  "-DSUPPORT_PCRE2_8=1" "-DSUPPORT_UNICODE=1" -USUPPORT_PCRE2GREP_JIT -USUPPORT_JIT -DPCRE2_STATIC=1 "pcre2_auto_possess.c" "pcre2_compile.c" "pcre2_config.c" "pcre2_context.c" "pcre2_convert.c" "pcre2_dfa_match.c" "pcre2_error.c" "pcre2_extuni.c" "pcre2_find_bracket.c" "pcre2_jit_compile.c" "pcre2_maketables.c" "pcre2_match.c" "pcre2_match_data.c" "pcre2_newline.c" "pcre2_ord2utf.c" "pcre2_pattern_info.c" "pcre2_serialize.c" "pcre2_string_utils.c" "pcre2_study.c" "pcre2_substitute.c" "pcre2_substring.c" "pcre2_tables.c" "pcre2_ucd.c" "pcre2_valid_utf.c" "pcre2_xclass.c" --sysroot /tmp/wasi-libc -nostartfiles -Wl,--no-entry -Wl,--import-memory -Os --sysroot /tmp/wasi-libc -Wl,--export-dynamic -static -flto -Wl,--export=malloc -Wl,--export=free -o ../../pkg/out.wasm
