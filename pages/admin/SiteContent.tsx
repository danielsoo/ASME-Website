import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import type { FooterContent } from '../../src/types';
import { DEFAULT_FOOTER } from '../../src/types';

const CONFIG_PATH = 'config';
const FOOTER_DOC = 'footer';

interface SiteContentProps {
  onNavigate: (path: string) => void;
  currentUserRole: string;
}

function footerEquals(a: FooterContent, b: FooterContent): boolean {
  const keys: (keyof FooterContent)[] = ['phone', 'email1', 'email2', 'missionStatement', 'addressLine1', 'addressLine2', 'instagramUrl', 'groupmeUrl', 'slackUrl'];
  return keys.every((k) => (a[k] ?? '') === (b[k] ?? ''));
}

const SiteContent: React.FC<SiteContentProps> = ({ onNavigate, currentUserRole }) => {
  const [footer, setFooter] = useState<FooterContent>({ ...DEFAULT_FOOTER });
  const [initialFooter, setInitialFooter] = useState<FooterContent>({ ...DEFAULT_FOOTER });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const isPresident = currentUserRole === 'President';
  const hasChanges = !footerEquals(footer, initialFooter);

  useEffect(() => {
    if (!isPresident) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    getDoc(doc(db, CONFIG_PATH, FOOTER_DOC))
      .then((snap) => {
        if (cancelled) return;
        const next = snap.exists()
          ? { ...DEFAULT_FOOTER, ...(snap.data() as FooterContent) }
          : { ...DEFAULT_FOOTER };
        setFooter(next);
        setInitialFooter(next);
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

  const saveFooter = async () => {
    if (!isPresident || saving || !hasChanges) return;
    setSaving(true);
    setSavedMessage(false);
    try {
      await setDoc(doc(db, CONFIG_PATH, FOOTER_DOC), footer);
      setInitialFooter(footer);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (e) {
      console.error('Failed to save footer:', e);
    } finally {
      setSaving(false);
    }
  };

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
            onClick={() => onNavigate('/admin')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 sm:px-4 rounded text-sm sm:text-base shrink-0"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
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
                <input
                  type="text"
                  value={footer.missionStatement ?? ''}
                  onChange={(e) => handleFooterChange('missionStatement', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800"
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
                  disabled={saving || !hasChanges}
                  onClick={saveFooter}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
                >
                  {saving ? 'Saving...' : 'Save Footer'}
                </button>
                {savedMessage && <span className="text-green-600 font-medium">Saved.</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiteContent;
