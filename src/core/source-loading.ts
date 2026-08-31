import config from "../../skills/niwa-sengoku-hyotei/references/source-loading.json" with { type: "json" };

export type GamePhase = (typeof config.phases)[number];
export type InputKind = (typeof config.inputKinds)[number];
export type LoadProfile = keyof typeof config.profiles;
export type SourceId = keyof typeof config.sources;
export type CharacterId = keyof typeof config.characterImages;
export type CharacterImageSourceId = `character.image.${CharacterId}`;
export type ResolvedSourceId = SourceId | CharacterImageSourceId;

export interface GameStateForLoading {
  readonly phase: GamePhase;
  readonly chapter: 1 | 2 | 3;
  readonly route: "bui" | "gogi" | "toyo" | null;
  readonly currentCharacterId: string | null;
  readonly guestCharacterIds?: readonly string[];
  readonly detailItemKey?: string | null;
}

interface ProfileSelector {
  readonly chapterRouteSources?: Readonly<Record<string, readonly string[]>>;
  readonly characterSources?: Readonly<Record<string, readonly string[]>>;
  readonly characterImage?: boolean;
  readonly guestImages?: boolean;
  readonly detailSourcePrefix?: string;
}

export interface RoutedCharacterImage {
  readonly characterId: CharacterId;
  readonly markdown: string;
  readonly role: "current" | "guest";
}

function isCharacterId(value: string): value is CharacterId {
  return (config.characters as readonly string[]).includes(value);
}

function imageSourceId(characterId: CharacterId): CharacterImageSourceId {
  return `character.image.${characterId}`;
}

/** Selects the first exact/wildcard route declared in the installed skill's routing data. */
export function determineLoadProfile(state: GameStateForLoading, inputKind: InputKind): LoadProfile {
  const route = config.routes.find((candidate) =>
    (candidate.phase === state.phase || candidate.phase === "*") &&
    (candidate.inputKind === inputKind || candidate.inputKind === "*"));
  if (!route || !(route.profile in config.profiles)) {
    throw new Error(`No load profile for phase=${state.phase}, inputKind=${inputKind}`);
  }
  return route.profile as LoadProfile;
}

/** Resolves immutable, complete image Markdown; callers output it without reconstruction. */
export function routedCharacterImages(
  profile: LoadProfile,
  state: GameStateForLoading,
): readonly RoutedCharacterImage[] {
  const selector = (config.selectors as unknown as Record<string, ProfileSelector | undefined>)[profile];
  if (!selector?.characterImage) return [];
  if (!state.currentCharacterId) throw new Error(`Profile ${profile} requires currentCharacterId`);
  if (!isCharacterId(state.currentCharacterId)) throw new Error(`Unknown character ${state.currentCharacterId}`);
  const current = state.currentCharacterId;
  const result: RoutedCharacterImage[] = [{
    characterId: current,
    markdown: config.characterImages[current].markdown,
    role: "current",
  }];
  if (selector.guestImages) {
    for (const guest of state.guestCharacterIds ?? []) {
      if (!isCharacterId(guest)) throw new Error(`Unknown guest character ${guest}`);
      if (guest === current) throw new Error(`Current character cannot also be a guest: ${guest}`);
      if (result.some((image) => image.characterId === guest)) throw new Error(`Duplicate guest character ${guest}`);
      result.push({ characterId: guest, markdown: config.characterImages[guest].markdown, role: "guest" });
    }
  }
  return result;
}

/** Returns logical source IDs from the JSON source of truth and performs no I/O. */
export function requiredSources(profile: LoadProfile, state: GameStateForLoading): readonly ResolvedSourceId[] {
  const result = [...config.profiles[profile]] as string[];
  const selector = (config.selectors as unknown as Record<string, ProfileSelector | undefined>)[profile];
  const chapterRouteKey = state.chapter === 3 ? `3:${state.route ?? ""}` : String(state.chapter);
  if (selector?.chapterRouteSources) {
    const chapterSources = selector.chapterRouteSources[chapterRouteKey];
    if (!chapterSources) throw new Error(`No chapter sources for ${chapterRouteKey}`);
    result.push(...chapterSources);
  }
  const images = routedCharacterImages(profile, state);
  if (images[0]) result.push(imageSourceId(images[0].characterId));
  if (selector?.characterSources) {
    if (!state.currentCharacterId) throw new Error(`Profile ${profile} requires currentCharacterId`);
    const characterSources = selector.characterSources[state.currentCharacterId];
    if (!characterSources) throw new Error(`Unknown character ${state.currentCharacterId}`);
    result.push(...characterSources);
  }
  result.push(...images.slice(1).map((entry) => imageSourceId(entry.characterId)));
  if (selector?.detailSourcePrefix) {
    if (!state.detailItemKey) throw new Error(`Profile ${profile} requires detailItemKey`);
    result.push(`${selector.detailSourcePrefix}${state.detailItemKey}`);
  }
  for (const id of result) {
    if (!(id in config.sources) && !id.startsWith("character.image.")) throw new Error(`Unknown source ID ${id}`);
  }
  return result as ResolvedSourceId[];
}

export type ResponseScale = keyof typeof config.responseScale.definitions;
export type ShortSceneReason = "tenseBriefExchange" | "exitProcessing" | "briefInterruption";

export interface ResponseScaleContext {
  readonly askDetail?: boolean;
  readonly importantPoliticalDecision?: boolean;
  readonly directlySupportsRecommendation?: boolean;
  readonly namedGuestPresent?: boolean;
  readonly firstVisit?: boolean;
  readonly shortSceneReason?: ShortSceneReason | null;
}

/** Applies the JSON-declared precedence. Input length is intentionally not a criterion. */
export function determineResponseScale(context: ResponseScaleContext): ResponseScale {
  const matches: Readonly<Record<ResponseScale, boolean>> = {
    pivotal: Boolean(context.askDetail || context.importantPoliticalDecision || context.directlySupportsRecommendation),
    guestScene: Boolean(context.namedGuestPresent),
    firstVisit: Boolean(context.firstVisit),
    short: Boolean(context.shortSceneReason),
    standard: true,
  };
  const selected = config.responseScale.selectionPriority.find((scale) => matches[scale as ResponseScale]);
  if (!selected) throw new Error("No response scale matched");
  return selected as ResponseScale;
}
