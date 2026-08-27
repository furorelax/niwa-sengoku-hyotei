import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { applyAskDetail, type AskDetailState } from "../src/core/ask-detail.ts";

const items = [{ key: "military" }, { key: "diplomacy" }];

test("未取得項目を取得し、残り1回から0回へ遷移する", () => {
  const state: AskDetailState = { remaining: 1, acquiredKeys: [] };
  const result = applyAskDetail(state, items, { number: 2 });
  assert.deepEqual(result, {
    before: state,
    outcome: "acquired",
    reason: null,
    consumed: true,
    targetKey: "diplomacy",
    after: { remaining: 0, acquiredKeys: ["diplomacy"] },
  });
  assert.deepEqual(state, { remaining: 1, acquiredKeys: [] });
});

test("取得済み項目の再取得は残り0回でも無料", () => {
  const result = applyAskDetail({ remaining: 0, acquiredKeys: ["military"] }, items, { key: "military" });
  assert.equal(result.outcome, "already_acquired");
  assert.equal(result.consumed, false);
  assert.deepEqual(result.after, { remaining: 0, acquiredKeys: ["military"] });
});

test("残り0回では新規取得を拒否する", () => {
  const result = applyAskDetail({ remaining: 0, acquiredKeys: [] }, items, { key: "military" });
  assert.equal(result.reason, "no_remaining");
  assert.equal(result.targetKey, "military");
});

test("存在しない番号を拒否する", () => {
  assert.equal(applyAskDetail({ remaining: 2, acquiredKeys: [] }, items, { number: 3 }).reason, "unknown_number");
});

test("存在しないキーを拒否する", () => {
  assert.equal(applyAskDetail({ remaining: 2, acquiredKeys: [] }, items, { key: "missing" }).reason, "unknown_key");
});

test("複数項目指定を曖昧入力として拒否する", () => {
  const state = { remaining: 2, acquiredKeys: [] };
  const result = applyAskDetail(state, items, { key: "military", number: 1 });
  assert.equal(result.reason, "ambiguous_input");
  assert.deepEqual(result.after, state);
});

test("不正入力の不成立時に入力状態を変更しない", () => {
  const state = { remaining: 2, acquiredKeys: ["military"] };
  const snapshot = structuredClone(state);
  const result = applyAskDetail(state, items, { number: "1" });
  assert.equal(result.reason, "invalid_input");
  assert.deepEqual(state, snapshot);
  assert.deepEqual(result.before, snapshot);
  assert.deepEqual(result.after, snapshot);
  assert.notEqual(result.after, state);
});

test("スクリプトがJSONを標準入出力する", () => {
  const input = JSON.stringify({
    state: { remaining: 2, acquiredKeys: [] },
    presentedItems: items,
    input: { number: 1 },
  });
  const stdout = execFileSync(process.execPath, ["skills/niwa-sengoku-hyotei/scripts/ask-detail.ts"], {
    cwd: process.cwd(),
    input,
    encoding: "utf8",
  });
  const result = JSON.parse(stdout) as Record<string, unknown>;
  assert.equal(result.outcome, "acquired");
  assert.deepEqual(result.after, { remaining: 1, acquiredKeys: ["military"] });
});
