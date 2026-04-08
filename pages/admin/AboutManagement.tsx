import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import type { AboutContent, GeneralBodyContent, DesignTeamContent } from '../../src/types';
import { DEFAULT_ABOUT, DEFAULT_GENERAL_BODY, DEFAULT_DESIGN_TEAM } from '../../src/types';
import RichTextEditor from '../../src/components/RichTextEditor';
import AboutSiteImageField, {
  AboutSiteLayoutPreview,
  ABOUT_SITE_IMAGE_PLACEHOLDER,
} from '../../src/components/AboutSiteImageField';
import { DEFAULT_TEAM_SETTINGS } from '../../src/firebase/teamSettings';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';

const CONFIG_PATH = 'config';
const ABOUT_DOC = 'about';
const GENERAL_BODY_DOC = 'aboutGeneralBody';
const DESIGN_TEAM_DOC = 'aboutDesignTeam';

type AboutTab = 'main' | 'generalBody' | 'designTeam';

interface AboutManagementProps {
  onNavigate: (path: string) => void;
  currentUserRole: string;
  currentPath?: string;
}

function aboutEquals(a: AboutContent, b: AboutContent): boolean {
  const keys: (keyof AboutContent)[] = [
    'aboutTitle',
    'heroImageUrl',
    'aboutParagraph1',
    'aboutParagraph2',
    'aboutLinkUrl',
    'paragraphFontFamily',
    'paragraphFontWeight',
  ];
  return keys.every((k) => (a[k] ?? '') === (b[k] ?? ''));
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

function designTeamEquals(a: DesignTeamContent, b: DesignTeamContent): boolean {
  const keys: (keyof DesignTeamContent)[] = ['sectionTitle', 'leftImageUrl', 'pastProjectsTitle', 'currentProjectsTitle', 'introParagraph1', 'introParagraph2', 'introParagraph3', 'introLinkUrl', 'introParagraph4', 'introFontFamily', 'introFontWeight', 'sectionTitleFontFamily', 'sectionTitleFontWeight'];
  return keys.every((k) => (a[k] ?? '') === (b[k] ?? ''));
}

const AboutManagement: React.FC<AboutManagementProps> = ({ onNavigate, currentUserRole, currentPath = '/admin/about' }) => {
  const [about, setAbout] = useState<AboutContent>({ ...DEFAULT_ABOUT });
  const [initialAbout, setInitialAbout] = useState<AboutContent>({ ...DEFAULT_ABOUT });
  const [generalBody, setGeneralBody] = useState<GeneralBodyContent>({ ...DEFAULT_GENERAL_BODY });
  const [initialGeneralBody, setInitialGeneralBody] = useState<GeneralBodyContent>({ ...DEFAULT_GENERAL_BODY });
  const [designTeam, setDesignTeam] = useState<DesignTeamContent>({ ...DEFAULT_DESIGN_TEAM });
  const [initialDesignTeam, setInitialDesignTeam] = useState<DesignTeamContent>({ ...DEFAULT_DESIGN_TEAM });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<AboutTab>('main');

  const isPresident = currentUserRole === 'President';
  const hasAboutChanges = !aboutEquals(about, initialAbout);
  const hasGeneralBodyChanges = !generalBodyEquals(generalBody, initialGeneralBody);
  const hasDesignTeamChanges = !designTeamEquals(designTeam, initialDesignTeam);

  useEffect(() => {
    if (!isPresident) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      getDoc(doc(db, CONFIG_PATH, ABOUT_DOC)),
      getDoc(doc(db, CONFIG_PATH, GENERAL_BODY_DOC)),
      getDoc(doc(db, CONFIG_PATH, DESIGN_TEAM_DOC)),
    ])
      .then(([aboutSnap, gbSnap, dtSnap]) => {
        if (cancelled) return;
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
        const nextDt = dtSnap.exists()
          ? { ...DEFAULT_DESIGN_TEAM, ...(dtSnap.data() as DesignTeamContent) }
          : { ...DEFAULT_DESIGN_TEAM };
        setDesignTeam(nextDt);
        setInitialDesignTeam(nextDt);
      })
      .catch((e) => {
        if (!cancelled) console.error('AboutManagement load error:', e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isPresident]);

  const handleAboutChange = (field: keyof AboutContent, value: string) => {
    setAbout((prev) => ({ ...prev, [field]: value }));
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

  const saveDesignTeam = async () => {
    if (!isPresident || saving || !hasDesignTeamChanges) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      await setDoc(doc(db, CONFIG_PATH, DESIGN_TEAM_DOC), designTeam);
      setInitialDesignTeam(designTeam);
      setSavedMessage('Design Team saved.');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save design team:', e);
    } finally {
      setSaving(false);
    }
  };

  const saveAllDirty = async () => {
    if (hasAboutChanges) await saveAbout();
    if (hasGeneralBodyChanges) await saveGeneralBody();
    if (hasDesignTeamChanges) await saveDesignTeam();
  };

  const dirty = hasAboutChanges || hasGeneralBodyChanges || hasDesignTeamChanges;
  const { safeNavigate, leaveConfirmModal } = useUnsavedChangesGuard({
    currentPath,
    dirty,
    onNavigate,
    onSave: saveAllDirty,
  });

  const setActivitiesListFromText = (text: string) => {
    const list = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
    setGeneralBody((prev) => ({ ...prev, activitiesList: list }));
  };

  const setPastEventsListFromText = (text: string) => {
    const list = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
    setGeneralBody((prev) => ({ ...prev, pastEventsList: list }));
  };

  if (!isPresident) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Only President can manage About content.</p>
          <button
            type="button"
            onClick={() => safeNavigate('/admin')}
            className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">About Management</h1>
          <button
            type="button"
            onClick={() => safeNavigate('/admin')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
        {leaveConfirmModal}
        <p className="text-gray-600 text-sm mb-6">
          Edit content for the main About page, General Body, and Design Team sections. Changes appear on the public About pages.
        </p>

        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setTab('main')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'main' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Main About
          </button>
          <button
            type="button"
            onClick={() => setTab('generalBody')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'generalBody' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            General Body
          </button>
          <button
            type="button"
            onClick={() => setTab('designTeam')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === 'designTeam' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Design Team
          </button>
        </div>

        {tab === 'main' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
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
                  description="Live preview uses a 344×259px hero frame (same weight as the public /about page)."
                  value={about.heroImageUrl ?? ''}
                  onChange={(v) => handleAboutChange('heroImageUrl', v)}
                  preview="main-hero"
                  folder="/site/about/main"
                  showLayoutPreview={false}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About title</label>
                  <RichTextEditor
                    value={about.aboutTitle ?? ''}
                    onChange={(v) => handleAboutChange('aboutTitle', v)}
                    minHeight="60px"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 1</label>
                  <RichTextEditor
                    value={about.aboutParagraph1 ?? ''}
                    onChange={(v) => handleAboutChange('aboutParagraph1', v)}
                    placeholder="First paragraph"
                    minHeight="100px"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 2 (add links via the toolbar link button)</label>
                  <RichTextEditor
                    value={about.aboutParagraph2 ?? ''}
                    onChange={(v) => handleAboutChange('aboutParagraph2', v)}
                    placeholder="Second paragraph"
                    minHeight="120px"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                  <input
                    type="url"
                    value={about.aboutLinkUrl ?? ''}
                    onChange={(e) => handleAboutChange('aboutLinkUrl', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                  />
                </div>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Font (Main About paragraph)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Font family</label>
                      <select
                        value={about.paragraphFontFamily ?? ''}
                        onChange={(e) => handleAboutChange('paragraphFontFamily', e.target.value)}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Font weight</label>
                      <select
                        value={about.paragraphFontWeight ?? ''}
                        onChange={(e) => handleAboutChange('paragraphFontWeight', e.target.value)}
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
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={saving || !hasAboutChanges}
                    onClick={saveAbout}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
                  >
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
          </div>
        )}

        {tab === 'generalBody' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">General Body</h2>
            <p className="text-gray-600 text-sm mb-4">
              Content for the General Body page (/about/generalbody): activities list, image, and past events.
            </p>
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 gap-8 items-start max-w-[100rem] xl:grid-cols-[minmax(0,1fr)_560px]">
                <div className="space-y-4 min-w-0 max-w-5xl">
                <AboutSiteImageField
                  label="Team image (General Body / Executive Board)"
                  description="General Body team page and main About “Our Teams” tile for the Executive Board team."
                  value={generalBody.leftImageUrl ?? ''}
                  onChange={(v) => setGeneralBody((p) => ({ ...p, leftImageUrl: v }))}
                  preview="dual-column-and-tile"
                  folder="/site/about/general-body"
                  showLayoutPreview={false}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activities section title</label>
                  <RichTextEditor
                    value={generalBody.activitiesTitle ?? ''}
                    onChange={(v) => setGeneralBody((p) => ({ ...p, activitiesTitle: v }))}
                    minHeight="60px"
                    placeholder="Our Activities"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activities list (one per line)</label>
                  <textarea
                    rows={6}
                    value={(generalBody.activitiesList ?? []).join('\n')}
                    onChange={(e) => setActivitiesListFromText(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                    placeholder="THON Fundraisers\nDesign Team Meetings\n..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body section title (below activities)</label>
                  <RichTextEditor
                    value={generalBody.bodySectionTitle ?? ''}
                    onChange={(v) => setGeneralBody((p) => ({ ...p, bodySectionTitle: v }))}
                    minHeight="60px"
                    placeholder="Our General Body"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Past Events section title</label>
                  <RichTextEditor
                    value={generalBody.pastEventsTitle ?? ''}
                    onChange={(v) => setGeneralBody((p) => ({ ...p, pastEventsTitle: v }))}
                    minHeight="60px"
                    placeholder="Past Events"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Past events list (one per line)</label>
                  <textarea
                    rows={4}
                    value={(generalBody.pastEventsList ?? []).join('\n')}
                    onChange={(e) => setPastEventsListFromText(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                    placeholder="Event 1 - Date\nEvent 2 - Date"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={saving || !hasGeneralBodyChanges}
                    onClick={saveGeneralBody}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
                  >
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
                      teamNameLabel: DEFAULT_TEAM_SETTINGS.execBoardTeamName,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'designTeam' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Design Team</h2>
            <p className="text-gray-600 text-sm mb-4">
              Content for the Design Team page (/about/designteam): image, section title, intro paragraphs and fonts, link URL, and project section titles.
            </p>
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 gap-8 items-start max-w-[100rem] xl:grid-cols-[minmax(0,1fr)_560px]">
                <div className="space-y-4 min-w-0 max-w-5xl">
                <AboutSiteImageField
                  label="Design Team page image (/about/designteam)"
                  description="Left column on the Design Team page."
                  value={designTeam.leftImageUrl ?? ''}
                  onChange={(v) => setDesignTeam((p) => ({ ...p, leftImageUrl: v }))}
                  preview="two-col-left"
                  folder="/site/about/design-team"
                  showLayoutPreview={false}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section title (intro block)</label>
                  <RichTextEditor
                    value={designTeam.sectionTitle ?? ''}
                    onChange={(v) => setDesignTeam((p) => ({ ...p, sectionTitle: v }))}
                    minHeight="60px"
                    placeholder="Our Design Team"
                  />
                </div>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Intro font (family & weight)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph font family</label>
                      <select
                        value={designTeam.introFontFamily ?? ''}
                        onChange={(e) => setDesignTeam((p) => ({ ...p, introFontFamily: e.target.value }))}
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
                        value={designTeam.introFontWeight ?? ''}
                        onChange={(e) => setDesignTeam((p) => ({ ...p, introFontWeight: e.target.value }))}
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
                        value={designTeam.sectionTitleFontFamily ?? ''}
                        onChange={(e) => setDesignTeam((p) => ({ ...p, sectionTitleFontFamily: e.target.value }))}
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
                        value={designTeam.sectionTitleFontWeight ?? ''}
                        onChange={(e) => setDesignTeam((p) => ({ ...p, sectionTitleFontWeight: e.target.value }))}
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
                      value={designTeam.introParagraph1 ?? ''}
                      onChange={(v) => setDesignTeam((p) => ({ ...p, introParagraph1: v }))}
                      placeholder="First paragraph"
                      minHeight="80px"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 2</label>
                    <RichTextEditor
                      value={designTeam.introParagraph2 ?? ''}
                      onChange={(v) => setDesignTeam((p) => ({ ...p, introParagraph2: v }))}
                      placeholder="Second paragraph"
                      minHeight="100px"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 3 (use toolbar link button for links)</label>
                    <RichTextEditor
                      value={designTeam.introParagraph3 ?? ''}
                      onChange={(v) => setDesignTeam((p) => ({ ...p, introParagraph3: v }))}
                      placeholder="To learn more about the international ASME organization, visit this link."
                      minHeight="60px"
                    />
                  </div>
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 3 link URL (when using plain text only)</label>
                    <input
                      type="url"
                      value={designTeam.introLinkUrl ?? ''}
                      onChange={(e) => setDesignTeam((p) => ({ ...p, introLinkUrl: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
                      placeholder="https://www.asme.org"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph 4</label>
                    <RichTextEditor
                      value={designTeam.introParagraph4 ?? ''}
                      onChange={(v) => setDesignTeam((p) => ({ ...p, introParagraph4: v }))}
                      placeholder="WE ARE! the Penn State's chapter of ASME..."
                      minHeight="100px"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Past Projects dropdown title</label>
                  <RichTextEditor
                    value={designTeam.pastProjectsTitle ?? ''}
                    onChange={(v) => setDesignTeam((p) => ({ ...p, pastProjectsTitle: v }))}
                    minHeight="60px"
                    placeholder="Past Projects"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current projects section title</label>
                  <RichTextEditor
                    value={designTeam.currentProjectsTitle ?? ''}
                    onChange={(v) => setDesignTeam((p) => ({ ...p, currentProjectsTitle: v }))}
                    minHeight="60px"
                    placeholder="Fall 2025 Projects"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={saving || !hasDesignTeamChanges}
                    onClick={saveDesignTeam}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
                  >
                    {saving ? 'Saving...' : 'Save Design Team'}
                  </button>
                  {savedMessage === 'Design Team saved.' && <span className="text-green-600 font-medium">Saved.</span>}
                </div>
                </div>
                <div className="sticky top-4 self-start min-w-0 xl:min-w-[560px]">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Live layout (updates as you type)</p>
                  <AboutSiteLayoutPreview
                    compact
                    preview="two-col-left"
                    previewSrc={designTeam.leftImageUrl?.trim() || ABOUT_SITE_IMAGE_PLACEHOLDER}
                    context={{
                      designTeam,
                      mainAbout: {
                        aboutTitle: about.aboutTitle,
                        aboutParagraph1: about.aboutParagraph1,
                        aboutParagraph2: about.aboutParagraph2,
                        aboutLinkUrl: about.aboutLinkUrl,
                      },
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AboutManagement;
