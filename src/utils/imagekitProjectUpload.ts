/**
 * ImageKit folder paths for project images.
 * Use `/site/projects/...` so uploads match the same prefix as About/admin (`/site/...`).
 * Some ImageKit path policies reject arbitrary roots like `/projects/...`.
 */
export const IMAGEKIT_PROJECT_ROOT = '/site/projects';

/** Modal "create project" — no Firestore id yet; unique file names still separate files. */
export const IMAGEKIT_PROJECT_NEW_UPLOAD_FOLDER = `${IMAGEKIT_PROJECT_ROOT}/new`;

function slugifyForImageKitPathSegment(raw: string, maxLen: number): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLen);
}

/**
 * Folder for an existing project document id.
 */
export function imageKitFolderForProjectId(projectId: string): string {
  const id = slugifyForImageKitPathSegment(projectId, 120);
  if (id) return `${IMAGEKIT_PROJECT_ROOT}/${id}`;
  return IMAGEKIT_PROJECT_NEW_UPLOAD_FOLDER;
}

/**
 * ImageKit tags should be short; avoid commas in values (API joins with comma).
 */
export function imageKitTagsForProject(projectId?: string): string[] {
  const tags = ['project'];
  const id = projectId ? slugifyForImageKitPathSegment(projectId, 80) : '';
  if (id) tags.push(id);
  return tags;
}
