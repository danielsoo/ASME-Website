import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, auth, storage } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Event } from '../../types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';

interface EventManagementProps {
  onNavigate: (path: string) => void;
}

const EventManagement: React.FC<EventManagementProps> = ({ onNavigate }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [deletionRequestsCount, setDeletionRequestsCount] = useState(0);

  // Form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventType, setEventType] = useState<'upcoming' | 'past' >('upcoming');
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Confirm delete modal state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Alert modal states
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertModal({ isOpen: true, type, title, message });
  };

  useEffect(() => {
    loadEvents();

    // Get current user's role
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUserRole(userData.role || 'member');
          }
        } catch (error) {
          console.error('Error fetching current user role:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for deletion requests count
  useEffect(() => {
    const eventsQuery = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      let count = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.permanentDeleteRequest) {
          const request = data.permanentDeleteRequest;
          // Count if not fully approved (both exec approvals are missing)
          if (!request.approvedByExec1 || !request.approvedByExec2) {
            count++;
          }
        }
      });
      setDeletionRequestsCount(count);
    });

    return () => unsubscribe();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventsRef = collection(db, 'events');
      const snapshot = await getDocs(eventsRef);
      const eventsList: Event[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only show events that are not deleted (deletedAt is null or undefined)
        if (!data.deletedAt) {
          eventsList.push({
            id: docSnap.id,
            ...data,
          } as Event);
        }
      });

      // Sort: by title
      eventsList.sort((a, b) => {
        return a.title.localeCompare(b.title);
      });

      setEvents(eventsList);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };


  // Check if user can manage events (President/VP only)
  const canManageEvents = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President';
  };

  // Check if user can delete events (President/VP only)
  const canDeleteEvents = (): boolean => {
    return currentUserRole === 'President' || currentUserRole === 'Vice President';
  };

  // helper function to upload a file to firebase
  const uploadEventImage = async (file: File): Promise<string> => {
    const fileRef = ref(
      storage,
      `events/${Date.now()}-${file.name}`
    );

    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }

  const handleAddEvent = async () => {
    if (!eventTitle.trim()) {
      showAlert('warning', 'Validation Error', 'Please enter an event title.');
      return;
    }

    if (!imageFile) {
      showAlert('warning', 'Validation Error', 'Please upload an event image.');
      return;
    }

    // President/VP can create approved events directly
    const needsApproval = false;

    try {
      const uploadedImageUrl = await uploadEventImage(imageFile);

      await addDoc(collection(db, 'events'), {
        title: eventTitle.trim(),
        date: eventDate.trim() || '',
        description: eventDescription.trim() || '',
        type: eventType,
        imageUrl: uploadedImageUrl,
        approvalStatus: 'approved',
        createdBy: currentUserId,
        approvedBy: currentUserId,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setShowCreateModal(false);
      setEventTitle('');
      setEventDate('');
      setEventDescription('');
      setEventType('upcoming');
      setImageFile(null);
      setImagePreview(null);

      await loadEvents();
      showAlert('success', 'Success', 'Event added successfully!');
    } catch (error) {
      console.error('Error adding event:', error);
      showAlert('error', 'Error', 'Failed to add event. Please try again.');
    }
  };

  const handleEditEvent = async () => {
    if (!selectedEvent || !eventTitle.trim()) {
      return;
    }

    try {
      let updatedImageUrl = selectedEvent.imageUrl;

      if (imageFile) {
        updatedImageUrl = await uploadEventImage(imageFile)
      }

      await updateDoc(doc(db, 'events', selectedEvent.id), {
        title: eventTitle.trim(),
        date: eventDate.trim() || '',
        description: eventDescription.trim() || '',
        type: eventType,
        imageUrl: updatedImageUrl,
        updatedAt: new Date().toISOString(),
      });

      setShowEditModal(false);
      setSelectedEvent(null);
      //setImageFile(null);
      //setImagePreview(null);

      await loadEvents();
      showAlert('success', 'Success', 'Event updated successfully!');
    } catch (error) {
      console.error('Error updating event:', error);
      showAlert('error', 'Error', 'Failed to update event. Please try again.');
    }
  };

  const handleDeleteClick = (eventId: string) => {
    setEventToDelete(eventId);
    setShowConfirmDelete(true);
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    if (!canDeleteEvents()) {
      showAlert('error', 'Access Denied', 'Only President and Vice President can delete events.');
      setEventToDelete(null);
      setShowConfirmDelete(false);
      return;
    }

    try {
      // Soft delete: Set deletedAt timestamp instead of actually deleting
      await updateDoc(doc(db, 'events', eventToDelete), {
        deletedAt: new Date().toISOString(),
        deletedBy: currentUserId,
        updatedAt: new Date().toISOString(),
      });
      await loadEvents();
      setEventToDelete(null);
      showAlert('success', 'Success', 'Event moved to trash successfully!');
    } catch (error) {
      console.error('Error deleting event:', error);
      showAlert('error', 'Error', 'Failed to delete event. Please try again.');
    }
  };

  const openEditModal = (event: Event) => {
    // Only allow editing if user is President/VP
    if (!canManageEvents()) {
      showAlert('error', 'Access Denied', 'Only President and Vice President can edit event details.');
      return;
    }
    setSelectedEvent(event);
    setEventTitle(event.title);
    setEventDate(event.date || '');
    setEventDescription(event.description || '');
    setEventType(event.type);
    setImageFile(null);
    setImagePreview(event.imageUrl);
    setShowEditModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)

    // Optional: preview before upload
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
  }

  // Check access: Only President/VP can manage events
  if (!canManageEvents()) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only President and Vice President can manage events.</p>
        </div>
      </div>
    );
  }

  // President/VP can see all events
  const visibleEvents = events;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Event Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('/admin')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              ← Back to Dashboard
            </button>
            {canManageEvents() && (
              <button
                onClick={() => {
                  setEventTitle('');
                  setEventDate('');
                  setEventDescription('');
                  setEventType('upcoming');
                  setImageFile(null);
                  setImagePreview(null);
                  setShowCreateModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Event
              </button>
            )}
            {canDeleteEvents() && (
              <button
                onClick={() => onNavigate('/admin/events/trash')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2 relative"
                style={{ position: "relative" }}
              >
                Trash
                {deletionRequestsCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      backgroundColor: "#EF4444",
                      color: "#FFF",
                      borderRadius: "9999px",
                      minWidth: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                      padding: "0 6px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}
                  >
                    {deletionRequestsCount > 99 ? '99+' : deletionRequestsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : visibleEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No events found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-800 mb-1">{event.title}</h2>
                    <div className="flex gap-2 flex-wrap mb-1">
                      {event.approvalStatus === 'pending' && (
                        <span className="inline-block px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                          Pending Approval
                        </span>
                      )}
                    </div>
                    <div className="text-black flex flex-col">
                      <p className="mb-2 font-semibold text-blue-400">{event.type}</p>
                      <p>{event.description}</p>
                    </div>
                    {event.imageUrl && (
                      <div className="mt-3">
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="h-20 object-contain rounded-lg"
                        />
                      </div>
                    )}
                    
                  </div>
                  {canManageEvents() && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => openEditModal(event)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Event"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {canDeleteEvents() && (
                        <button
                          onClick={() => handleDeleteClick(event.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Event"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Event</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    placeholder="e.g., Icecream Social"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Date
                  </label>
                  <input
                    type="text"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    placeholder="e.g. January 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Description
                  </label>
                  <input
                    type="text"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    placeholder="Describe the event here"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as 'upcoming' | 'past')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff', appearance: 'menulist' }}
                  >
                    <option value="upcoming" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Upcoming</option>
                    <option value="past" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Past</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Image *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Image preview"
                      className="mt-4 h-32 object-contain border rounded"
                    />
                  )}
                </div>

              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleAddEvent}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Add Event
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {showEditModal && selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Event</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Date
                  </label>
                  <input
                    type="text"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    placeholder="e.g. January 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Description
                  </label>
                  <input
                    type="text"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    placeholder="Describe the event here"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as 'upcoming' | 'past')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    style={{ color: '#111827', backgroundColor: '#ffffff', appearance: 'menulist' }}
                  >
                    <option value="upcoming" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Upcoming</option>
                    <option value="past" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Past</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Image preview"
                      className="mt-4 h-32 object-contain border rounded"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleEditEvent}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEvent(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alert Modal */}
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          type={alertModal.type}
          title={alertModal.title}
          message={alertModal.message}
        />

        {/* Confirm Delete Modal */}
        <ConfirmModal
          isOpen={showConfirmDelete}
          onClose={() => {
            setShowConfirmDelete(false);
            setEventToDelete(null);
          }}
          onConfirm={handleDeleteEvent}
          title="Move to Trash"
          message="Are you sure you want to delete this event? It will be moved to trash and can be restored later."
          confirmText="Move to Trash"
          cancelText="Cancel"
          type="warning"
        />
      </div>
    </div>
  );
};

export default EventManagement;
