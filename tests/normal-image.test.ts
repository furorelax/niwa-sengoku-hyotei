import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const skill = readFileSync(`${process.cwd()}/skills/niwa-sengoku-hyotei/SKILL.md`, "utf8");
const section = skill.match(/^## 通常画像デバッグ\n(?<body>[\s\S]*?)(?=^## |(?![\s\S]))/mu)?.groups?.body ?? "";
const imageMarkdown = "![お市](https://furorelax.github.io/ai-runtime-assets/niwa/images/character_oichi_rev1.webp)";

test("完全一致入力を通常ゲームより先に処理する専用経路がある", () => {
  assert.equal(section.length > 0, true);
  assert.equal(/ユーザー入力が`デバッグ：通常画像`と完全一致/u.test(section), true);
  assert.equal(/ほかのすべてのゲーム処理より先/u.test(section), true);
  assert.equal(/通常ゲームを開始・再開・進行せず/u.test(section), true);
  assert.equal(/ゲーム状態も作成・更新しない/u.test(section), true);
});

test("指定された本文とお市画像URLだけを通常assistant返信として出力する", () => {
  assert.equal(section.includes("次の3要素だけ"), true);
  assert.equal(section.includes("通常のassistantチャット返信"), true);
  assert.equal(section.includes("writing blockやdocumentではない"), true);
  assert.equal(section.includes("お市は長秀へ目を向ける。"), true);
  assert.equal(section.includes("「長秀殿も、そう思われますか？」"), true);
  assert.equal(section.split("\n").filter((line) => line === imageMarkdown).length, 1);
  assert.equal(section.includes(`\n\n${imageMarkdown}\n\n`), true);
});

test("固定資料や画像用の別経路を使用しない", () => {
  for (const excluded of ["固定ブロック", "`references`内のMarkdown", "bundled asset", "MCP", "Apps SDK"]) {
    assert.equal(new RegExp(`${excluded}[^。]*使用しない`, "u").test(section), true);
  }
  assert.equal(/画像Markdownは独立した1行として生成する/u.test(section), true);
});
