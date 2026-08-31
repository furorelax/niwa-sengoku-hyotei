import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const skillRoot = `${process.cwd()}/skills/niwa-sengoku-hyotei`;
const skill = readFileSync(`${skillRoot}/SKILL.md`, "utf8");
const section = skill.match(/^## 生成ファイル画像デバッグ\n(?<body>[\s\S]*?)(?=^## |(?![\s\S]))/mu)?.groups?.body ?? "";

test("生成ファイル画像デバッグは完全一致入力を最優先で処理する", () => {
  assert.equal(section.length > 0, true);
  assert.equal(/ユーザー入力が`デバッグ：生成ファイル画像`と完全一致/u.test(section), true);
  assert.equal(/ほかのすべてのゲーム処理より先/u.test(section), true);
});

test("専用経路ではゲーム処理も資料読込も状態更新も行わない", () => {
  assert.equal(/通常ゲームを開始・再開・進行せず/u.test(section), true);
  for (const operation of ["評定", "会話", "進言", "合戦"]) {
    assert.equal(new RegExp(`${operation}[^。]*行わず`, "u").test(section), true);
  }
  assert.equal(/ゲーム資料を読み込まず/u.test(section), true);
  assert.equal(/ゲーム状態も作成・更新しない/u.test(section), true);
});

test("bundled assetだけを生成ファイルの入力元にして画像を改変しない", () => {
  assert.equal(readFileSync(`${skillRoot}/assets/oichi.webp`, "utf8").length > 0, true);
  assert.equal(/生成物の入力元[^。]*`assets\/oichi\.webp`だけ/u.test(section), true);
  assert.equal(/画像内容を改変しない/u.test(section), true);
  assert.equal(/生成画像ファイルとして複製または書き出し/u.test(section), true);
  assert.equal(/画像プレビューまたは画像添付としてsurface/u.test(section), true);
});

test("禁止された表示方法やサービスへフォールバックしない", () => {
  assert.equal(/!\[[^\]]*\]\([^)]*\)/u.test(section), false);
  assert.equal(/<img\b/iu.test(section), false);
  assert.equal(/https?:\/\//u.test(section), false);
  assert.equal(/data:image\//u.test(section), false);
  assert.equal(/[A-Za-z0-9+/]{80,}={0,2}/u.test(section), false);
  for (const forbidden of [
    "Markdown画像", "HTMLのimg要素", "外部URL", "GitHub Pages画像URL", "data URL",
    "base64文字列", "Apps SDK", "MCP", "外部サーバー", "通常リンク", "画像生成AI",
  ]) {
    assert.equal(new RegExp(`${forbidden}[^。]*使用しない`, "u").test(section), true);
  }
  assert.equal(/いずれにもフォールバックせず/u.test(section), true);
});

test("生成ファイルをsurfaceできない場合の出力は一行だけに固定する", () => {
  assert.equal(/公式手段が存在しない、またはSkillランタイムからsurfaceできない場合/u.test(section), true);
  assert.equal(/ほかの文字列を付けずに`FILE_IMAGE_UNSUPPORTED`とだけ出力する/u.test(section), true);
  assert.equal(section.match(/FILE_IMAGE_UNSUPPORTED/gu)?.length, 1);
});
