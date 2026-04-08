import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './config';

export const TEAM_SETTINGS_DOC_ID = 'teamSettings';

export interface TeamSettings {
  /** All team labels assignable to executive roles (Member Management). */
  teamNames: string[];
  /** `users.team` value for members shown under Executive Board on About. */
  execBoardTeamName: string;
  /** `users.team` value for members shown under Design Team on About. */
  designTeamTeamName: string;
}

export const DEFAULT_TEAM_SETTINGS: TeamSettings = {
  teamNames: ['General Body', 'Design Team'],
  execBoardTeamName: 'General Body',
  designTeamTeamName: 'Design Team',
};

export function normalizeTeamSettings(data: Record<string, unknown> | undefined): TeamSettings {
  const d = data || {};
  let teamNames = Array.isArray(d.teamNames)
    ? (d.teamNames as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [...DEFAULT_TEAM_SETTINGS.teamNames];
  if (teamNames.length === 0) teamNames = [...DEFAULT_TEAM_SETTINGS.teamNames];

  let execBoardTeamName =
    typeof d.execBoardTeamName === 'string' && d.execBoardTeamName.trim()
      ? d.execBoardTeamName.trim()
      : DEFAULT_TEAM_SETTINGS.execBoardTeamName;
  let designTeamTeamName =
    typeof d.designTeamTeamName === 'string' && d.designTeamTeamName.trim()
      ? d.designTeamTeamName.trim()
      : DEFAULT_TEAM_SETTINGS.designTeamTeamName;

  if (!teamNames.includes(execBoardTeamName)) {
    execBoardTeamName = teamNames[0] ?? DEFAULT_TEAM_SETTINGS.execBoardTeamName;
  }
  if (!teamNames.includes(designTeamTeamName)) {
    designTeamTeamName =
      teamNames.find((t) => t !== execBoardTeamName) ??
      teamNames[0] ??
      DEFAULT_TEAM_SETTINGS.designTeamTeamName;
  }

  return { teamNames, execBoardTeamName, designTeamTeamName };
}

const teamSettingsRef = () => doc(db, 'config', TEAM_SETTINGS_DOC_ID);

export async function getTeamSettings(): Promise<TeamSettings> {
  const snap = await getDoc(teamSettingsRef());
  return normalizeTeamSettings(snap.exists() ? (snap.data() as Record<string, unknown>) : undefined);
}

export function subscribeTeamSettings(
  onNext: (settings: TeamSettings) => void,
  onError?: (error: unknown) => void
): () => void {
  return onSnapshot(
    teamSettingsRef(),
    (snap) => {
      onNext(normalizeTeamSettings(snap.exists() ? (snap.data() as Record<string, unknown>) : undefined));
    },
    (err) => onError?.(err)
  );
}

export async function saveTeamSettings(partial: Partial<TeamSettings>): Promise<void> {
  await setDoc(teamSettingsRef(), partial, { merge: true });
}
