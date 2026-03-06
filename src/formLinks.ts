/**
 * Central list of form/signup links for Design Team Slack and projects.
 * Used as defaults and fallbacks when Firestore does not have a link set.
 */
export const GENERAL_DESIGN_TEAM_SLACK_FORM = 'https://forms.gle/Nrfpx14Qz82qBK2a6';

/** Map project title (case-insensitive partial match) to signup form URL. */
const PROJECT_FORM_LINKS: Record<string, string> = {
  'Battlebots': 'https://forms.gle/5CPvz6R6UDAnfbL29',
  'Battlebots Project': 'https://forms.gle/5CPvz6R6UDAnfbL29',
  'Drone': 'https://forms.gle/rj7qPgmR9nBTFE4n9',
  'Drone Project': 'https://forms.gle/rj7qPgmR9nBTFE4n9',
  'Project Impact': 'https://forms.gle/tLmLX7n4ad1hPGPg7',
  'Deltamorph': 'https://forms.gle/g9Mkc6WFNavxxMeb7',
  'Deltamorph (3D Printer)': 'https://forms.gle/g9Mkc6WFNavxxMeb7',
  '3D Printer': 'https://forms.gle/g9Mkc6WFNavxxMeb7',
  'Assistive Tech': 'https://forms.gle/5pT5VuDGT4Vn5xhN9',
};

/**
 * Returns the signup form URL for a project by title, or undefined if no match.
 * Strips HTML from title and matches case-insensitively; also tries partial match (e.g. "Battlebots" in "Battlebots Project").
 */
export function getProjectFormLinkByTitle(title: string | undefined): string | undefined {
  if (!title || typeof title !== 'string') return undefined;
  const plain = title.replace(/<[^>]*>/g, '').trim();
  if (!plain) return undefined;
  const lower = plain.toLowerCase();
  // Exact match first
  for (const [key, url] of Object.entries(PROJECT_FORM_LINKS)) {
    if (key.toLowerCase() === lower) return url;
  }
  // Partial: project title contains key (e.g. "Battlebots Project" contains "Battlebots")
  for (const [key, url] of Object.entries(PROJECT_FORM_LINKS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return url;
  }
  return undefined;
}
