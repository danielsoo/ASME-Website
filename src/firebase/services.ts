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
  where,
  limit,
  orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './config';
import { TeamMember, Project, Event, Sponsor, HomePageWhatWeDo } from '../types';

// ============ Team Members (Exec Board & Design Team) ============

export const getExecBoard = async (): Promise<TeamMember[]> => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(query(usersRef, where('status', '==', 'approved'), where('team', '==', 'General Body')));
  const members = snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        name: data.name || '',
        position: data.role || 'member',
        year: data.year || '',
        major: data.major || '',
        hometown: data.hometown || '',
        imageUrl: data.imageUrl || '',
        imageFocusX: typeof data.imageFocusX === 'number' ? data.imageFocusX : 50,
        imageFocusY: typeof data.imageFocusY === 'number' ? data.imageFocusY : 50,
        imageZoom: typeof data.imageZoom === 'number' ? data.imageZoom : 1,
        email: data.email || '',
        funFact: data.funFact || '',
        isExec: data.role !== 'member' && data.role !== 'admin',
        order: data.execOrder,
        status: data.status,
        team: data.team,
      } as TeamMember;
    })
    .filter((member) => member.position !== 'member' && member.position !== 'admin');

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
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(query(usersRef, where('status', '==', 'approved'), where('team', '==', 'Design Team')));
  const members = snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        name: data.name || '',
        position: data.role || 'member',
        year: data.year || '',
        major: data.major || '',
        hometown: data.hometown || '',
        imageUrl: data.imageUrl || '',
        imageFocusX: typeof data.imageFocusX === 'number' ? data.imageFocusX : 50,
        imageFocusY: typeof data.imageFocusY === 'number' ? data.imageFocusY : 50,
        imageZoom: typeof data.imageZoom === 'number' ? data.imageZoom : 1,
        email: data.email || '',
        funFact: data.funFact || '',
        isExec: data.role !== 'member' && data.role !== 'admin',
        order: data.designOrder,
        status: data.status,
        team: data.team,
      } as TeamMember;
    })
    .filter((member) => member.position !== 'member' && member.position !== 'admin');

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
  const orderField = collectionName === 'execBoard' ? 'execOrder' : 'designOrder';
  const batch = members.map(async (member, index) => {
    const docRef = doc(db, 'users', member.id);
    await updateDoc(docRef, { [orderField]: index });
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


// Default calendar ID — must match the fallback in Events.tsx
const DEFAULT_CALENDAR_ID = 'k1n8agb7ecfitks2jflr6qrfjs@group.calendar.google.com';

/** Returns list of calendar IDs to fetch. Supports 1) multiple via VITE_GOOGLE_CALENDAR_IDS (comma), 2) single VITE_GOOGLE_CALENDAR_ID, 3) default ID. */
function getCalendarIds(): string[] {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const multiple = env?.VITE_GOOGLE_CALENDAR_IDS;
  if (multiple && typeof multiple === 'string') {
    return multiple.split(',').map((id) => id.trim()).filter(Boolean);
  }
  const single = env?.VITE_GOOGLE_CALENDAR_ID;
  if (single) return [single];
  return [DEFAULT_CALENDAR_ID];
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
        const errBody = await response.text().catch(() => '');
        const msg = response.status === 404
          ? `Google Calendar [${calendarId}]: calendar not found (404). Check calendar ID.`
          : response.status === 403
          ? `Google Calendar [${calendarId}]: access denied (403). The calendar must be set to "Make available to public" in Google Calendar sharing settings.`
          : `Google Calendar [${calendarId}]: request failed (${response.status}). ${errBody}`;
        console.error(msg);
        continue;
      }

      const data = await response.json();
      const events = (data.items || []).map((item: GoogleCalendarEvent) => mapCalendarItemToEvent(item, calendarId));
      console.log(`Google Calendar [${calendarId}]: fetched ${events.length} events`);
      allEvents.push(...events);
    } catch (error) {
      console.error(`Google Calendar [${calendarId}]: fetch error`, error);
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

export const getExecEmailByPosition = async (position: string): Promise<string | null> => {
  const execRef = collection(db, 'execBoard');

  const q = query(execRef, where('position', '==', position), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const data = snap.docs[0].data() as TeamMember;
  const email = (data as any).email as string | undefined;

  return email?.trim() || null;

};

export const getCorporateOutreachEmail = async (): Promise<string> => {
  
  const email = await getExecEmailByPosition('Corporate Outreach Lead');
  return email ?? DEFAULT_SPONSOR_EMAIL;

}

const DEFAULT_SPONSOR_EMAIL = 'president.asme.psu@gmail.com';

/*VVVV i'm replacing this with the above function since the 
external outreach chair is the email the sponsors should contact for this

/** Sponsor / guest speaker contact email. Stored in Firestore at settings/sponsor, field "email". */
/*export const getSponsorContactEmail = async (): Promise<string> => {
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
};*/

/** Sponsor/guest speaker contact email. Uses Corporate Outreach Lead email (same as getCorporateOutreachEmail). */
export const getSponsorContactEmail = getCorporateOutreachEmail;

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