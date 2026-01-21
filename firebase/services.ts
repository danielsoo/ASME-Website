import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  query,
  orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './config';
import { TeamMember, Project, Event, Sponsor, HomePageWhatWeDo } from '../types';

// ============ Team Members (Exec Board & Design Team) ============

export const getExecBoard = async (): Promise<TeamMember[]> => {
  const execBoardRef = collection(db, 'execBoard');
  const snapshot = await getDocs(execBoardRef);
  const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
  // Sort by order field, then by id if order is not set
  return members.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return a.id.localeCompare(b.id);
  });
};

export const getDesignTeam = async (): Promise<TeamMember[]> => {
  const designTeamRef = collection(db, 'designTeam');
  const snapshot = await getDocs(designTeamRef);
  const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
  // Sort by order field, then by id if order is not set
  return members.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return a.id.localeCompare(b.id);
  });
};

export const updateTeamMemberOrder = async (
  members: TeamMember[],
  collectionName: 'execBoard' | 'designTeam'
): Promise<void> => {
  const batch = members.map(async (member, index) => {
    const docRef = doc(db, collectionName, member.id);
    await updateDoc(docRef, { order: index });
  });
  await Promise.all(batch);
};


export const addTeamMember = async (
  member: Omit<TeamMember, 'id'>, 
  collectionName: 'execBoard' | 'designTeam'
): Promise<string> => {
  const docRef = await addDoc(collection(db, collectionName), member);
  return docRef.id;
};

export const updateTeamMember = async (
  id: string, 
  member: Partial<TeamMember>, 
  collectionName: 'execBoard' | 'designTeam'
): Promise<void> => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, member);
};

export const deleteTeamMember = async (
  id: string, 
  collectionName: 'execBoard' | 'designTeam'
): Promise<void> => {
  await deleteDoc(doc(db, collectionName, id));
};

// ============ Projects ============

export const getProjects = async (): Promise<Project[]> => {
  const projectsRef = collection(db, 'projects');
  const snapshot = await getDocs(projectsRef);
  const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  
  // Client-side sorting: status first (current before past), then by order, then by title
  return projects.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'current' ? -1 : 1;
    }
    // Within same status, sort by order if available
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    // Fallback to title
    return (a.title || '').localeCompare(b.title || '');
  });
};

export const updateProjectOrder = async (projects: Project[]): Promise<void> => {
  const batch = projects.map(async (project, index) => {
    const docRef = doc(db, 'projects', project.id);
    await updateDoc(docRef, { order: index });
  });
  await Promise.all(batch);
};

export const getProject = async (id: string): Promise<Project | null> => {
  const docRef = doc(db, 'projects', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Project;
  }
  return null;
};

export const addProject = async (project: Omit<Project, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'projects'), project);
  return docRef.id;
};

export const updateProject = async (id: string, project: Partial<Project>): Promise<void> => {
  const docRef = doc(db, 'projects', id);
  await updateDoc(docRef, project);
};

export const deleteProject = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'projects', id));
};

// ============ Events ============

export const getEvents = async (): Promise<Event[]> => {
  const eventsRef = collection(db, 'events');
  const snapshot = await getDocs(query(eventsRef, orderBy('date', 'desc')));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
};

// Google Calendar API
interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
  location?: string;
  htmlLink?: string;
}

export const getGoogleCalendarEvents = async (): Promise<Event[]> => {
  try {
    // Calendar ID from the provided URL (URL encoded)
    const calendarId = 'ODJlM2NhNzNlYjEzZGZhNDk1Y2YxOGQyMjNhYWYxNDE0MjBkYzg3ZWE4NjcwMDRjOWI4MGY5NzhkMzNiNjBhYUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t';
    
    // Decode the calendar ID
    const decodedCalendarId = decodeURIComponent(calendarId);
    
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year from now
    
    // Fetch events from Google Calendar API (public calendar)
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(decodedCalendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=2500`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Error fetching Google Calendar events:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    
    // Transform Google Calendar events to our Event format
    const events: Event[] = (data.items || []).map((item: GoogleCalendarEvent) => {
      const startDate = item.start?.dateTime || item.start?.date || '';
      const endDate = item.end?.dateTime || item.end?.date || '';
      
      // Parse date
      const eventDate = new Date(startDate);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Determine event type
      let type: 'upcoming' | 'past' | 'this_week' = 'upcoming';
      if (eventDate < now) {
        type = 'past';
      } else if (eventDate <= weekFromNow) {
        type = 'this_week';
      }
      
      // Format date for display
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      return {
        id: item.id,
        title: item.summary || 'Untitled Event',
        description: item.description || '',
        date: formattedDate,
        dateTime: startDate, // Store original date string for accurate parsing
        type: type,
        location: item.location || undefined
      } as Event & { dateTime?: string };
    });
    
    return events;
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    return [];
  }
};

export const addEvent = async (event: Omit<Event, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'events'), event);
  return docRef.id;
};

export const updateEvent = async (id: string, event: Partial<Event>): Promise<void> => {
  const docRef = doc(db, 'events', id);
  await updateDoc(docRef, event);
};

export const deleteEvent = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'events', id));
};

// ============ Sponsors ============

export const getSponsors = async (): Promise<Sponsor[]> => {
  const sponsorsRef = collection(db, 'sponsors');
  const snapshot = await getDocs(query(sponsorsRef, orderBy('id')));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sponsor));
};

export const addSponsor = async (sponsor: Omit<Sponsor, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'sponsors'), sponsor);
  return docRef.id;
};

export const updateSponsor = async (id: string, sponsor: Partial<Sponsor>): Promise<void> => {
  const docRef = doc(db, 'sponsors', id);
  await updateDoc(docRef, sponsor);
};

export const deleteSponsor = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'sponsors', id));
};

// ============ Image Upload ============

export const uploadImage = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};

export const deleteImage = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

// ============ Home Page What We Do Content ============

const WHAT_WE_DO_DOC_ID = 'whatWeDo';

export const getHomePageWhatWeDo = async (): Promise<HomePageWhatWeDo | null> => {
  try {
    const docRef = doc(db, 'homePageContent', WHAT_WE_DO_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as HomePageWhatWeDo;
    }
    return null;
  } catch (error) {
    console.error('Error fetching home page what we do content:', error);
    return null;
  }
};

export const updateHomePageWhatWeDo = async (content: Partial<HomePageWhatWeDo>, updatedBy?: string): Promise<void> => {
  const docRef = doc(db, 'homePageContent', WHAT_WE_DO_DOC_ID);
  const updateData: Partial<HomePageWhatWeDo> = {
    ...content,
    updatedAt: new Date().toISOString(),
  };
  if (updatedBy) {
    updateData.updatedBy = updatedBy;
  }
  
  await setDoc(docRef, updateData, { merge: true });
};
