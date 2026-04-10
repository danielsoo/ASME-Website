import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Project } from '../../src/types';
import Uploader from '../../src/components/Uploader';
import DragUploader from '../../src/components/DragUploader';
import { ProjectAdminImagePreview } from '../../src/components/ProjectAdminImagePreview';
import { imageKitFolderForProjectId, imageKitTagsForProject } from '../../src/utils/imagekitProjectUpload';
import AlertModal from '../../src/components/AlertModal';
import RichTextEditor from '../../src/components/RichTextEditor';
import { useUnsavedChangesGuard } from '../../src/hooks/useUnsavedChangesGuard';
import { richTextToPlainText } from '../../src/utils/sanitizeHtml';
import { useExecPermissions } from '../../src/hooks/useExecPermissions';

interface ProjectEditPageProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

const ProjectEditPage: React.FC<ProjectEditPageProps> = ({ projectId, onNavigate }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const { ready: permReady, perms } = useExecPermissions();
  const [roleReady, setRoleReady] = useState(false);
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
  const [imgs, setImgs] = useState<string[]>([]);
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

  const canManageProjects = (): boolean => perms.projects;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRoleReady(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) setCurrentUserRole(userDoc.data()?.role || '');
        else setCurrentUserRole('');
      } catch (e) {
        console.error(e);
        setCurrentUserRole('');
      } finally {
        setRoleReady(true);
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
        setImgs(data.imgs?.length ? data.imgs : (data.img ? [data.img] : []));
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
    const plainTitle = richTextToPlainText(title);
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
        chairs: [],
        img: null,
        imgs: imgs.map((u) => u.trim()).filter(Boolean),
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
    JSON.stringify(imgs.map((u) => u.trim()).filter(Boolean)) !== JSON.stringify((project.imgs?.length ? project.imgs : (project.img ? [project.img] : [])).map((u) => u.trim()).filter(Boolean)) ||
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

  if (!roleReady || !permReady) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const readOnly = !canManageProjects();

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
        {readOnly && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong>View only.</strong> You can review this project but cannot save changes. Ask the President to grant{' '}
            <strong>Projects</strong> area permission in Admin Access to edit.
          </div>
        )}
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
                  readOnly={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  minHeight="120px"
                  readOnly={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Main Image</label>
                {!readOnly && (
                  <>
                    <Uploader
                      folder={imageKitFolderForProjectId(projectId)}
                      tags={imageKitTagsForProject(projectId)}
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
                    {uploadPct > 0 && uploadPct < 100 && (
                      <p className="text-xs text-gray-500 mt-1">Uploading... {uploadPct}%</p>
                    )}
                  </>
                )}
                <ProjectAdminImagePreview
                  imageUrl={ikUrl || imageUrl}
                  titleHint={richTextToPlainText(title)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'current' | 'past')}
                  disabled={readOnly}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  disabled={readOnly}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  readOnly={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section description (text above Slack link)</label>
                <RichTextEditor
                  value={joinSectionDescription}
                  onChange={setJoinSectionDescription}
                  minHeight="80px"
                  placeholder="e.g. Click the link below to authenticate your email and join the slack."
                  readOnly={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slack invite URL</label>
                <input
                  type="url"
                  value={slack}
                  onChange={(e) => setSlack(e.target.value)}
                  readOnly={readOnly}
                  className={`w-full border border-gray-300 rounded px-3 py-2 text-gray-900 ${readOnly ? 'bg-gray-100 cursor-default' : ''}`}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button label</label>
                <input
                  type="text"
                  value={joinButtonLabel}
                  onChange={(e) => setJoinButtonLabel(e.target.value)}
                  readOnly={readOnly}
                  className={`w-full border border-gray-300 rounded px-3 py-2 text-gray-900 ${readOnly ? 'bg-gray-100 cursor-default' : ''}`}
                  placeholder="e.g. Join the Slack"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline to join</label>
                <input
                  type="text"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  readOnly={readOnly}
                  className={`w-full border border-gray-300 rounded px-3 py-2 text-gray-900 ${readOnly ? 'bg-gray-100 cursor-default' : ''}`}
                  placeholder="e.g. March 15, 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gallery images (shown on detail page)</label>
                <div className="space-y-4">
                  {imgs.map((url, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">Image {i + 1}</span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setImgs(imgs.filter((_, j) => j !== i))}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {!readOnly && (
                        <DragUploader
                          folder={`${imageKitFolderForProjectId(projectId)}/gallery`}
                          tags={[...imageKitTagsForProject(projectId), 'gallery']}
                          onComplete={(u) => {
                            const next = [...imgs];
                            next[i] = u.url;
                            setImgs(next);
                            setAlert({ isOpen: true, type: 'success', title: 'Image', message: `Gallery image ${i + 1} uploaded.` });
                          }}
                          onError={(msg) => setAlert({ isOpen: true, type: 'error', title: 'Upload Error', message: msg })}
                        />
                      )}
                      {url.trim() && (
                        <img
                          src={url.trim()}
                          alt={`Preview ${i + 1}`}
                          className="h-28 rounded-lg object-cover border border-gray-200 w-full"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setImgs([...imgs, ''])}
                      className="w-full py-2 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors font-medium"
                    >
                      + Add Image
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {!readOnly && (
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
          )}
          {readOnly && (
            <div className="pt-4">
              <button
                type="button"
                onClick={() => safeNavigate('/admin/projects')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Back to Projects
              </button>
            </div>
          )}
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
