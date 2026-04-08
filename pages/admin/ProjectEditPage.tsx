import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Project } from '../../src/types';
import Uploader from '../../src/components/Uploader';
import AlertModal from '../../src/components/AlertModal';
import RichTextEditor from '../../src/components/RichTextEditor';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';

interface ProjectEditPageProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

const ProjectEditPage: React.FC<ProjectEditPageProps> = ({ projectId, onNavigate }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [allUsers, setAllUsers] = useState<{ uid: string; name?: string; email?: string; role?: string }[]>([]);
  const [execPositions, setExecPositions] = useState<string[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'current' | 'past'>('current');
  const [leaderId, setLeaderId] = useState('');
  const [slack, setSlack] = useState('');
  const [timeline, setTimeline] = useState('');
  const [img, setImg] = useState('');
  const [joinSectionTitle, setJoinSectionTitle] = useState('');
  const [joinSectionDescription, setJoinSectionDescription] = useState('');
  const [joinButtonLabel, setJoinButtonLabel] = useState('');

  const [uploadPct, setUploadPct] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ikUrl, setIkUrl] = useState('');
  const [ikFileId, setIkFileId] = useState<string | null>(null);
  const [ikFilePath, setIkFilePath] = useState<string | null>(null);
  const [ikThumbUrl, setIkThumbUrl] = useState<string | null>(null);

  const [alert, setAlert] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const canManageProjects = (): boolean => {
    return ['President', 'Vice President', 'admin'].includes(currentUserRole);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) setCurrentUserRole(userDoc.data()?.role || '');
      } catch (e) {
        console.error(e);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'execPositions'),
      (posSnap) => {
        const list: string[] = ['admin'];
        posSnap.forEach((d) => {
          const name = d.data().name;
          if (name) list.push(name);
        });
        setExecPositions(list.length > 1 ? list : ['President', 'Vice President', 'admin']);
      },
      () => setExecPositions(['President', 'Vice President', 'admin'])
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list: { uid: string; name?: string; email?: string; role?: string }[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.status === 'approved') list.push({ uid: d.id, ...data });
        });
        setAllUsers(list);
      } catch (e) {
        console.error(e);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'projects', projectId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setProject(null);
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() } as Project;
        setProject(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setImageUrl(data.imageUrl || '');
        setStatus(data.status || 'current');
        setLeaderId(data.leaderId || '');
        setSlack(data.slack || '');
        setTimeline(data.timeline || '');
        setImg(data.img || '');
        setJoinSectionTitle(data.joinSectionTitle ?? 'Want to Get Involved?');
        setJoinSectionDescription(data.joinSectionDescription ?? "Click the link below to authenticate your email and join the slack.");
        setJoinButtonLabel(data.joinButtonLabel ?? 'Join the Slack');
      })
      .catch((e) => {
        if (!cancelled) {
          console.error(e);
          setProject(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  const handleSave = async (opts?: { navigateAfter?: boolean }) => {
    const navigateAfter = opts?.navigateAfter !== false;
    if (!project || !canManageProjects() || saving) return;
    const plainTitle = (title || '').replace(/<[^>]*>/g, '').trim();
    if (!plainTitle) {
      setAlert({ isOpen: true, type: 'error', title: 'Error', message: 'Project title is required.' });
      return;
    }
    setSaving(true);
    try {
      const leaderUser = leaderId ? allUsers.find((u) => u.uid === leaderId) : null;
      const finalImageUrl = ikUrl || imageUrl.trim() || '';
      const updateData: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        status,
        leaderId: leaderId || null,
        leaderEmail: leaderUser?.email || '',
        updatedAt: new Date().toISOString(),
        slack: slack.trim() || null,
        timeline: timeline.trim() || null,
        img: img.trim() || null,
        joinSectionTitle: joinSectionTitle.trim() || null,
        joinSectionDescription: joinSectionDescription.trim() || null,
        joinButtonLabel: joinButtonLabel.trim() || null,
      };
      if (finalImageUrl) updateData.imageUrl = finalImageUrl;
      if (ikFileId !== null) updateData.imagekitFileId = ikFileId;
      if (ikFilePath !== null) updateData.imagekitFilePath = ikFilePath;
      if (ikThumbUrl !== null) updateData.imageThumbnailUrl = ikThumbUrl;

      await updateDoc(doc(db, 'projects', project.id), updateData);
      setAlert({ isOpen: true, type: 'success', title: 'Saved', message: 'Project updated successfully.' });
      if (navigateAfter) setTimeout(() => onNavigate('/admin/projects'), 1500);
    } catch (e) {
      console.error(e);
      setAlert({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to save project.' });
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const currentPath = `/admin/projects/edit/${projectId}`;
  const dirty = !!project && canManageProjects() && (
    (title || '').trim() !== (project.title || '').trim() ||
    (description || '').trim() !== (project.description || '').trim() ||
    (ikUrl || imageUrl || '').trim() !== (project.imageUrl || '').trim() ||
    status !== (project.status || 'current') ||
    leaderId !== (project.leaderId || '') ||
    (slack || '').trim() !== (project.slack || '').trim() ||
    (timeline || '').trim() !== (project.timeline || '').trim() ||
    (img || '').trim() !== (project.img || '').trim() ||
    (joinSectionTitle || '').trim() !== (project.joinSectionTitle ?? 'Want to Get Involved?').trim() ||
    (joinSectionDescription || '').trim() !== (project.joinSectionDescription ?? '').trim() ||
    (joinButtonLabel || '').trim() !== (project.joinButtonLabel ?? 'Join the Slack').trim()
  );
  const saveForLeave = async () => {
    await handleSave({ navigateAfter: false });
  };
  const { safeNavigate, leaveConfirmModal } = useUnsavedChangesGuard({
    currentPath,
    dirty,
    onNavigate,
    onSave: saveForLeave,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <p className="text-gray-600 mb-4">Project not found.</p>
        <button
          type="button"
          onClick={() => onNavigate('/admin/projects')}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  if (!canManageProjects()) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <p className="text-gray-600 mb-4">Only President, Vice President, or Admin can edit project details.</p>
        <button
          type="button"
          onClick={() => onNavigate('/admin/projects')}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Edit Project</h1>
          <button
            type="button"
            onClick={() => safeNavigate('/admin/projects')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
          >
            ← Back to Projects
          </button>
        </div>
        {leaveConfirmModal}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Basic info */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Info</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label>
                <RichTextEditor
                  value={title}
                  onChange={setTitle}
                  minHeight="60px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  minHeight="120px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Main Image URL</label>
                <Uploader
                  folder={`/projects/${(title || '').replace(/<[^>]*>/g, '').trim() || 'untitled'}`}
                  tags={['project', (title || '').replace(/<[^>]*>/g, '').trim()].filter(Boolean)}
                  onProgress={(pct) => {
                    setUploadPct(pct);
                    setUploadingImage(pct > 0 && pct < 100);
                  }}
                  onError={(msg) => setAlert({ isOpen: true, type: 'error', title: 'Image Upload', message: msg })}
                  onComplete={(u) => {
                    setIkUrl(u.url);
                    setIkFileId(u.fileId);
                    setIkFilePath(u.filePath);
                    setIkThumbUrl(u.thumbnailUrl ?? null);
                    setImageUrl(u.url);
                    setAlert({ isOpen: true, type: 'success', title: 'Image', message: 'Image uploaded.' });
                  }}
                />
                {uploadPct > 0 && uploadPct < 100 && <p className="text-xs text-gray-500 mt-1">Uploading... {uploadPct}%</p>}
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 mt-2"
                  placeholder="Or paste image URL"
                />
                {imageUrl && (
                  <img src={imageUrl} alt="Preview" className="mt-2 h-40 object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'current' | 'past')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                >
                  <option value="current">Current</option>
                  <option value="past">Past</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Leader</label>
                <select
                  value={leaderId}
                  onChange={(e) => setLeaderId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                >
                  <option value="">No Leader</option>
                  {allUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>{u.name || u.email} ({u.role || 'member'})</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Detail page: Join / Slack section */}
          <section className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Detail page — Join / Join the Slack</h2>
            <p className="text-sm text-gray-500 mb-4">Edit Slack invite, deadline, and button text shown on the project detail page.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section title</label>
                <RichTextEditor
                  value={joinSectionTitle}
                  onChange={setJoinSectionTitle}
                  minHeight="60px"
                  placeholder="e.g. Want to Get Involved?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section description (text above Slack link)</label>
                <RichTextEditor
                  value={joinSectionDescription}
                  onChange={setJoinSectionDescription}
                  minHeight="80px"
                  placeholder="e.g. Click the link below to authenticate your email and join the slack."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slack invite URL</label>
                <input
                  type="url"
                  value={slack}
                  onChange={(e) => setSlack(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button label</label>
                <input
                  type="text"
                  value={joinButtonLabel}
                  onChange={(e) => setJoinButtonLabel(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="e.g. Join the Slack"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline to join</label>
                <input
                  type="text"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="e.g. March 15, 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Right-side image URL (second image on detail page)</label>
                <input
                  type="url"
                  value={img}
                  onChange={(e) => setImg(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="https://..."
                />
                {img && (
                  <img src={img} alt="Preview" className="mt-2 h-32 object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
            </div>
          </section>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving || uploadingImage}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => safeNavigate('/admin/projects')}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert((a) => ({ ...a, isOpen: false }))}
        type={alert.type}
        title={alert.title}
        message={alert.message}
      />
    </div>
  );
};

export default ProjectEditPage;
