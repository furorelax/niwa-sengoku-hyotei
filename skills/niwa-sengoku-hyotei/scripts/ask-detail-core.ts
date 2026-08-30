export interface AskDetailState {
  readonly remaining: number;
  readonly acquiredKeys: readonly string[];
}

export interface PresentedDetailItem {
  readonly key: string;
}

export type AskDetailRequest =
  | { readonly key: string; readonly number?: never }
  | { readonly number: number; readonly key?: never };

export type AskDetailRejectionReason =
  | "invalid_input"
  | "ambiguous_input"
  | "unknown_number"
  | "unknown_key"
  | "no_remaining";

export interface AskDetailResult {
  readonly before: AskDetailState;
  readonly outcome: "acquired" | "already_acquired" | "rejected";
  readonly reason: AskDetailRejectionReason | null;
  readonly consumed: boolean;
  readonly targetKey: string | null;
  readonly after: AskDetailState;
}

function copyState(state: AskDetailState): AskDetailState {
  return { remaining: state.remaining, acquiredKeys: [...state.acquiredKeys] };
}

/** Applies one deterministic 「詳しく聞く」 selection without mutating its inputs. */
export function applyAskDetail(
  state: AskDetailState,
  presentedItems: readonly PresentedDetailItem[],
  input: unknown,
): AskDetailResult {
  const before = copyState(state);
  const reject = (
    reason: AskDetailRejectionReason,
    targetKey: string | null = null,
  ): AskDetailResult => ({
    before,
    outcome: "rejected",
    reason,
    consumed: false,
    targetKey,
    after: copyState(state),
  });

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return reject("invalid_input");
  }

  const candidate = input as Record<string, unknown>;
  const hasKey = Object.hasOwn(candidate, "key");
  const hasNumber = Object.hasOwn(candidate, "number");
  if (hasKey && hasNumber) return reject("ambiguous_input");
  if (!hasKey && !hasNumber) return reject("invalid_input");

  let targetKey: string;
  if (hasNumber) {
    if (!Number.isInteger(candidate.number) || (candidate.number as number) < 1) {
      return reject("invalid_input");
    }
    const item = presentedItems[(candidate.number as number) - 1];
    if (!item) return reject("unknown_number");
    targetKey = item.key;
  } else {
    if (typeof candidate.key !== "string" || candidate.key.length === 0) {
      return reject("invalid_input");
    }
    targetKey = candidate.key;
    if (!presentedItems.some((item) => item.key === targetKey)) {
      return reject("unknown_key");
    }
  }

  if (state.acquiredKeys.includes(targetKey)) {
    return {
      before,
      outcome: "already_acquired",
      reason: null,
      consumed: false,
      targetKey,
      after: copyState(state),
    };
  }
  if (state.remaining === 0) return reject("no_remaining", targetKey);

  return {
    before,
    outcome: "acquired",
    reason: null,
    consumed: true,
    targetKey,
    after: {
      remaining: state.remaining - 1,
      acquiredKeys: [...state.acquiredKeys, targetKey],
    },
  };
}
