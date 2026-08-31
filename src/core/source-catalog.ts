import config from "../../skills/niwa-sengoku-hyotei/references/source-loading.json" with { type: "json" };
import type { SourceId } from "./source-loading.ts";

export interface SourceRange {
  readonly startHeading?: string;
  readonly endHeading?: string;
  readonly startHeadingOccurrence?: number;
  readonly endHeadingOccurrence?: number;
  readonly startMarker?: string;
  readonly endMarker?: string;
}

export interface SourceLocation {
  readonly file: string;
  readonly ranges: readonly SourceRange[];
}

/** Catalog view derived directly from the installed skill's JSON source of truth. */
export const sourceCatalog = config.sources as unknown as Readonly<Record<SourceId, SourceLocation>>;
