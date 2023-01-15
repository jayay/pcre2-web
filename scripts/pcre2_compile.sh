#!/bin/sh
set -e

cd pcre2
patch -p1 -N -r /dev/null < ../patches/counter.patch || true
cd src
cp config.h.generic config.h || true
cp pcre2.h.generic pcre2.h || true
cp pcre2_chartables.c.dist pcre2_chartables.c || true
${CC:-clang} -triple=wasm32-unknown-unknown-wasm -UHAVE_PTHREAD "-DPCRE2_CODE_UNIT_WIDTH=8" "-DWASI_EMULATED_MMAN" \
  -DNDEBUG "-DHEAP_LIMIT=20000000" "-DLINK_SIZE=2" "-DMATCH_LIMIT=10000000" "-DMATCH_LIMIT_DEPTH=10000000" \
  "-DMAX_NAME_COUNT=10000" "-DMAX_NAME_SIZE=32" "-DNEWLINE_DEFAULT=2" "-DPARENS_NEST_LIMIT=250"  "-DSUPPORT_PCRE2_8=1" \
  "-DSUPPORT_UNICODE=1" -USUPPORT_PCRE2GREP_JIT -USUPPORT_JIT -DPCRE2_STATIC=1 \
  "pcre2_auto_possess.c" "pcre2_chartables.c" "pcre2_compile.c" "pcre2_config.c" "pcre2_context.c" \
  "pcre2_convert.c" "pcre2_dfa_match.c" "pcre2_error.c" "pcre2_extuni.c" "pcre2_find_bracket.c" "pcre2_jit_compile.c" \
  "pcre2_maketables.c" "pcre2_match.c" "pcre2_match_data.c" "pcre2_newline.c" "pcre2_ord2utf.c" "pcre2_pattern_info.c" \
  "pcre2_script_run.c" \
  "pcre2_serialize.c" "pcre2_string_utils.c" "pcre2_study.c" "pcre2_substitute.c" "pcre2_substring.c" "pcre2_tables.c" \
  "pcre2_ucd.c" "pcre2_valid_utf.c" "pcre2_xclass.c" \
  -nostartfiles -Wl,--no-entry -Oz \
  -Wl,--export-dynamic -static -fno-exceptions -fno-rtti -flto -Wl,--export=malloc -Wl,--export=free -Wl,--export=pcre2_compile_8 \
  -Wl,--export=pcre2_get_error_message_8 -Wl,--export=pcre2_match_data_create_from_pattern_8 -Wl,--export=pcre2_match_8 \
  -Wl,--export=pcre2_match_data_free_8 -Wl,--export=pcre2_match_data_step_count --rtlib=compiler-rt \
  -o ../../pkg/out.wasm