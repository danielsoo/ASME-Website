import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import type {
  FooterContent,
  HomeContent,
  AboutContent,
  AboutTeamBlocksDoc,
  SponsorsContent,
  GeneralBodyContent,
  DesignTeamContent,
} from '../../src/types';
import {
  DEFAULT_FOOTER,
  DEFAULT_HOME,
  DEFAULT_ABOUT,
  DEFAULT_SPONSORS,
  DEFAULT_GENERAL_BODY,
  DEFAULT_DESIGN_TEAM,
  EMPTY_GENERAL_BODY_FORM,
} from '../../src/types';
import RichTextEditor from '../../src/components/RichTextEditor';
import AboutSiteImageField, {
  AboutSiteLayoutPreview,
  ABOUT_SITE_IMAGE_PLACEHOLDER,
} from '../../src/components/AboutSiteImageField';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';
import {
  subscribeTeamSettings,
  DEFAULT_TEAM_SETTINGS,
  type TeamSettings,
} from '../../src/firebase/teamSettings';
import { teamAboutPath } from '../About';

const CONFIG_PATH = 'config';
const FOOTER_DOC = 'footer';
const HOME_DOC = 'home';
const ABOUT_DOC = 'about';
const GENERAL_BODY_DOC = 'aboutGeneralBody';
const ABOUT_TEAM_BLOCKS_DOC = 'aboutTeamBlocks';
const DESIGN_TEAM_DOC = 'aboutDesignTeam';
const SPONSORS_DOC = 'sponsors';

type SiteContentTab = 'footer' | 'home' | 'about' | 'sponsors';

interface SiteContentProps {
  onNavigate: (path: string) => void;
  currentUserRole: string;
  currentPath?: string;
}

function footerEquals(a: FooterContent, b: FooterContent): boolean {
  const keys: (keyof FooterContent)[] = ['phone', 'email1', 'email2', 'missionStatement', 'addressLine1', 'addressLine2', 'instagramUrl', 'groupmeUrl', 'slackUrl'];
  return keys.every((k) => (a[k] ?? '') === (b[k] ?? ''));
}

const HOME_KEYS: (keyof HomeContent)[] = ['heroLine1', 'heroLine2', 'heroLine3', 'nextMeetingTitle', 'whatWeDoTitle', 'whatWeDoParagraph1', 'whatWeDoParagraph2', 'whatWeDoButtonText', 'whatWeDoButtonUrl'];
function homeEquals(a: HomeContent, b: HomeContent): boolean {
  return HOME_KEYS.every((k) => (a[k] ?? '') === (b[k] ?? ''));
}

const ABOUT_KEYS: (keyof AboutContent)[] = [
  'aboutTitle',
  'heroImageUrl',
  'aboutParagraph1',
  'aboutParagraph2',
  'aboutLinkUrl',
  'paragraphFontFamily',
  'paragraphFontWeight',
];
function aboutEquals(a: AboutContent, b: AboutContent): boolean {
  return ABOUT_KEYS.every((k) => (a[k] ?? '') === (b[k] ?? ''));
}

function generalBodyEquals(a: GeneralBodyContent, b: GeneralBodyContent): boolean {
  if ((a.activitiesTitle ?? '') !== (b.activitiesTitle ?? '')) return false;
  if ((a.leftImageUrl ?? '') !== (b.leftImageUrl ?? '')) return false;
  if ((a.pastEventsTitle ?? '') !== (b.pastEventsTitle ?? '')) return false;
  if ((a.bodySectionTitle ?? '') !== (b.bodySectionTitle ?? '')) return false;
  const al = a.activitiesList ?? [];
  const bl = b.activitiesList ?? [];
  if (al.length !== bl.length) return false;
  if (al.some((v, i) => v !== bl[i])) return false;
  const ae = a.pastEventsList ?? [];
  const be = b.pastEventsList ?? [];
  if (ae.length !== be.length) return false;
  return !ae.some((v, i) => v !== be[i]);
}

/** Old Firestore data used DesignTeamContent per team; migrate to GeneralBodyContent (keep image). */
function normalizeTeamBlockFromFirestore(raw: unknown): GeneralBodyContent {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_GENERAL_BODY_FORM };
  const o = raw as Record<string, unknown>;
  if ('introParagraph1' in o || 'introParagraph2' in o) {
    return {
      ...EMPTY_GENERAL_BODY_FORM,
      leftImageUrl: typeof o.leftImageUrl === 'string' ? o.leftImageUrl : '',
    };
  }
  return { ...EMPTY_GENERAL_BODY_FORM, ...(raw as GeneralBodyContent) };
}

function teamGeneralBodiesEquals(a: Record<string, GeneralBodyContent>, b: Record<string, GeneralBodyContent>): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length || keysA.some((k, i) => k !== keysB[i])) return false;
  return keysA.every((k) => generalBodyEquals(a[k]!, b[k]!));
}

const SPONSORS_KEYS: (keyof SponsorsContent)[] = ['contactEmail', 'bannerTitle', 'bannerText', 'getInTouchTitle', 'getInTouchParagraph', 'donateLabel', 'donateUrl', 'thonLabel', 'thonUrl', 'guestSpeakerText', 'specialThanksTitle', 'specialThanksParagraph'];
function sponsorsEquals(a: SponsorsContent, b: SponsorsContent): boolean {
  return SPONSORS_KEYS.every((k) => (a[k] ?? '') === (b[k] ?? ''));
}

