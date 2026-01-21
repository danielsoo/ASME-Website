import React, { useState, useEffect, useRef } from 'react';
import { responsiveClamp, responsiveClampCustom } from '../utils/responsive';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getHomePageWhatWeDo, updateHomePageWhatWeDo } from '../firebase/services';
import { HomePageWhatWeDo } from '../types';
import { Edit2, Save, X } from 'lucide-react';

const Home: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Content state
  const [content, setContent] = useState<HomePageWhatWeDo>({
    title: 'What we do',
    content: '<p>The Penn State Chapter of ASME provides members with opportunities for professional development, hands-on design experience, and outreach within and beyond Penn State. If you are interested in growing professionally, getting in contact with employers, or working on cool projects, you are in the right spot!</p><p>Everyone is welcome (not just Mechanical engineers), and there are no membership requirements or dues. Just show up!</p>',
    buttonText: 'Join our GroupMe',
    buttonUrl: '',
  });

  // Edit state
  const [editContent, setEditContent] = useState<HomePageWhatWeDo>(content);
  const savedRangeRef = useRef<Range | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Check user permissions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || 'member');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      } else {
        setUserRole('');
        setUserId('');
      }
    });

    return () => unsubscribe();
  }, []);

  // Load content from Firebase
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        const firebaseContent = await getHomePageWhatWeDo();
        if (firebaseContent) {
          setContent(firebaseContent);
          setEditContent(firebaseContent);
        }
      } catch (error) {
        console.error('Error loading home page content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  const canEdit = userRole === 'President' || userRole === 'Vice President';

  const handleEdit = () => {
    setEditContent(content);
    setIsEditing(true);
    // Set editor content after state update
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = content.content || '';
      }
    }, 0);
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
    savedRangeRef.current = null;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateHomePageWhatWeDo(editContent, userId);
      setContent(editContent);
      setIsEditing(false);
      savedRangeRef.current = null;
    } catch (error) {
      console.error('Error saving home page content:', error);
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section with Background Image */}
      <div
        style={{
          height: "54.03vw",
          minHeight: "clamp(400px, 54.03vw, 1000px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: "5vw",
          paddingLeft: "clamp(16px, 4.23vw, 64px)",
          paddingRight: "clamp(16px, 4.23vw, 64px)",
          paddingBottom: "clamp(120px, 8vw, 200px)",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "clamp(300px, 100vw, 1512px)",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "clamp(200px, 37.57vw, 568px)",
            aspectRatio: "1512 / 568",
            textAlign: "center",
            marginTop: "auto",
            marginBottom: "auto",
          }}
        >
          <h1
            style={{
              fontSize: responsiveClamp(64, 32, 96),
              fontWeight: "bold",
              marginBottom: responsiveClamp(24, 12, 36),
              color: "#ffffff",
            }}
          >
            WE ARE
          </h1>
          <h2
            style={{
              fontSize: responsiveClamp(48, 24, 72),
              fontWeight: "bold",
              marginBottom: responsiveClamp(24, 12, 36),
              color: "#ffffff",
            }}
          >
            THE AMERICAN SOCIETY OF MECHANICAL ENGINEERS
          </h2>
          <p
            style={{
              fontSize: responsiveClamp(36, 18, 54),
              fontWeight: "bold",
              color: "#ffffff",
            }}
          >
            @ PENN STATE
          </p>
        </div>
      </div>

      {/* Next Meeting Section (Calendar Visual) */}
      <div 
        className="relative z-20 container mx-auto px-4 mb-24"
        style={{
          marginTop: "clamp(-80px, -6vw, -96px)",
        }}
      >
        <div className="flex flex-col items-center">
            <h3 className="text-3xl font-jost font-bold mb-6 text-white text-center">Next Meeting</h3>
            
            {/* Simple Mock Calendar Card */}
            <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-4xl overflow-hidden">
                <div className="flex justify-between items-center mb-6 px-4">
                    <div className="flex gap-4 items-center">
                        <span className="text-4xl font-light text-gray-800">19</span>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-500 uppercase">Tue</span>
                            <span className="text-xl font-bold text-black">October 2025</span>
                        </div>
                    </div>
                </div>
                {/* Visual Grid for Calendar */}
                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                    {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                        <div key={d} className="bg-white py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
                    ))}
                    {/* Mock Days */}
                    {Array.from({length: 31}).map((_, i) => (
                        <div key={i} className={`bg-white h-24 p-1 relative ${i === 20 ? 'bg-blue-50' : ''}`}>
                             <span className={`text-sm ${i===20 ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>{i+1}</span>
                             {i === 20 && (
                                 <div className="absolute top-1/2 left-2 right-2 h-1 bg-red-500 rounded-full"></div>
                             )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* What we do Section */}
      <div className="container mx-auto px-4 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
                <div className="flex items-center bg-gray-200/90 rounded-r-full p-4 w-full md:w-3/4 hover:w-full transition-all duration-300 group cursor-pointer">
                    <div className="w-10 h-10 rounded-full border-2 border-asme-dark flex items-center justify-center font-bold text-asme-dark mr-4">1</div>
                    <span className="font-jost font-bold text-asme-dark tracking-widest text-lg">PROJECTS</span>
                </div>
                <div className="flex items-center bg-gray-200/90 rounded-r-full p-4 w-full md:w-3/4 hover:w-full transition-all duration-300 group cursor-pointer ml-8">
                    <div className="w-10 h-10 rounded-full border-2 border-asme-dark flex items-center justify-center font-bold text-asme-dark mr-4">2</div>
                    <span className="font-jost font-bold text-asme-dark tracking-widest text-lg">WORKSHOPS</span>
                </div>
                <div className="flex items-center bg-gray-200/90 rounded-r-full p-4 w-full md:w-3/4 hover:w-full transition-all duration-300 group cursor-pointer ml-16">
                    <div className="w-10 h-10 rounded-full border-2 border-asme-dark flex items-center justify-center font-bold text-asme-dark mr-4">3</div>
                    <span className="font-jost font-bold text-asme-dark tracking-widest text-lg">SOCIALS</span>
                </div>
            </div>
            
            <div className="font-jost text-gray-300 space-y-6 relative">
                {/* Edit/Save/Cancel Buttons */}
                {canEdit && (
                  <div className="absolute -top-2 -right-2 z-10 flex gap-2">
                    {!isEditing ? (
                      <button
                        onClick={handleEdit}
                        className="bg-blue-600/90 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
                        title="Edit"
                      >
                        <Edit2 size={20} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="bg-green-600/90 hover:bg-green-700 disabled:bg-gray-400 text-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
                          title="Save"
                        >
                          <Save size={20} />
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={saving}
                          className="bg-gray-600/90 hover:bg-gray-700 disabled:bg-gray-400 text-white p-2 rounded-full shadow-lg transition-all hover:scale-110"
                          title="Cancel"
                        >
                          <X size={20} />
                        </button>
                      </>
                    )}
                  </div>
                )}
                {isEditing ? (
                  <div className="space-y-4 bg-gray-800/50 p-6 rounded-lg border-2 border-blue-500">
                    {/* Title Editor */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Title</label>
                      <input
                        type="text"
                        value={editContent.title}
                        onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                      />
                    </div>

                    {/* Content Editor */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Content</label>
                      <div className="bg-gray-700 border border-gray-600 rounded-lg">
                        <div className="flex gap-1 p-2 border-b border-gray-600 flex-wrap items-center">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const editor = editorRef.current;
                              if (editor) {
                                editor.focus();
                                document.execCommand('bold', false);
                              }
                            }}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm font-bold"
                            title="Bold"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const editor = editorRef.current;
                              if (editor) {
                                editor.focus();
                                document.execCommand('italic', false);
                              }
                            }}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm italic"
                            title="Italic"
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const editor = editorRef.current;
                              if (editor) {
                                editor.focus();
                                document.execCommand('underline', false);
                              }
                            }}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm underline"
                            title="Underline"
                          >
                            U
                          </button>
                          <div className="border-l border-gray-500 h-6 mx-1"></div>
                          <input
                            type="color"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const editor = editorRef.current;
                              if (editor) {
                                editor.focus();
                              }
                            }}
                            onChange={(e) => {
                              const editor = editorRef.current;
                              if (editor) {
                                editor.focus();
                                document.execCommand('foreColor', false, e.target.value);
                              }
                            }}
                            defaultValue="#ffffff"
                            className="h-8 w-12 bg-gray-600 border-0 rounded cursor-pointer"
                            title="Text Color"
                          />
                        </div>
                        <div
                          ref={editorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => setEditContent({ ...editContent, content: e.currentTarget.innerHTML })}
                          className="w-full px-4 py-2 text-white min-h-[150px] focus:outline-none"
                          style={{ whiteSpace: 'pre-wrap' }}
                        />
                      </div>
                    </div>

                    {/* Button Editor */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Button Text</label>
                      <input
                        type="text"
                        value={editContent.buttonText}
                        onChange={(e) => setEditContent({ ...editContent, buttonText: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg mb-2"
                      />
                      <label className="block text-sm font-medium text-white mb-2">Button Link (URL)</label>
                      <input
                        type="text"
                        value={editContent.buttonUrl || ''}
                        onChange={(e) => setEditContent({ ...editContent, buttonUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold text-white">
                      {content.title}
                    </h2>
                    <div dangerouslySetInnerHTML={{ __html: content.content || '' }}></div>
                    {content.buttonUrl ? (
                      <a
                        href={content.buttonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-[#4a5568] hover:bg-[#2d3748] text-white font-bold py-2 px-6 rounded shadow transition"
                      >
                        {content.buttonText}
                      </a>
                    ) : (
                <button className="bg-[#4a5568] hover:bg-[#2d3748] text-white font-bold py-2 px-6 rounded shadow transition">
                        {content.buttonText}
                </button>
                    )}
                  </>
                )}
            </div>
        </div>
      </div>

      {/* Embedded Linktree Placeholder */}
      <div className="container mx-auto px-4 mb-24">
          <div className="w-full h-64 bg-asme-red flex items-center justify-center rounded-lg shadow-inner">
              <span className="text-white font-jost font-bold text-xl tracking-widest uppercase">Embedded Linktree</span>
          </div>
      </div>

    </div>
  );
};

export default Home;
