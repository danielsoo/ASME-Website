import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import type { GeneralBodyContent } from '../types';
import { EMPTY_GENERAL_BODY_FORM } from '../types';

const CONFIG_PATH = 'config';
export const ABOUT_TEAM_BLOCKS_DOC_ID = 'aboutTeamBlocks';

const ref = () => doc(db, CONFIG_PATH, ABOUT_TEAM_BLOCKS_DOC_ID);

export function defaultTeamBlock(_teamName: string): GeneralBodyContent {
  return { ...EMPTY_GENERAL_BODY_FORM };
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
