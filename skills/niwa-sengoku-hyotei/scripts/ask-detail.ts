#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { applyAskDetail } from "./ask-detail-core.ts";

interface ScriptInput {
  readonly state: { readonly remaining: number; readonly acquiredKeys: readonly string[] };
  readonly presentedItems: readonly { readonly key: string }[];
  readonly input: unknown;
}

function isScriptInput(value: unknown): value is ScriptInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  const state = input.state as Record<string, unknown> | null;
  return (
    typeof state === "object" &&
    state !== null &&
    Number.isInteger(state.remaining) &&
    (state.remaining as number) >= 0 &&
    Array.isArray(state.acquiredKeys) &&
    state.acquiredKeys.every((key) => typeof key === "string") &&
    new Set(state.acquiredKeys).size === state.acquiredKeys.length &&
    Array.isArray(input.presentedItems) &&
    input.presentedItems.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        !Array.isArray(item) &&
        typeof (item as Record<string, unknown>).key === "string",
    )
  );
}

const parsed: unknown = JSON.parse(readFileSync(0, "utf8"));
if (!isScriptInput(parsed)) {
  process.stderr.write("Invalid ask-detail JSON input\n");
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify(applyAskDetail(parsed.state, parsed.presentedItems, parsed.input))}\n`);
}
