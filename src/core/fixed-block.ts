/** A fixed block is copied verbatim; only its two marker lines are removed. */
export function extractFixedBlock(source: string, startMarker: string, endMarker: string): string {
  const lines = source.split(/(?<=\n)/u);
  const lineText = (line: string) => line.replace(/\r?\n$/u, "");
  const start = lines.findIndex((line) => lineText(line) === startMarker);
  if (start < 0) throw new Error(`Missing fixed-block start marker: ${startMarker}`);
  const relativeEnd = lines.slice(start + 1).findIndex((line) => lineText(line) === endMarker);
  if (relativeEnd < 0) throw new Error(`Missing fixed-block end marker: ${endMarker}`);
  const end = start + relativeEnd + 1;

  // Remove the newline belonging to the start marker and the newline immediately
  // before the end marker, while retaining every byte between those boundaries.
  return lines.slice(start + 1, end).join("").replace(/\r?\n$/u, "");
}

export function countFixedToken(value: string, token: "![" | "&nbsp;"): number {
  return value.split(token).length - 1;
}
