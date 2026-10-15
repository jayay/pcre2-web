import * as assert from 'assert';
import * as pcre from './loader.js';

describe("pcre2 bindings", () => {
  it("Is able to access regexp property", () => {
    const pcre2 = pcre.PCRE2.create("[Hh]ell[oO]");
    assert.deepStrictEqual(pcre2.regexp, "[Hh]ell[oO]");
  });

  it("Is able to match basic regex", () => {
    const pcre2 = pcre.PCRE2.create("[Hh]ell[oO]");
    assert.ok(pcre2.test("Hello"));
    assert.ok(!pcre2.test("Hola"));
  });

  it("Communicates errors back to the caller", () => {
    try {
      pcre.PCRE2.create("[Hh]elloO\\");
      assert.fail("Should not have succeeded");
    } catch (e) {
      assert.deepStrictEqual(e, new Error("Failed to compile regex at offset 10: \\ at end of pattern"));
    }
  });

  it("Is able to test basic regex against input", () => {
    const pcre2 = pcre.PCRE2.create("[Hh]ell[oO]");
    assert.ok(pcre2.test("Hello"));
    assert.ok(!pcre2.test("Hola"));
  });

  it("Is able to test basic regex against input in Unicode without 'u' modifier", () => {
    const pcre2 = pcre.PCRE2.create("[Hh]allö");
    assert.ok(pcre2.test("Hallöchen"));
    assert.ok(!pcre2.test("Hallo"));
  });

  it("Supports compile-time flags", () => {
    const pcre2_bare = pcre.PCRE2.create("ab");
    assert.ok(!pcre2_bare.test("Ab"));
    const pcre2 = pcre.PCRE2.create("ab", pcre.PCRE2_CASELESS);
    assert.ok(pcre2.test("Ab"));
    assert.ok(pcre2.test("aB"));
    assert.ok(!pcre2.test("aC"));
  });

  it("Reports the amount of steps", () => {
    const pcre2 = pcre.PCRE2.create("^(\\d+)*$");
    const match = {};
    assert.ok(!pcre2.test("0123z", 0, match));
    assert.deepStrictEqual(match, {steps: 41});
    assert.ok(!pcre2.test("01234z", 0, match));
    assert.deepStrictEqual(match, {steps: 81});
  });

  it("Reports zero steps when the subject is rejected before any match attempt", () => {
    // "asdd" has a minimum match length of 4, so PCRE2 rejects a 3-character
    // subject on a length check alone, without ever entering the matching
    // loop that normally resets and counts match_call_count. Regression test
    // for a bug where this path reported leftover/uninitialized step counts
    // instead of 0.
    const pcre2 = pcre.PCRE2.create("asdd");
    const match = {};
    assert.ok(!pcre2.test("asd", 0, match));
    assert.deepStrictEqual(match, {steps: 0});
  });

  it("Reports a stable step count across repeated calls", () => {
    // Regression test: the uninitialized-counter bug caused the reported
    // step count to grow with each call instead of staying consistent for
    // the same regex/subject pair.
    const pcre2 = pcre.PCRE2.create("asdd");
    for (let i = 0; i < 5; i++) {
      const match = {};
      assert.ok(!pcre2.test("asd", 0, match));
      assert.deepStrictEqual(match, {steps: 0});
    }
  });
});