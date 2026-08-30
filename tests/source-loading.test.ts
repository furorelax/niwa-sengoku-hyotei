import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import config from "../skills/niwa-sengoku-hyotei/references/source-loading-v1.json" with { type: "json" };
import { sourceCatalog } from "../src/core/source-catalog.ts";
import { determineLoadProfile, requiredSources, type GamePhase, type InputKind } from "../src/core/source-loading.ts";

const skillRoot = `${process.cwd()}/skills/niwa-sengoku-hyotei`;

test("現在存在する全フェーズに既定ルートがある", () => {
  for (const phase of config.phases) {
    assert.equal(typeof determineLoadProfile({ phase }, "play"), "string");
  }
});

test("代表的な初回・開始・評定意見・人物選択が必要な資料IDだけを返す", () => {
  const cases: readonly [GamePhase, InputKind, readonly string[]][] = [
    ["pre_start", "first_input", ["rules.pre_start", "content.pre_start"]],
    ["pre_start", "start", ["rules.council", "content.council", "content.chapter_context"]],
    ["council", "council_opinion", ["rules.council", "content.council", "content.chapter_context"]],
    ["conversation", "select_character", ["rules.conversation", "content.conversation", "content.chapter_context"]],
  ];
  for (const [phase, inputKind, expected] of cases) {
    const profile = determineLoadProfile({ phase }, inputKind);
    assert.deepEqual(requiredSources(profile), expected);
  }
});

test("入力種別による閲覧と詳しく聞くをフェーズより優先する", () => {
  assert.equal(determineLoadProfile({ phase: "battle" }, "show_help"), "help");
  assert.equal(determineLoadProfile({ phase: "council" }, "show_characters"), "characters");
  assert.equal(determineLoadProfile({ phase: "conversation" }, "show_records"), "records");
  assert.equal(determineLoadProfile({ phase: "conversation" }, "ask_detail"), "detail");
});

test("JSON内の全プロファイルが登録済み資料IDだけを指す", () => {
  for (const ids of Object.values(config.profiles)) {
    for (const id of ids) assert.equal(Boolean(sourceCatalog[id as keyof typeof sourceCatalog]), true);
  }
});

test("JSONが指す全ファイルと開始・終了見出しが実在する", () => {
  for (const source of Object.values(sourceCatalog)) {
    const path = `${skillRoot}/references/${source.file}`;
    const headings = readFileSync(path, "utf8").split(/\r?\n/u).filter((line) => line.startsWith("#"));
    for (const range of source.ranges) {
      const startOccurrence = ("startHeadingOccurrence" in range ? range.startHeadingOccurrence : 1) ?? 1;
      const endOccurrence = ("endHeadingOccurrence" in range ? range.endHeadingOccurrence : 1) ?? 1;
      assert.equal(headings.filter((heading) => heading === range.startHeading).length >= startOccurrence, true);
      assert.equal(headings.filter((heading) => heading === range.endHeading).length >= endOccurrence, true);
    }
  }
});

test("インストール対象ディレクトリだけで全ルーティング資料が完結する", () => {
  assert.equal(readFileSync(`${skillRoot}/references/source-loading-v1.json`, "utf8").length > 0, true);
  for (const source of Object.values(sourceCatalog)) {
    assert.equal(source.file.includes("/"), false);
    assert.equal(readFileSync(`${skillRoot}/references/${source.file}`, "utf8").length > 0, true);
  }
});
