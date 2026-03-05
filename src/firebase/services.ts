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
import { TeamMember, Project, Event, Sponsor, HomePageWhatWeDo, InstagramPost } from '../types';

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

let _calendarWarned = false;

const DEFAULT_CALENDAR_ID_BASE64 = 'ODJlM2NhNzNlYjEzZGZhNDk1Y2YxOGQyMjNhYWYxNDE0MjBkYzg3ZWE4NjcwMDRjOWI4MGY5NzhkMzNiNjBhYUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t';
// Decoded: 82e3ca73eb13dfa495cf18d223aaf141420dc87ea867004c9b80f978d33b60aa@group.calendar.google.com

function decodeCalendarId(encoded: string): string {
  try {
    return atob(encoded);
  } catch {
    return decodeURIComponent(encoded);
  }
}

/** Returns list of calendar IDs to fetch. Supports 1) multiple via VITE_GOOGLE_CALENDAR_IDS (comma), 2) single VITE_GOOGLE_CALENDAR_ID, 3) default encoded ID. */
function getCalendarIds(): string[] {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const multiple = env?.VITE_GOOGLE_CALENDAR_IDS;
  if (multiple && typeof multiple === 'string') {
    return multiple.split(',').map((id) => id.trim()).filter(Boolean);
  }
  const single = env?.VITE_GOOGLE_CALENDAR_ID;
  if (single) return [single];
  return [decodeCalendarId(DEFAULT_CALENDAR_ID_BASE64)];
}

const CALENDAR_TZ = 'America/New_York';

/** Today as YYYY-MM-DD in calendar timezone (matches embed ctz). */
function getTodayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: CALENDAR_TZ }); // en-CA => YYYY-MM-DD
}

/** Add days to YYYY-MM-DD string. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function mapCalendarItemToEvent(item: GoogleCalendarEvent, calendarId: string): Event & { dateTime?: string } {
  const hasTime = Boolean(item.start?.dateTime);
  const startDate = item.start?.dateTime || item.start?.date || '';
  const eventDate = new Date(startDate);
  let type: 'upcoming' | 'past' | 'this_week' = 'upcoming';

  if (hasTime) {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (eventDate < now) type = 'past';
    else if (eventDate <= weekFromNow) type = 'this_week';
  } else {
    // All-day event: use calendar day in CALENDAR_TZ so "Mar 5" isn't treated as past on Mar 4 evening (UTC midnight = Mar 4 EST)
    const eventDayStr = (item.start?.date || '').slice(0, 10); // YYYY-MM-DD
    const todayStr = getTodayDateString();
    const weekEndStr = addDays(todayStr, 7);
    if (eventDayStr < todayStr) type = 'past';
    else if (eventDayStr < weekEndStr) type = 'this_week';
  }

  // All dates/times shown in New York timezone (America/New_York)
  const dateFormatOpts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: CALENDAR_TZ
  };
  const eventDayStr = (item.start?.date || '').slice(0, 10);
  const formattedDate =
    !hasTime && eventDayStr
      ? (() => {
          const [y, m, d] = eventDayStr.split('-').map(Number);
          const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
          return noonUtc.toLocaleDateString('en-US', dateFormatOpts);
        })()
      : eventDate.toLocaleDateString('en-US', dateFormatOpts);
  return {
    id: `${encodeURIComponent(calendarId)}_${item.id}`,
    title: item.summary || 'Untitled Event',
    description: item.description || '',
    date: formattedDate,
    dateTime: startDate,
    type,
    location: item.location || undefined
  } as Event & { dateTime?: string };
}

export const getGoogleCalendarEvents = async (): Promise<Event[]> => {
  const calendarIds = getCalendarIds();
  const apiKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CALENDAR_API_KEY;
  const now = Date.now();
  const timeMin = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString(); // From 1 year ago (enough past events)
  const timeMax = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();
  const allEvents: Event[] = [];

  for (const calendarId of calendarIds) {
    try {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=2500${apiKey ? `&key=${encodeURIComponent(apiKey)}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (import.meta.env?.DEV && !_calendarWarned) {
          _calendarWarned = true;
          const msg = response.status === 404
            ? 'Google Calendar: calendar not found (404). Check calendar ID or set VITE_GOOGLE_CALENDAR_ID(S) in .env.local.'
            : `Google Calendar: request failed (${response.status}). For 403, add VITE_GOOGLE_CALENDAR_API_KEY and enable Calendar API.`;
          console.warn(msg);
        }
        continue;
      }

      const data = await response.json();
      const events = (data.items || []).map((item: GoogleCalendarEvent) => mapCalendarItemToEvent(item, calendarId));
      allEvents.push(...events);
    } catch (error) {
      if (import.meta.env?.DEV && !_calendarWarned) {
        _calendarWarned = true;
        console.warn('Google Calendar error:', error);
      }
    }
  }

  allEvents.sort((a, b) => {
    const tA = (a as Event & { dateTime?: string }).dateTime || '';
    const tB = (b as Event & { dateTime?: string }).dateTime || '';
    return new Date(tA).getTime() - new Date(tB).getTime();
  });
  return allEvents;
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

const DEFAULT_SPONSOR_EMAIL = 'president.asme.psu@gmail.com';

/** Sponsor / guest speaker contact email. Stored in Firestore at settings/sponsor, field "email". */
export const getSponsorContactEmail = async (): Promise<string> => {
  try {
    const docRef = doc(db, 'settings', 'sponsor');
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.email) {
      return String(snap.data().email).trim();
    }
  } catch (e) {
    console.warn('Could not load sponsor contact email from Firestore:', e);
  }
  return DEFAULT_SPONSOR_EMAIL;
};

