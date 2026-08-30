declare module "node:assert/strict" {
  const assert: {
    deepEqual(actual: unknown, expected: unknown): void;
    equal(actual: unknown, expected: unknown): void;
    notEqual(actual: unknown, expected: unknown): void;
  };
  export default assert;
}

declare module "node:child_process" {
  export function execFileSync(
    file: string,
    args: readonly string[],
    options: { cwd: string; input: string; encoding: "utf8" },
  ): string;
}

declare module "node:fs" {
  export function readFileSync(path: number | string, encoding: "utf8"): string;
}

declare module "node:test" {
  export default function test(name: string, callback: () => void): void;
}

declare const process: {
  readonly execPath: string;
  exitCode?: number;
  cwd(): string;
  readonly stderr: { write(value: string): void };
  readonly stdout: { write(value: string): void };
};
