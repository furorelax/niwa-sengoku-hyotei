import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const skillRoot = `${process.cwd()}/skills/niwa-sengoku-hyotei`;
const skill = readFileSync(`${skillRoot}/SKILL.md`, "utf8");
const section = skill.match(/^## 内蔵画像デバッグ\n(?<body>[\s\S]*?)(?=^## |(?![\s\S]))/mu)?.groups?.body ?? "";

test("検証対象のbundled assetが存在する", () => {
  assert.equal(readFileSync(`${skillRoot}/assets/oichi.webp`, "utf8").length > 0, true);
});

test("完全一致入力には通常ゲームを開始しない専用経路がある", () => {
  assert.equal(section.length > 0, true);
  assert.equal(/ユーザー入力が`デバッグ：内蔵画像`と完全一致/u.test(section), true);
  assert.equal(/ほかのすべてのゲーム処理より先/u.test(section), true);
  assert.equal(/通常ゲームを開始・再開・進行せず/u.test(section), true);
  assert.equal(/ゲーム状態も作成・更新しない/u.test(section), true);
  assert.equal(/`assets\/oichi\.webp`/u.test(section), true);
});

test("native surfaceがない場合の出力を固定する", () => {
  assert.equal(section.length > 0, true);
  assert.equal(/ほかの文字列を付けずに`ASSET_IMAGE_UNSUPPORTED`とだけ出力する/u.test(section), true);
  assert.equal(section.match(/ASSET_IMAGE_UNSUPPORTED/gu)?.length, 1);
});

test("画像の代替表現や外部サービスへフォールバックしない", () => {
  assert.equal(section.length > 0, true);
  assert.equal(/!\[[^\]]*\]\([^)]*\)/u.test(section), false);
  assert.equal(/https?:\/\//u.test(section), false);
  assert.equal(/data:image\//u.test(section), false);
  assert.equal(/[A-Za-z0-9+/]{80,}={0,2}/u.test(section), false);
  for (const forbidden of [
    "Markdown画像への変換", "外部URL", "data URL", "base64文字列", "画像生成",
    "Apps SDK", "MCP", "外部サーバー", "通常リンク",
  ]) {
    assert.equal(new RegExp(`${forbidden}[^。]*使用しない`, "u").test(section), true);
  }
  assert.equal(/いずれにもフォールバックせず/u.test(section), true);
});