/** Returns all non-deleted sponsors (same list as admin main view). Sort by name. */
export const getSponsors = async (): Promise<Sponsor[]> => {
  const sponsorsRef = collection(db, 'sponsors');
  const snapshot = await getDocs(sponsorsRef);
  const sponsors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sponsor));
  return sponsors
    .filter(sponsor => sponsor != null && !sponsor.deletedAt)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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

// ============ Instagram Feed ============

interface InstagramMediaResponse {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
}

/**
 * Fetches Instagram posts using Instagram Basic Display API or Graph API
 * Note: Requires an Access Token. You can get one from:
 * - Instagram Basic Display API: https://developers.facebook.com/docs/instagram-basic-display-api
 * - Instagram Graph API: https://developers.facebook.com/docs/instagram-api
 * 
 * For now, this function expects the access token to be stored in Firebase or environment variables.
 * You'll need to set up the access token separately.
 */
export const getInstagramPosts = async (limit: number = 6): Promise<InstagramPost[]> => {
  try {
    // Try to get access token from environment variables first
    let accessToken = import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
    
    // If not found in env, try to get from Firebase Firestore
    if (!accessToken) {
      try {
        const settingsRef = doc(db, 'settings', 'instagram');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const settings = settingsSnap.data();
          accessToken = settings.accessToken;
        }
      } catch {
        // No token in Firestore - skip Instagram (see INSTAGRAM_SETUP.md to enable)
      }
    }

    if (!accessToken) {
      return [];
    }

    // Instagram Graph API endpoint
    // For Basic Display API, use: https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token={access-token}
    const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&limit=${limit}&access_token=${accessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error fetching Instagram posts:', response.statusText, errorData);
      
      // If CORS error or other issues, return empty array
      if (response.status === 0 || response.status === 401) {
        console.warn('Instagram API access denied. This might be a CORS issue. Consider using Firebase Functions.');
      }
      
      return [];
    }
    
    const data = await response.json();
    
    // Transform Instagram API response to our InstagramPost format
    const posts: InstagramPost[] = (data.data || []).map((item: InstagramMediaResponse) => ({
      id: item.id,
      caption: item.caption || '',
      mediaUrl: item.media_url,
      permalink: item.permalink,
      timestamp: item.timestamp,
      mediaType: item.media_type,
      thumbnailUrl: item.thumbnail_url || item.media_url
    }));
    
    return posts;
  } catch (error) {
    console.error('Error fetching Instagram posts:', error);
    return [];
  }
};
