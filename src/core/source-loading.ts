import config from "../../skills/niwa-sengoku-hyotei/references/source-loading-v1.json" with { type: "json" };

export type GamePhase = (typeof config.phases)[number];
export type InputKind = (typeof config.inputKinds)[number];
export type LoadProfile = keyof typeof config.profiles;
export type SourceId = keyof typeof config.sources;

export interface GameStateForLoading {
  readonly phase: GamePhase;
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
export function requiredSources(profile: LoadProfile): readonly SourceId[] {
  return [...config.profiles[profile]] as SourceId[];
}
