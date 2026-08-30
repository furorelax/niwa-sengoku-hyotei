import config from "../../skills/niwa-sengoku-hyotei/references/source-loading-v2.json" with { type: "json" };

export type GamePhase = (typeof config.phases)[number];
export type InputKind = (typeof config.inputKinds)[number];
export type LoadProfile = keyof typeof config.profiles;
export type SourceId = keyof typeof config.sources;

export interface GameStateForLoading {
  readonly phase: GamePhase;
  readonly chapter: 1 | 2 | 3;
  readonly route: "bui" | "gogi" | "toyo" | null;
  readonly currentCharacterId: string | null;
  readonly detailItemKey?: string | null;
}

interface ProfileSelector {
  readonly chapterRouteSources?: Readonly<Record<string, readonly string[]>>;
  readonly characterSources?: Readonly<Record<string, readonly string[]>>;
  readonly detailSourcePrefix?: string;
}

/** Selects the first exact/wildcard route declared in the installed skill's routing data. */
export function determineLoadProfile(
  state: GameStateForLoading,
  inputKind: InputKind,
): LoadProfile {
  const route = config.routes.find(
    (candidate) =>
      (candidate.phase === state.phase || candidate.phase === "*") &&
      (candidate.inputKind === inputKind || candidate.inputKind === "*"),
  );
  if (!route || !(route.profile in config.profiles)) {
    throw new Error(`No load profile for phase=${state.phase}, inputKind=${inputKind}`);
  }
  return route.profile as LoadProfile;
}

/** Returns logical source IDs from the JSON source of truth and performs no I/O. */
export function requiredSources(
  profile: LoadProfile,
  state: GameStateForLoading,
): readonly SourceId[] {
  const result = [...config.profiles[profile]] as string[];
  const selector = (config.selectors as unknown as Record<string, ProfileSelector | undefined>)[profile];
  const chapterRouteKey = state.chapter === 3 ? `3:${state.route ?? ""}` : String(state.chapter);

  if (selector?.chapterRouteSources) {
    const chapterSources = selector.chapterRouteSources[chapterRouteKey];
    if (!chapterSources) throw new Error(`No chapter sources for ${chapterRouteKey}`);
    result.push(...chapterSources);
  }
  if (selector?.characterSources) {
    if (!state.currentCharacterId) throw new Error(`Profile ${profile} requires currentCharacterId`);
    const characterSources = selector.characterSources[state.currentCharacterId];
    if (!characterSources) throw new Error(`Unknown character ${state.currentCharacterId}`);
    result.push(...characterSources);
  }
  if (selector?.detailSourcePrefix) {
    if (!state.detailItemKey) throw new Error(`Profile ${profile} requires detailItemKey`);
    result.push(`${selector.detailSourcePrefix}${state.detailItemKey}`);
  }
  for (const id of result) {
    if (!(id in config.sources)) throw new Error(`Unknown source ID ${id}`);
  }
  return result as SourceId[];
}