const DESIGN_TEAM_KEYS: (keyof DesignTeamContent)[] = [
  'sectionTitle',
  'leftImageUrl',
  'pastProjectsTitle',
  'currentProjectsTitle',
  'introParagraph1',
  'introParagraph2',
  'introParagraph3',
  'introLinkUrl',
  'introParagraph4',
  'introFontFamily',
  'introFontWeight',
  'sectionTitleFontFamily',
  'sectionTitleFontWeight',
];
function designTeamEquals(a: DesignTeamContent, b: DesignTeamContent): boolean {
  return DESIGN_TEAM_KEYS.every((k) => (a[k] ?? '') === (b[k] ?? ''));
}

const SiteContent: React.FC<SiteContentProps> = ({ onNavigate, currentUserRole, currentPath = '/admin/site' }) => {
  const [footer, setFooter] = useState<FooterContent>({ ...DEFAULT_FOOTER });
  const [initialFooter, setInitialFooter] = useState<FooterContent>({ ...DEFAULT_FOOTER });
  const [home, setHome] = useState<HomeContent>({ ...DEFAULT_HOME });
  const [initialHome, setInitialHome] = useState<HomeContent>({ ...DEFAULT_HOME });
  const [about, setAbout] = useState<AboutContent>({ ...DEFAULT_ABOUT });
  const [initialAbout, setInitialAbout] = useState<AboutContent>({ ...DEFAULT_ABOUT });
  const [sponsors, setSponsors] = useState<SponsorsContent>({ ...DEFAULT_SPONSORS });
  const [initialSponsors, setInitialSponsors] = useState<SponsorsContent>({ ...DEFAULT_SPONSORS });
  const [generalBody, setGeneralBody] = useState<GeneralBodyContent>({ ...DEFAULT_GENERAL_BODY });
  const [initialGeneralBody, setInitialGeneralBody] = useState<GeneralBodyContent>({ ...DEFAULT_GENERAL_BODY });
  const [aboutDesignTeam, setAboutDesignTeam] = useState<DesignTeamContent>({ ...DEFAULT_DESIGN_TEAM });
  const [initialAboutDesignTeam, setInitialAboutDesignTeam] = useState<DesignTeamContent>({ ...DEFAULT_DESIGN_TEAM });
  const [teamAboutBlocks, setTeamAboutBlocks] = useState<Record<string, GeneralBodyContent>>({});
  const [initialTeamAboutBlocks, setInitialTeamAboutBlocks] = useState<Record<string, GeneralBodyContent>>({});
  const [teamSettings, setTeamSettings] = useState<TeamSettings>(DEFAULT_TEAM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<SiteContentTab>('home');
  /** 'main' | 'generalBody' | team name (non–exec-board teams only) */
  const [aboutSubTab, setAboutSubTab] = useState<string>('main');

  const isPresident = currentUserRole === 'President';
  const hasFooterChanges = !footerEquals(footer, initialFooter);
  const hasHomeChanges = !homeEquals(home, initialHome);
  const hasAboutChanges = !aboutEquals(about, initialAbout);
  const hasGeneralBodyChanges = !generalBodyEquals(generalBody, initialGeneralBody);
  const hasAboutDesignTeamChanges = !designTeamEquals(aboutDesignTeam, initialAboutDesignTeam);
  const hasTeamBlocksChanges = !teamGeneralBodiesEquals(teamAboutBlocks, initialTeamAboutBlocks);
  const hasSponsorsChanges = !sponsorsEquals(sponsors, initialSponsors);

  useEffect(() => {
    return subscribeTeamSettings(setTeamSettings, (e) => console.error('SiteContent teamSettings:', e));
  }, []);

  useEffect(() => {
    const selectable = teamSettings.teamNames.filter((t) => t !== teamSettings.execBoardTeamName);
    if (aboutSubTab !== 'main' && aboutSubTab !== 'generalBody' && !selectable.includes(aboutSubTab)) {
      setAboutSubTab('main');
    }
  }, [JSON.stringify(teamSettings.teamNames), teamSettings.execBoardTeamName, aboutSubTab]);

  useEffect(() => {
    if (!isPresident) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    Promise.all([
      getDoc(doc(db, CONFIG_PATH, FOOTER_DOC)),
      getDoc(doc(db, CONFIG_PATH, HOME_DOC)),
      getDoc(doc(db, CONFIG_PATH, ABOUT_DOC)),
      getDoc(doc(db, CONFIG_PATH, GENERAL_BODY_DOC)),
      getDoc(doc(db, CONFIG_PATH, DESIGN_TEAM_DOC)),
      getDoc(doc(db, CONFIG_PATH, SPONSORS_DOC)),
      getDoc(doc(db, CONFIG_PATH, ABOUT_TEAM_BLOCKS_DOC)),
    ])
      .then(([footerSnap, homeSnap, aboutSnap, gbSnap, designTeamSnap, sponsorsSnap, teamBlocksSnap]) => {
        if (cancelled) return;
        const nextFooter = footerSnap.exists()
          ? { ...DEFAULT_FOOTER, ...(footerSnap.data() as FooterContent) }
          : { ...DEFAULT_FOOTER };
        setFooter(nextFooter);
        setInitialFooter(nextFooter);
        const nextHome = homeSnap.exists()
          ? { ...DEFAULT_HOME, ...(homeSnap.data() as HomeContent) }
          : { ...DEFAULT_HOME };
        setHome(nextHome);
        setInitialHome(nextHome);
        const nextAbout = aboutSnap.exists()
          ? { ...DEFAULT_ABOUT, ...(aboutSnap.data() as AboutContent) }
          : { ...DEFAULT_ABOUT };
        setAbout(nextAbout);
        setInitialAbout(nextAbout);
        const nextGb = gbSnap.exists()
          ? { ...DEFAULT_GENERAL_BODY, ...(gbSnap.data() as GeneralBodyContent) }
          : { ...DEFAULT_GENERAL_BODY };
        setGeneralBody(nextGb);
        setInitialGeneralBody(nextGb);
        const nextDesignTeam = designTeamSnap.exists()
          ? { ...DEFAULT_DESIGN_TEAM, ...(designTeamSnap.data() as DesignTeamContent) }
          : { ...DEFAULT_DESIGN_TEAM };
        setAboutDesignTeam(nextDesignTeam);
        setInitialAboutDesignTeam(nextDesignTeam);
        const rawBlocks = teamBlocksSnap.exists()
          ? ((teamBlocksSnap.data() as AboutTeamBlocksDoc).blocks ?? {})
          : {};
        const mergedBlocks: Record<string, GeneralBodyContent> = {};
        Object.keys(rawBlocks).forEach((k) => {
          mergedBlocks[k] = normalizeTeamBlockFromFirestore(rawBlocks[k]);
        });
        setTeamAboutBlocks(mergedBlocks);
        setInitialTeamAboutBlocks(mergedBlocks);
        const nextSponsors = sponsorsSnap.exists()
          ? { ...DEFAULT_SPONSORS, ...(sponsorsSnap.data() as SponsorsContent) }
          : { ...DEFAULT_SPONSORS };
        setSponsors(nextSponsors);
        setInitialSponsors(nextSponsors);
      })
      .catch((e) => {
        if (!cancelled) console.error('SiteContent load error:', e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isPresident]);

  const handleFooterChange = (field: keyof FooterContent, value: string) => {
    setFooter((prev) => ({ ...prev, [field]: value }));
  };

  const handleHomeChange = (field: keyof HomeContent, value: string) => {
    setHome((prev) => ({ ...prev, [field]: value }));
  };

  const handleAboutChange = (field: keyof AboutContent, value: string) => {
    setAbout((prev) => ({ ...prev, [field]: value }));
  };

  const handleSponsorsChange = (field: keyof SponsorsContent, value: string) => {
    setSponsors((prev) => ({ ...prev, [field]: value }));
  };

  const activeTeamTab =
    aboutSubTab !== 'main' && aboutSubTab !== 'generalBody' ? aboutSubTab : null;

  const updateTeamGeneralBody = (field: keyof GeneralBodyContent, value: string) => {
    if (!activeTeamTab) return;
    setTeamAboutBlocks((prev) => ({
      ...prev,
      [activeTeamTab]: { ...EMPTY_GENERAL_BODY_FORM, ...prev[activeTeamTab], [field]: value },
    }));
  };

  const setTeamActivitiesListFromText = (text: string) => {
    if (!activeTeamTab) return;
    const list = text.split('\n').map((s) => s.trim()).filter(Boolean);
    setTeamAboutBlocks((prev) => ({
      ...prev,
      [activeTeamTab]: { ...EMPTY_GENERAL_BODY_FORM, ...prev[activeTeamTab], activitiesList: list },
    }));
  };

  const setTeamPastEventsListFromText = (text: string) => {
    if (!activeTeamTab) return;
    const list = text.split('\n').map((s) => s.trim()).filter(Boolean);
    setTeamAboutBlocks((prev) => ({
      ...prev,
      [activeTeamTab]: { ...EMPTY_GENERAL_BODY_FORM, ...prev[activeTeamTab], pastEventsList: list },
    }));
  };

  const saveFooter = async () => {
    if (!isPresident || saving || !hasFooterChanges) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      await setDoc(doc(db, CONFIG_PATH, FOOTER_DOC), footer);
      setInitialFooter(footer);
      setSavedMessage('Footer saved.');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save footer:', e);
    } finally {
      setSaving(false);
    }
  };

  const saveHome = async () => {
    if (!isPresident || saving || !hasHomeChanges) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      await setDoc(doc(db, CONFIG_PATH, HOME_DOC), home);
      setInitialHome(home);
      setSavedMessage('Home saved.');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save home:', e);
    } finally {
      setSaving(false);
    }
  };

  const saveAbout = async () => {
    if (!isPresident || saving || !hasAboutChanges) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      await setDoc(doc(db, CONFIG_PATH, ABOUT_DOC), about);
      setInitialAbout(about);
      setSavedMessage('Main About saved.');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save about:', e);
    } finally {
      setSaving(false);
    }
  };

  const saveGeneralBody = async () => {
    if (!isPresident || saving || !hasGeneralBodyChanges) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      await setDoc(doc(db, CONFIG_PATH, GENERAL_BODY_DOC), generalBody);
      setInitialGeneralBody(generalBody);
      setSavedMessage('General Body saved.');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save general body:', e);
    } finally {
      setSaving(false);
    }
  };

  const saveAboutDesignTeam = async () => {
    if (!isPresident || saving || !hasAboutDesignTeamChanges) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      await setDoc(doc(db, CONFIG_PATH, DESIGN_TEAM_DOC), aboutDesignTeam);
      setInitialAboutDesignTeam(aboutDesignTeam);
      setSavedMessage('Design Team page saved.');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save Design Team page:', e);
    } finally {
      setSaving(false);
    }
  };

  const saveTeamBlocks = async () => {
    if (!isPresident || saving || !hasTeamBlocksChanges) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      const refBlocks = doc(db, CONFIG_PATH, ABOUT_TEAM_BLOCKS_DOC);
      const snap = await getDoc(refBlocks);
      const existing = snap.exists() ? ((snap.data() as AboutTeamBlocksDoc).blocks ?? {}) : {};
      const merged = { ...existing, ...teamAboutBlocks };
      await setDoc(refBlocks, { blocks: merged }, { merge: true });
      setTeamAboutBlocks(merged);
      setInitialTeamAboutBlocks(merged);
      setSavedMessage('Team sections saved.');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save team sections:', e);
    } finally {
      setSaving(false);
    }
  };

  const setActivitiesListFromText = (text: string) => {
    const list = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
    setGeneralBody((prev) => ({ ...prev, activitiesList: list }));
  };

  const setPastEventsListFromText = (text: string) => {
    const list = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
    setGeneralBody((prev) => ({ ...prev, pastEventsList: list }));
  };

  const saveSponsors = async () => {
    if (!isPresident || saving || !hasSponsorsChanges) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      await setDoc(doc(db, CONFIG_PATH, SPONSORS_DOC), sponsors);
      setInitialSponsors(sponsors);
      setSavedMessage('Sponsors saved.');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save sponsors:', e);
    } finally {
      setSaving(false);
    }
  };

  const saveAllDirty = async () => {
    if (hasFooterChanges) await saveFooter();
    if (hasHomeChanges) await saveHome();
    if (hasAboutChanges) await saveAbout();
    if (hasGeneralBodyChanges) await saveGeneralBody();
    if (hasAboutDesignTeamChanges) await saveAboutDesignTeam();
    if (hasTeamBlocksChanges) await saveTeamBlocks();
    if (hasSponsorsChanges) await saveSponsors();
  };

  const dirty =
    hasFooterChanges ||
    hasHomeChanges ||
    hasAboutChanges ||
    hasGeneralBodyChanges ||
    hasAboutDesignTeamChanges ||
    hasTeamBlocksChanges ||
    hasSponsorsChanges;

  const editingTeamGeneralBody: GeneralBodyContent = useMemo(
    () => ({
      ...EMPTY_GENERAL_BODY_FORM,
      ...(activeTeamTab ? teamAboutBlocks[activeTeamTab] : {}),
    }),
    [activeTeamTab, teamAboutBlocks]
  );

  const { safeNavigate, leaveConfirmModal } = useUnsavedChangesGuard({
    currentPath,
    dirty,
    onNavigate,
    onSave: saveAllDirty,
  });

  if (!isPresident) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
        <div className="max-w-7xl mx-auto min-w-0">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Site Content</h1>
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base shrink-0"
            >
              ← Back to Dashboard
            </button>
          </div>
          <p className="text-gray-600">Only the President can edit site content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Site Content</h1>
          <button
            type="button"
            onClick={() => safeNavigate('/admin')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base shrink-0"
          >
            ← Back to Dashboard
          </button>
        </div>
        {leaveConfirmModal}

        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setTab('home')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'home' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setTab('about')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'about' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            About
          </button>
          <button
            type="button"
            onClick={() => setTab('sponsors')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'sponsors' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Sponsors
          </button>
          <button
            type="button"
            onClick={() => setTab('footer')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'footer' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Footer
          </button>
        </div>

        <>
        {tab === 'footer' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Footer</h2>
          <p className="text-gray-600 text-sm mb-4">
            Edit contact info, mission statement, address, and social links shown in the site footer.
          </p>

          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={footer.phone ?? ''}
                  onChange={(e) => handleFooterChange('phone', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                  placeholder="e.g. 484-268-3741"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email 1</label>
                <input
                  type="email"
                  value={footer.email1 ?? ''}
                  onChange={(e) => handleFooterChange('email1', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email 2</label>
                <input
                  type="email"
                  value={footer.email2 ?? ''}
                  onChange={(e) => handleFooterChange('email2', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mission statement (center text)</label>
                <RichTextEditor
                  value={footer.missionStatement ?? ''}
                  onChange={(v) => handleFooterChange('missionStatement', v)}
                  minHeight="80px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address line 1</label>
                <input
                  type="text"
                  value={footer.addressLine1 ?? ''}
                  onChange={(e) => handleFooterChange('addressLine1', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                  placeholder="e.g. 125 Hammond"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address line 2</label>
                <input
                  type="text"
                  value={footer.addressLine2 ?? ''}
                  onChange={(e) => handleFooterChange('addressLine2', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                  placeholder="e.g. University Park, PA 16802"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={footer.instagramUrl ?? ''}
                  onChange={(e) => handleFooterChange('instagramUrl', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GroupMe URL</label>
                <input
                  type="url"
                  value={footer.groupmeUrl ?? ''}
                  onChange={(e) => handleFooterChange('groupmeUrl', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slack URL</label>
                <input
                  type="url"
                  value={footer.slackUrl ?? ''}
                  onChange={(e) => handleFooterChange('slackUrl', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving || !hasFooterChanges}
                  onClick={saveFooter}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
                >
                  {saving ? 'Saving...' : 'Save Footer'}
                </button>
                {savedMessage === 'Footer saved.' && <span className="text-green-600 font-medium">Saved.</span>}
              </div>
            </div>
          )}
        </div>
        )}

        {tab === 'home' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Home</h2>
          <p className="text-gray-600 text-sm mb-4">
            Edit hero text, next meeting title, and &quot;What we do&quot; section on the home page.
          </p>

          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hero line 1</label>
                <RichTextEditor
                  value={home.heroLine1 ?? ''}
                  onChange={(v) => handleHomeChange('heroLine1', v)}
                  minHeight="60px"
                  placeholder="e.g. WE ARE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hero line 2</label>
                <RichTextEditor
                  value={home.heroLine2 ?? ''}
                  onChange={(v) => handleHomeChange('heroLine2', v)}
                  minHeight="60px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hero line 3</label>
                <RichTextEditor
                  value={home.heroLine3 ?? ''}
                  onChange={(v) => handleHomeChange('heroLine3', v)}
                  minHeight="60px"
                  placeholder="e.g. @ PENN STATE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Meeting section title</label>
                <RichTextEditor
                  value={home.nextMeetingTitle ?? ''}
                  onChange={(v) => handleHomeChange('nextMeetingTitle', v)}
                  minHeight="60px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What we do — title</label>
                <RichTextEditor
                  value={home.whatWeDoTitle ?? ''}
                  onChange={(v) => handleHomeChange('whatWeDoTitle', v)}
                  minHeight="60px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What we do — paragraph 1</label>
                <RichTextEditor
                  value={home.whatWeDoParagraph1 ?? ''}
                  onChange={(v) => handleHomeChange('whatWeDoParagraph1', v)}
                  minHeight="100px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What we do — paragraph 2</label>
                <RichTextEditor
                  value={home.whatWeDoParagraph2 ?? ''}
                  onChange={(v) => handleHomeChange('whatWeDoParagraph2', v)}
                  minHeight="80px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What we do — button text</label>
                <input
                  type="text"
                  value={home.whatWeDoButtonText ?? ''}
                  onChange={(e) => handleHomeChange('whatWeDoButtonText', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What we do — button URL (optional)</label>
                <input
                  type="url"
                  value={home.whatWeDoButtonUrl ?? ''}
                  onChange={(e) => handleHomeChange('whatWeDoButtonUrl', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                  placeholder="Leave empty to hide link"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving || !hasHomeChanges}
                  onClick={saveHome}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
                >
                  {saving ? 'Saving...' : 'Save Home'}
                </button>
                {savedMessage === 'Home saved.' && <span className="text-green-600 font-medium">Saved.</span>}
              </div>
            </div>
          )}
        </div>
        )}

        {tab === 'about' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-wrap gap-x-1 border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => setAboutSubTab('main')}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                aboutSubTab === 'main' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Main About
            </button>
            <button
              type="button"
              onClick={() => setAboutSubTab('generalBody')}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                aboutSubTab === 'generalBody' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              General Body
            </button>
            {teamSettings.teamNames
              .filter((t) => t !== teamSettings.execBoardTeamName)
              .map((teamName) => (
                <button
                  key={teamName}
                  type="button"
                  onClick={() => setAboutSubTab(teamName)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition max-w-[12rem] truncate ${
                    aboutSubTab === teamName ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  title={teamName}
                >
                  {teamName}
                </button>
              ))}
          </div>

          {aboutSubTab === 'main' && (
            <>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Main About</h2>
              <p className="text-gray-600 text-sm mb-4">
                Content for the main About page (/about): hero image, about title, paragraphs, link URL, and paragraph font options.
              </p>
              {loading ? (
                <div className="text-gray-500">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 gap-8 items-start max-w-[100rem] xl:grid-cols-[minmax(0,1fr)_560px]">
                  <div className="space-y-4 min-w-0 max-w-4xl">
                  <AboutSiteImageField
                    label="Hero image (main About)"
                    description="Shown on /about — live preview uses a 344×259px hero frame (same weight as the public page)."
                    value={about.heroImageUrl ?? ''}
                    onChange={(v) => handleAboutChange('heroImageUrl', v)}
                    preview="main-hero"
                    folder="/site/about/main"
                    showLayoutPreview={false}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">About title</label>
                    <RichTextEditor value={about.aboutTitle ?? ''} onChange={(v) => handleAboutChange('aboutTitle', v)} minHeight="60px" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 1</label>
                    <RichTextEditor value={about.aboutParagraph1 ?? ''} onChange={(v) => handleAboutChange('aboutParagraph1', v)} placeholder="First paragraph" minHeight="100px" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 2 (add links via the toolbar link button)</label>
                    <RichTextEditor value={about.aboutParagraph2 ?? ''} onChange={(v) => handleAboutChange('aboutParagraph2', v)} placeholder="Second paragraph" minHeight="120px" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                    <input type="url" value={about.aboutLinkUrl ?? ''} onChange={(e) => handleAboutChange('aboutLinkUrl', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800" />
                  </div>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Font (Main About paragraph)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font family</label>
                        <select value={about.paragraphFontFamily ?? ''} onChange={(e) => handleAboutChange('paragraphFontFamily', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800">
                          <option value="">Default (Jost)</option>
                          <option value="Jost, sans-serif">Jost</option>
                          <option value="Inter, sans-serif">Inter</option>
                          <option value="Georgia, serif">Georgia</option>
                          <option value="Arial, sans-serif">Arial</option>
                          <option value="system-ui, sans-serif">system-ui</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font weight</label>
                        <select value={about.paragraphFontWeight ?? ''} onChange={(e) => handleAboutChange('paragraphFontWeight', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800">
                          <option value="">Default</option>
                          <option value="300">Light (300)</option>
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semi-bold (600)</option>
                          <option value="700">Bold (700)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" disabled={saving || !hasAboutChanges} onClick={saveAbout} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium">
                      {saving ? 'Saving...' : 'Save Main About'}
                    </button>
                    {savedMessage === 'Main About saved.' && <span className="text-green-600 font-medium">Saved.</span>}
                  </div>
                  </div>
                  <div className="sticky top-4 self-start min-w-0 xl:min-w-[560px]">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Live layout (updates as you type)</p>
                    <AboutSiteLayoutPreview
                      compact
                      preview="main-hero"
                      previewSrc={about.heroImageUrl?.trim() || ABOUT_SITE_IMAGE_PLACEHOLDER}
                      context={{
                        mainAbout: {
                          aboutTitle: about.aboutTitle,
                          aboutParagraph1: about.aboutParagraph1,
                          aboutParagraph2: about.aboutParagraph2,
                          aboutLinkUrl: about.aboutLinkUrl,
                          paragraphFontFamily: about.paragraphFontFamily,
                          paragraphFontWeight: about.paragraphFontWeight,
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {aboutSubTab === 'generalBody' && (
            <>
              <h2 className="text-lg font-bold text-gray-800 mb-4">General Body</h2>
              <p className="text-gray-600 text-sm mb-4">Content for the General Body page (/about/generalbody): activities list, image, and past events.</p>
              {loading ? (
                <div className="text-gray-500">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 gap-8 items-start max-w-[100rem] xl:grid-cols-[minmax(0,1fr)_560px]">
                  <div className="space-y-4 min-w-0 max-w-5xl">
                  <AboutSiteImageField
                    label="Team image (General Body / Executive Board)"
                    description="Used on the General Body team page and on the main About “Our Teams” tile for the Executive Board team."
                    value={generalBody.leftImageUrl ?? ''}
                    onChange={(v) => setGeneralBody((p) => ({ ...p, leftImageUrl: v }))}
                    preview="dual-column-and-tile"
                    folder="/site/about/general-body"
                    showLayoutPreview={false}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activities section title</label>
                    <RichTextEditor value={generalBody.activitiesTitle ?? ''} onChange={(v) => setGeneralBody((p) => ({ ...p, activitiesTitle: v }))} minHeight="60px" placeholder="Our Activities" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activities list (one per line)</label>
                    <textarea rows={6} value={(generalBody.activitiesList ?? []).join('\n')} onChange={(e) => setActivitiesListFromText(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800" placeholder="THON Fundraisers&#10;Design Team Meetings&#10;..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body section title (below activities)</label>
                    <RichTextEditor value={generalBody.bodySectionTitle ?? ''} onChange={(v) => setGeneralBody((p) => ({ ...p, bodySectionTitle: v }))} minHeight="60px" placeholder="Our General Body" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Past Events section title</label>
                    <RichTextEditor value={generalBody.pastEventsTitle ?? ''} onChange={(v) => setGeneralBody((p) => ({ ...p, pastEventsTitle: v }))} minHeight="60px" placeholder="Past Events" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Past events list (one per line)</label>
                    <textarea rows={4} value={(generalBody.pastEventsList ?? []).join('\n')} onChange={(e) => setPastEventsListFromText(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800" placeholder="Event 1 - Date&#10;Event 2 - Date" />
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" disabled={saving || !hasGeneralBodyChanges} onClick={saveGeneralBody} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium">
                      {saving ? 'Saving...' : 'Save General Body'}
                    </button>
                    {savedMessage === 'General Body saved.' && <span className="text-green-600 font-medium">Saved.</span>}
                  </div>
                  </div>
                  <div className="sticky top-4 self-start min-w-0 xl:min-w-[560px]">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Live layout (updates as you type)</p>
                    <AboutSiteLayoutPreview
                      compact
                      preview="dual-column-and-tile"
                      previewSrc={generalBody.leftImageUrl?.trim() || ABOUT_SITE_IMAGE_PLACEHOLDER}
                      context={{
                        generalBody,
                        mainAbout: {
                          aboutTitle: about.aboutTitle,
                          aboutParagraph1: about.aboutParagraph1,
                          aboutParagraph2: about.aboutParagraph2,
                          aboutLinkUrl: about.aboutLinkUrl,
                        },
                        teamNameLabel: teamSettings.execBoardTeamName,
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {activeTeamTab && (
            <>
              <h2 className="text-lg font-bold text-gray-800 mb-4">{activeTeamTab}</h2>
              {loading ? (
                <div className="text-gray-500">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 gap-8 items-start max-w-[100rem] xl:grid-cols-[minmax(0,1fr)_560px]">
                  <div className="space-y-4 min-w-0 max-w-5xl">
                  {activeTeamTab === teamSettings.designTeamTeamName && (
                    <>
                      <p className="text-gray-600 text-sm mb-4">
                        Content for the Design Team page (/about/designteam): image, section title, intro paragraphs and fonts, link URL, and project section titles.
                      </p>
                      <AboutSiteImageField
                        label="Design Team page image (/about/designteam)"
                        description="Left column photo on the Design Team page only (not the Our Teams tile — that uses the team block below)."
                        value={aboutDesignTeam.leftImageUrl ?? ''}
                        onChange={(v) => setAboutDesignTeam((p) => ({ ...p, leftImageUrl: v }))}
                        preview="two-col-left"
                        folder="/site/about/design-team"
                        showLayoutPreview={false}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Section title (intro block)</label>
                        <RichTextEditor
                          value={aboutDesignTeam.sectionTitle ?? ''}
                          onChange={(v) => setAboutDesignTeam((p) => ({ ...p, sectionTitle: v }))}
                          minHeight="60px"
                          placeholder="Our Design Team"
                        />
                      </div>
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Intro font (family &amp; weight)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph font family</label>
                            <select
                              value={aboutDesignTeam.introFontFamily ?? ''}
                              onChange={(e) => setAboutDesignTeam((p) => ({ ...p, introFontFamily: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                            >
                              <option value="">Default (Jost)</option>
                              <option value="Jost, sans-serif">Jost</option>
                              <option value="Inter, sans-serif">Inter</option>
                              <option value="Georgia, serif">Georgia</option>
                              <option value="Arial, sans-serif">Arial</option>
                              <option value="system-ui, sans-serif">system-ui</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph font weight</label>
                            <select
                              value={aboutDesignTeam.introFontWeight ?? ''}
                              onChange={(e) => setAboutDesignTeam((p) => ({ ...p, introFontWeight: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                            >
                              <option value="">Default</option>
                              <option value="300">Light (300)</option>
                              <option value="400">Normal (400)</option>
                              <option value="500">Medium (500)</option>
                              <option value="600">Semi-bold (600)</option>
                              <option value="700">Bold (700)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Section title font family</label>
                            <select
                              value={aboutDesignTeam.sectionTitleFontFamily ?? ''}
                              onChange={(e) => setAboutDesignTeam((p) => ({ ...p, sectionTitleFontFamily: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                            >
                              <option value="">Default (Jost)</option>
                              <option value="Jost, sans-serif">Jost</option>
                              <option value="Inter, sans-serif">Inter</option>
                              <option value="Georgia, serif">Georgia</option>
                              <option value="Arial, sans-serif">Arial</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Section title font weight</label>
                            <select
                              value={aboutDesignTeam.sectionTitleFontWeight ?? ''}
                              onChange={(e) => setAboutDesignTeam((p) => ({ ...p, sectionTitleFontWeight: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                            >
                              <option value="">Default</option>
                              <option value="400">Normal (400)</option>
                              <option value="500">Medium (500)</option>
                              <option value="600">Semi-bold (600)</option>
                              <option value="700">Bold (700)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Intro paragraphs</h3>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 1</label>
                          <RichTextEditor
                            value={aboutDesignTeam.introParagraph1 ?? ''}
                            onChange={(v) => setAboutDesignTeam((p) => ({ ...p, introParagraph1: v }))}
                            placeholder="First paragraph"
                            minHeight="80px"
                          />
                        </div>
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 2</label>
                          <RichTextEditor
                            value={aboutDesignTeam.introParagraph2 ?? ''}
                            onChange={(v) => setAboutDesignTeam((p) => ({ ...p, introParagraph2: v }))}
                            placeholder="Second paragraph"
                            minHeight="100px"
                          />
                        </div>
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 3 (use toolbar link button for links)</label>
                          <RichTextEditor
                            value={aboutDesignTeam.introParagraph3 ?? ''}
                            onChange={(v) => setAboutDesignTeam((p) => ({ ...p, introParagraph3: v }))}
                            placeholder="To learn more about the international ASME organization, visit this link."
                            minHeight="60px"
                          />
                        </div>
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 3 link URL (when using plain text only)</label>
                          <input
                            type="url"
                            value={aboutDesignTeam.introLinkUrl ?? ''}
                            onChange={(e) => setAboutDesignTeam((p) => ({ ...p, introLinkUrl: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                            placeholder="https://www.asme.org"
                          />
                        </div>
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 4</label>
                          <RichTextEditor
                            value={aboutDesignTeam.introParagraph4 ?? ''}
                            onChange={(v) => setAboutDesignTeam((p) => ({ ...p, introParagraph4: v }))}
                            placeholder="WE ARE! the Penn State's chapter of ASME..."
                            minHeight="100px"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Past Projects dropdown title</label>
                        <RichTextEditor
                          value={aboutDesignTeam.pastProjectsTitle ?? ''}
                          onChange={(v) => setAboutDesignTeam((p) => ({ ...p, pastProjectsTitle: v }))}
                          minHeight="60px"
                          placeholder="Past Projects"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current projects section title</label>
                        <RichTextEditor
                          value={aboutDesignTeam.currentProjectsTitle ?? ''}
                          onChange={(v) => setAboutDesignTeam((p) => ({ ...p, currentProjectsTitle: v }))}
                          minHeight="60px"
                          placeholder="Fall 2025 Projects"
                        />
                      </div>
                      <div className="flex items-center gap-3 pb-6 border-b border-gray-200">
                        <button
                          type="button"
                          disabled={saving || !hasAboutDesignTeamChanges}
                          onClick={saveAboutDesignTeam}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
                        >
                          {saving ? 'Saving...' : 'Save Design Team page'}
                        </button>
                        {savedMessage === 'Design Team page saved.' && <span className="text-green-600 font-medium">Saved.</span>}
                      </div>

                      <h3 className="text-base font-semibold text-gray-800 pt-2">Team board (same layout as other teams)</h3>
                      <p className="text-gray-600 text-sm mb-4">
                        Content for the team board ({teamAboutPath(activeTeamTab)}): activities list, image, and past events.
                      </p>
                    </>
                  )}

                  {activeTeamTab !== teamSettings.designTeamTeamName && (
                    <p className="text-gray-600 text-sm mb-4">
                      Content for the {activeTeamTab} page ({teamAboutPath(activeTeamTab)}): activities list, image, and past events.
                    </p>
                  )}

                  <AboutSiteImageField
                    label={`Team image (${activeTeamTab})`}
                    description="Shown on this team’s page (left column) and on the main About “Our Teams” tile."
                    value={editingTeamGeneralBody.leftImageUrl ?? ''}
                    onChange={(v) => updateTeamGeneralBody('leftImageUrl', v)}
                    preview="dual-column-and-tile"
                    folder={`/site/about/team-blocks`}
                    showLayoutPreview={false}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activities section title</label>
                    <RichTextEditor value={editingTeamGeneralBody.activitiesTitle ?? ''} onChange={(v) => updateTeamGeneralBody('activitiesTitle', v)} minHeight="60px" placeholder="Our Activities" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activities list (one per line)</label>
                    <textarea rows={6} value={(editingTeamGeneralBody.activitiesList ?? []).join('\n')} onChange={(e) => setTeamActivitiesListFromText(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800" placeholder="THON Fundraisers&#10;Design Team Meetings&#10;..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body section title (below activities)</label>
                    <RichTextEditor value={editingTeamGeneralBody.bodySectionTitle ?? ''} onChange={(v) => updateTeamGeneralBody('bodySectionTitle', v)} minHeight="60px" placeholder="Our team" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Past Events section title</label>
                    <RichTextEditor value={editingTeamGeneralBody.pastEventsTitle ?? ''} onChange={(v) => updateTeamGeneralBody('pastEventsTitle', v)} minHeight="60px" placeholder="Past Events" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Past events list (one per line)</label>
                    <textarea rows={4} value={(editingTeamGeneralBody.pastEventsList ?? []).join('\n')} onChange={(e) => setTeamPastEventsListFromText(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800" placeholder="Event 1 - Date&#10;Event 2 - Date" />
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" disabled={saving || !hasTeamBlocksChanges} onClick={saveTeamBlocks} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium">
                      {saving ? 'Saving...' : 'Save team sections'}
                    </button>
                    {savedMessage === 'Team sections saved.' && <span className="text-green-600 font-medium">Saved.</span>}
                  </div>
                  </div>
                  <div className="sticky top-4 self-start min-w-0 xl:min-w-[560px]">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Live layout (updates as you type)</p>
                    {activeTeamTab === teamSettings.designTeamTeamName ? (
                      <div className="space-y-8">
                        <AboutSiteLayoutPreview
                          compact
                          preview="two-col-left"
                          previewSrc={aboutDesignTeam.leftImageUrl?.trim() || ABOUT_SITE_IMAGE_PLACEHOLDER}
                          context={{
                            designTeam: aboutDesignTeam,
                            mainAbout: {
                              aboutTitle: about.aboutTitle,
                              aboutParagraph1: about.aboutParagraph1,
                              aboutParagraph2: about.aboutParagraph2,
                              aboutLinkUrl: about.aboutLinkUrl,
                            },
                          }}
                        />
                        <AboutSiteLayoutPreview
                          compact
                          preview="dual-column-and-tile"
                          previewSrc={editingTeamGeneralBody.leftImageUrl?.trim() || ABOUT_SITE_IMAGE_PLACEHOLDER}
                          context={{
                            generalBody: editingTeamGeneralBody,
                            mainAbout: {
                              aboutTitle: about.aboutTitle,
                              aboutParagraph1: about.aboutParagraph1,
                              aboutParagraph2: about.aboutParagraph2,
                              aboutLinkUrl: about.aboutLinkUrl,
                            },
                            teamNameLabel: activeTeamTab,
                          }}
                        />
                      </div>
                    ) : (
                      <AboutSiteLayoutPreview
                        compact
                        preview="dual-column-and-tile"
                        previewSrc={editingTeamGeneralBody.leftImageUrl?.trim() || ABOUT_SITE_IMAGE_PLACEHOLDER}
                        context={{
                          generalBody: editingTeamGeneralBody,
                          mainAbout: {
                            aboutTitle: about.aboutTitle,
                            aboutParagraph1: about.aboutParagraph1,
                            aboutParagraph2: about.aboutParagraph2,
                            aboutLinkUrl: about.aboutLinkUrl,
                          },
                          teamNameLabel: activeTeamTab,
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        )}

        {tab === 'sponsors' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Sponsors</h2>
          <p className="text-gray-600 text-sm mb-4">
            Edit banner, Get in Touch, buttons, and Special Thanks on the Sponsors page. Use <code className="bg-gray-100 px-1">{"{{email}}"}</code> in text to show the contact email.
          </p>

          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact email</label>
                <input
                  type="email"
                  value={sponsors.contactEmail ?? ''}
                  onChange={(e) => handleSponsorsChange('contactEmail', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner title</label>
                <RichTextEditor
                  value={sponsors.bannerTitle ?? ''}
                  onChange={(v) => handleSponsorsChange('bannerTitle', v)}
                  minHeight="60px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner text (use {"{{email}}"})</label>
                <RichTextEditor
                  value={sponsors.bannerText ?? ''}
                  onChange={(v) => handleSponsorsChange('bannerText', v)}
                  minHeight="80px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Get in Touch — title</label>
                <RichTextEditor
                  value={sponsors.getInTouchTitle ?? ''}
                  onChange={(v) => handleSponsorsChange('getInTouchTitle', v)}
                  minHeight="60px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Get in Touch — paragraph</label>
                <RichTextEditor
                  value={sponsors.getInTouchParagraph ?? ''}
                  onChange={(v) => handleSponsorsChange('getInTouchParagraph', v)}
                  minHeight="80px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Donate button label</label>
                <input
                  type="text"
                  value={sponsors.donateLabel ?? ''}
                  onChange={(e) => handleSponsorsChange('donateLabel', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Donate button URL</label>
                <input
                  type="url"
                  value={sponsors.donateUrl ?? ''}
                  onChange={(e) => handleSponsorsChange('donateUrl', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">THON button label</label>
                <input
                  type="text"
                  value={sponsors.thonLabel ?? ''}
                  onChange={(e) => handleSponsorsChange('thonLabel', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">THON button URL</label>
                <input
                  type="url"
                  value={sponsors.thonUrl ?? ''}
                  onChange={(e) => handleSponsorsChange('thonUrl', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guest speaker text (use {"{{email}}"})</label>
                <RichTextEditor
                  value={sponsors.guestSpeakerText ?? ''}
                  onChange={(v) => handleSponsorsChange('guestSpeakerText', v)}
                  minHeight="80px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Thanks — title</label>
                <RichTextEditor
                  value={sponsors.specialThanksTitle ?? ''}
                  onChange={(v) => handleSponsorsChange('specialThanksTitle', v)}
                  minHeight="60px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Thanks — paragraph</label>
                <RichTextEditor
                  value={sponsors.specialThanksParagraph ?? ''}
                  onChange={(v) => handleSponsorsChange('specialThanksParagraph', v)}
                  minHeight="120px"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving || !hasSponsorsChanges}
                  onClick={saveSponsors}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
                >
                  {saving ? 'Saving...' : 'Save Sponsors'}
                </button>
                {savedMessage === 'Sponsors saved.' && <span className="text-green-600 font-medium">Saved.</span>}
              </div>
            </div>
          )}
        </div>
        )}
        </>
      </div>
    </div>
  );
};

export default SiteContent;
