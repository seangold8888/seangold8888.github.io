"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "..", "index.html"), "utf8");

test("모험 대시보드의 모든 인라인 스크립트가 문법적으로 유효하다", () => {
  const blocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((source) => source.trim());

  assert.ok(blocks.length >= 2);
  blocks.forEach((source, index) => {
    assert.doesNotThrow(
      () => new vm.Script(source, { filename: "hub-inline-" + index + ".js" }),
      "inline script " + index + " should compile"
    );
  });
});
