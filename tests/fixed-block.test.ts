import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { countFixedToken, extractFixedBlock } from "../src/core/fixed-block.ts";

const root = `${process.cwd()}/skills/niwa-sengoku-hyotei/references`;
const fixedFiles = ["prestart.md", "council-start.md", "battle-ch02.md", "recommendation-flow.md", "chapter-end.md"];

interface FixedBlock { file: string; start: string; end: string; source: string }

function allFixedBlocks(): FixedBlock[] {
  const blocks: FixedBlock[] = [];
  for (const file of fixedFiles) {
    const source = readFileSync(`${root}/${file}`, "utf8");
    for (const match of source.matchAll(/^START_([A-Z0-9_]+)$/gmu)) {
      blocks.push({ file, start: match[0], end: `END_${match[1]}`, source });
    }
  }
  return blocks;
}

function referenceBody(block: FixedBlock): string {
  const lines = block.source.split(/\r?\n/u);
  const start = lines.indexOf(block.start);
  const end = lines.indexOf(block.end, start + 1);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return lines.slice(start + 1, end).join("\n");
}

test("既存33固定ブロックをすべて取得対象として維持する", () => {
  assert.equal(allFixedBlocks().length, 33);
});

test("全固定ブロックはマーカーだけを除き画像・nbsp・空行を含む原本と一致する", () => {
  for (const block of allFixedBlocks()) {
    const actual = extractFixedBlock(block.source, block.start, block.end);
    const expected = referenceBody(block);
    assert.equal(actual, expected);
    assert.equal(actual.includes(block.start), false);
    assert.equal(actual.includes(block.end), false);
    assert.equal(countFixedToken(actual, "!["), countFixedToken(expected, "!["));
    assert.equal(countFixedToken(actual, "&nbsp;"), countFixedToken(expected, "&nbsp;"));
  }
});

test("画像Markdownを含む固定ブロックで画像行と出現数を欠落させない", () => {
  const imageBlocks = allFixedBlocks().filter((block) => referenceBody(block).includes("!["));
  assert.equal(imageBlocks.length > 0, true);
  for (const block of imageBlocks) {
    const expectedImages = referenceBody(block).split("\n").filter((line) => line.includes("!["));
    const actual = extractFixedBlock(block.source, block.start, block.end);
    const actualImages = actual.split("\n").filter((line) => line.includes("!["));
    assert.deepEqual(actualImages, expectedImages);
    assert.equal(countFixedToken(actual, "!["), expectedImages.reduce((n, line) => n + countFixedToken(line, "!["), 0));
  }
});
