import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import type { DesignTeamContent } from '../types';
import { DEFAULT_DESIGN_TEAM } from '../types';

const CONFIG_PATH = 'config';
export const ABOUT_TEAM_BLOCKS_DOC_ID = 'aboutTeamBlocks';

const ref = () => doc(db, CONFIG_PATH, ABOUT_TEAM_BLOCKS_DOC_ID);

export function defaultTeamBlock(teamName: string): DesignTeamContent {
  const t = teamName.trim();
  return {
    ...DEFAULT_DESIGN_TEAM,
    sectionTitle: t ? `Our ${t}` : DEFAULT_DESIGN_TEAM.sectionTitle,
    leftImageUrl: `https://picsum.photos/seed/${encodeURIComponent(t || 'team')}/800/600`,
  };
}

/** Ensures config/aboutTeamBlocks.blocks[teamName] exists (merge). Call when a team label is added. */
export async function ensureTeamBlockForTeam(teamName: string): Promise<void> {
  const trimmed = teamName.trim();
  if (!trimmed) return;
  const block = defaultTeamBlock(trimmed);
  await setDoc(ref(), { blocks: { [trimmed]: block } }, { merge: true });
}

/** Removes the block for a team label. Call when a team is deleted. */
export async function removeTeamBlock(teamName: string): Promise<void> {
  const trimmed = teamName.trim();
  if (!trimmed) return;
  const snap = await getDoc(ref());
  if (!snap.exists()) return;
  await updateDoc(ref(), { [`blocks.${trimmed}`]: deleteField() });
}
