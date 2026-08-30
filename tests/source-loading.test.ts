import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import config from "../skills/niwa-sengoku-hyotei/references/source-loading-v2.json" with { type: "json" };
import { sourceCatalog, type SourceRange } from "../src/core/source-catalog.ts";
import { determineLoadProfile, requiredSources, type GameStateForLoading, type InputKind } from "../src/core/source-loading.ts";

const skillRoot = `${process.cwd()}/skills/niwa-sengoku-hyotei`;
const state = (overrides: Partial<GameStateForLoading> = {}): GameStateForLoading => ({
  phase: "pre_start", chapter: 1, route: null, currentCharacterId: null, ...overrides,
});
const resolve = (gameState: GameStateForLoading, input: InputKind) =>
  requiredSources(determineLoadProfile(gameState, input), gameState);

test("新規初回とゲーム開始は別プロファイル・別資料になる", () => {
  assert.deepEqual(resolve(state(), "first_input"), ["rules.pre_start", "content.pre_start"]);
  assert.equal(determineLoadProfile(state(), "start"), "council_start");
  assert.deepEqual(resolve(state(), "start"), ["rules.council_start", "content.council_start.1"]);
});

test("評定開始と評定意見受領を分離し、現在章だけを選ぶ", () => {
  const council = state({ phase: "council", chapter: 2 });
  assert.equal(determineLoadProfile(council, "council_opinion"), "council_response");
  assert.deepEqual(resolve(council, "council_opinion"), [
    "rules.council_response", "content.council_response.2", "content.chapter_topic.2",
  ]);
});

test("人物会話は現在人物のカード・詳細・関係と現在章の話題だけを選ぶ", () => {
  const conversation = state({ phase: "conversation", currentCharacterId: "katsuie" });
  assert.deepEqual(resolve(conversation, "select_character"), [
    "rules.conversation", "content.conversation_ui.1", "content.chapter_topic.1",
    "character.card.katsuie", "character.detail.katsuie", "character.relationships.katsuie",
  ]);
  assert.deepEqual(resolve(conversation, "play"), [
    "rules.conversation", "content.chapter_topic.1", "character.card.katsuie",
    "character.detail.katsuie", "character.relationships.katsuie",
  ]);
  assert.equal(resolve(conversation, "play").some((id) => id.includes("hideyoshi")), false);
});

test("詳しく聞くは成立項目キー一件の回答だけを選ぶ", () => {
  const detail = state({ phase: "conversation", currentCharacterId: "katsuie", detailItemKey: "K001" });
  const ids = resolve(detail, "ask_detail");
  assert.equal(ids.includes("detail.answer.K001"), true);
  assert.equal(ids.some((id) => id.startsWith("detail.answer.") && id !== "detail.answer.K001"), false);
});

test("JSON内の全プロファイルとselectorが登録済み資料IDだけを指す", () => {
  for (const [id] of Object.entries(config.sources)) {
    assert.equal(Boolean(sourceCatalog[id as keyof typeof sourceCatalog]), true);
  }
  for (const ids of Object.values(config.profiles)) {
    for (const id of ids) assert.equal(id in config.sources, true);
  }
  const selectorSourceReferences = JSON.stringify(config.selectors)
    .match(/(?:content|character|detail)\.[a-zA-Z0-9_.:-]+/gu) ?? [];
  for (const idOrPrefix of selectorSourceReferences) {
    const exists = idOrPrefix.endsWith(".")
      ? Object.keys(config.sources).some((id) => id.startsWith(idOrPrefix))
      : idOrPrefix in config.sources;
    assert.equal(exists, true);
  }
});

function occurrenceIndex(lines: readonly string[], value: string, occurrence = 1): number {
  let seen = 0;
  return lines.findIndex((line) => line === value && ++seen === occurrence);
}

function rangeBounds(lines: readonly string[], range: SourceRange): readonly [number, number] {
  if (range.startMarker && range.endMarker) {
    const start = occurrenceIndex(lines, range.startMarker);
    const relativeEnd = lines.slice(start + 1).findIndex((line) => line === range.endMarker);
    return [start, relativeEnd < 0 ? -1 : start + relativeEnd + 1];
  }
  const start = occurrenceIndex(lines, range.startHeading ?? "", range.startHeadingOccurrence);
  let end = occurrenceIndex(lines, range.endHeading ?? "", range.endHeadingOccurrence);
  if (start === end) {
    const level = (range.startHeading?.match(/^#+/u)?.[0].length) ?? 1;
    const relative = lines.slice(start + 1).findIndex((line) => {
      const match = line.match(/^(#+) /u);
      return Boolean(match && match[1].length <= level);
    });
    end = relative < 0 ? lines.length - 1 : start + relative;
  }
  return [start, end];
}

test("JSONが指す全ファイルと全境界が実在し、順序が正しい", () => {
  for (const source of Object.values(sourceCatalog)) {
    const lines = readFileSync(`${skillRoot}/references/${source.file}`, "utf8").split(/\r?\n/u);
    for (const range of source.ranges) {
      const [start, end] = rangeBounds(lines, range);
      assert.equal(start >= 0, true);
      assert.equal(end >= start, true);
    }
  }
});

function loadedLines(ids: readonly string[]): number {
  return ids.reduce((total, id) => {
    const source = sourceCatalog[id as keyof typeof sourceCatalog];
    const lines = readFileSync(`${skillRoot}/references/${source.file}`, "utf8").split(/\r?\n/u);
    return total + source.ranges.reduce((sum, range) => {
      const [start, end] = rangeBounds(lines, range);
      return sum + end - start + 1;
    }, 0);
  }, 0);
}

test("代表操作の読込量を計測し退行上限を守る", () => {
  const character = state({ phase: "conversation", currentCharacterId: "katsuie" });
  const metrics = {
    pre_start: loadedLines(resolve(state(), "first_input")),
    council_start: loadedLines(resolve(state(), "start")),
    council_response: loadedLines(resolve(state({ phase: "council" }), "council_opinion")),
    character_select: loadedLines(resolve(character, "select_character")),
    character_talk: loadedLines(resolve(character, "play")),
  };
  process.stdout.write(`source-loading line metrics: ${JSON.stringify(metrics)}\n`);
  const budgets = { pre_start: 50, council_start: 250, council_response: 250, character_select: 600, character_talk: 570 };
  for (const key of Object.keys(metrics) as Array<keyof typeof metrics>) {
    assert.equal(metrics[key] <= budgets[key], true);
  }
});

test("単体スキルのscripts importはスキル外を参照しない", () => {
  for (const file of readdirSync(`${skillRoot}/scripts`)) {
    if (!file.endsWith(".ts")) continue;
    const code = readFileSync(`${skillRoot}/scripts/${file}`, "utf8");
    for (const match of code.matchAll(/from\s+["']([^"']+)["']/gu)) {
      const specifier = match[1];
      assert.equal(specifier.startsWith("node:") || specifier.startsWith("./"), true);
      assert.equal(specifier.includes("../"), false);
    }
  }
});

test("インストール対象ディレクトリだけで全ルーティング資料が完結する", () => {
  assert.equal(readFileSync(`${skillRoot}/references/source-loading-v2.json`, "utf8").length > 0, true);
  for (const source of Object.values(sourceCatalog)) {
    assert.equal(source.file.includes("/"), false);
    assert.equal(readFileSync(`${skillRoot}/references/${source.file}`, "utf8").length > 0, true);
  }
});
