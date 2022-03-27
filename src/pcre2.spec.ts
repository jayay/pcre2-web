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
});