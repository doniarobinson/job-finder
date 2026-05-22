const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN",
  "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT",
  "VT", "VA", "WA", "WV", "WI", "WY",
]);

/** Longest first so "Los Angeles" wins over "Los". */
const MAJOR_US_CITIES = [
  "Salt Lake City",
  "Kansas City",
  "Los Angeles",
  "San Francisco",
  "San Diego",
  "San Antonio",
  "San Jose",
  "Fort Worth",
  "New York",
  "Las Vegas",
  "Oklahoma City",
  "Colorado Springs",
  "Virginia Beach",
  "Mountain View",
  "Palo Alto",
  "Brooklyn",
  "Manhattan",
  "Chicago",
  "Seattle",
  "Portland",
  "Austin",
  "Boston",
  "Denver",
  "Atlanta",
  "Phoenix",
  "Dallas",
  "Houston",
  "Miami",
  "Philadelphia",
  "Detroit",
  "Minneapolis",
  "Nashville",
  "Charlotte",
  "Raleigh",
  "Tampa",
  "Orlando",
  "Oakland",
  "Berkeley",
  "Cambridge",
  "Arlington",
  "Alexandria",
  "Baltimore",
  "Pittsburgh",
  "Cleveland",
  "Columbus",
  "Indianapolis",
  "Milwaukee",
  "Sacramento",
  "Richmond",
];

const CITY_STATE_RE =
  /\b([A-Za-z][A-Za-z.'-]*(?:[ \t]+[A-Za-z][A-Za-z.'-]*)*),\s*([A-Za-z]{2})\b/g;

const REMOTE_RE = /^remote$/i;

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function normalizeCityState(city: string, state: string): string | null {
  const st = state.toUpperCase();
  if (!US_STATE_CODES.has(st)) return null;

  const trimmedCity = city.trim();
  if (trimmedCity.length < 2) return null;

  return `${titleCaseWords(trimmedCity)}, ${st}`;
}

export function extractCityStateLocations(text: string): string[] {
  const matches: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    for (const match of line.matchAll(CITY_STATE_RE)) {
      const normalized = normalizeCityState(match[1] ?? "", match[2] ?? "");
      if (normalized) matches.push(normalized);
    }
  }

  return matches;
}

function extractMajorCityNamesFromLines(lines: string[]): string[] {
  const found: string[] = [];

  for (const line of lines) {
    if (extractCityStateLocations(line).length > 0) continue;

    const lower = line.toLowerCase();
    for (const city of MAJOR_US_CITIES) {
      const pattern = new RegExp(`\\b${city.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (pattern.test(lower)) found.push(city);
    }
  }

  return found;
}

function dropRedundantCityNames(locations: string[]): string[] {
  const citiesWithState = new Set(
    locations
      .filter((location) => /,\s*[A-Z]{2}$/.test(location))
      .map((location) => location.split(",")[0]!.trim().toLowerCase())
  );

  return locations.filter((location) => {
    if (/,\s*[A-Z]{2}$/.test(location)) return true;
    return !citiesWithState.has(location.toLowerCase());
  });
}

function splitNonRemote(locations: string[]): { cities: string[]; remote: string[] } {
  const cities: string[] = [];
  const remote: string[] = [];

  for (const location of locations) {
    const trimmed = location.trim();
    if (!trimmed) continue;
    if (REMOTE_RE.test(trimmed)) remote.push(trimmed);
    else cities.push(trimmed);
  }

  return { cities, remote };
}

function mergeLocations(...groups: string[][]): string[] {
  return dropRedundantCityNames(dedupeLocations(groups.flat()));
}

function locationsFromLines(lines: string[]): string[] {
  const text = lines.join("\n");
  return mergeLocations(extractCityStateLocations(text), extractMajorCityNamesFromLines(lines));
}

function dedupeLocations(locations: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const location of locations) {
    const key = location.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(location);
  }

  return result;
}

function findExperienceSectionStart(lines: string[]): number {
  return lines.findIndex((line) =>
    /^(experience|employment|work history|professional experience|work experience)\b/i.test(line.trim())
  );
}

function getHeaderLines(lines: string[]): string[] {
  const sectionStart = lines.findIndex((line) =>
    /^(experience|employment|work history|professional experience|work experience|education|skills|summary|projects)\b/i.test(
      line.trim()
    )
  );

  if (sectionStart > 0) {
    return lines.slice(0, sectionStart);
  }

  return lines.slice(0, 12);
}

/**
 * Infer job-search locations from resume text.
 * Priority: explicit Locations: line → header (top lines) → experience section.
 */
export function inferResumeLocations(resumeText: string, explicitFromLine: string[] = []): string[] {
  if (explicitFromLine.length > 0) {
    const { cities, remote } = splitNonRemote(explicitFromLine);
    return dedupeLocations([...cities, ...remote]).slice(0, 5);
  }

  const lines = resumeText.split(/\r?\n/);
  const headerLines = getHeaderLines(lines);

  const headerLocations = locationsFromLines(headerLines);
  if (headerLocations.length > 0) {
    return headerLocations.slice(0, 5);
  }

  const experienceStart = findExperienceSectionStart(lines);
  const experienceLines =
    experienceStart >= 0 ? lines.slice(experienceStart) : lines.slice(12);

  return locationsFromLines(experienceLines).slice(0, 5);
}
