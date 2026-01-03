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
  // Use single orderBy to avoid requiring composite index
  // Client-side sorting will handle multiple criteria
  const snapshot = await getDocs(query(projectsRef, orderBy('status')));
  const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  
  // Client-side sorting: status first (current before past), then by title
  return projects.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'current' ? -1 : 1;
    }
    return (a.title || '').localeCompare(b.title || '');
  });
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
