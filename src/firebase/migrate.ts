// This script migrates existing data from constants.ts to Firestore
// Run this once to populate your Firestore database

import { 
  addDoc, 
  collection 
} from 'firebase/firestore';
import { db } from './config';
import { EXEC_BOARD, DESIGN_TEAM, PROJECTS, EVENTS, SPONSORS } from '../constants';

export const migrateDataToFirestore = async () => {
  try {
    console.log('Starting migration...');

    // Migrate Exec Board
    console.log('Migrating Exec Board...');
    for (const member of EXEC_BOARD) {
      const { id, ...memberData } = member;
      await addDoc(collection(db, 'execBoard'), memberData);
    }
    console.log(`✅ Migrated ${EXEC_BOARD.length} Exec Board members`);

    // Migrate Design Team
    console.log('Migrating Design Team...');
    for (const member of DESIGN_TEAM) {
      const { id, ...memberData } = member;
      await addDoc(collection(db, 'designTeam'), memberData);
    }
    console.log(`✅ Migrated ${DESIGN_TEAM.length} Design Team members`);

    // Migrate Projects
    console.log('Migrating Projects...');
    for (const project of PROJECTS) {
      const { id, ...projectData } = project;
      await addDoc(collection(db, 'projects'), projectData);
    }
    console.log(`✅ Migrated ${PROJECTS.length} Projects`);

    // Migrate Events
    console.log('Migrating Events...');
    for (const event of EVENTS) {
      const { id, ...eventData } = event;
      await addDoc(collection(db, 'events'), eventData);
    }
    console.log(`✅ Migrated ${EVENTS.length} Events`);

    // Migrate Sponsors
    console.log('Migrating Sponsors...');
    for (const sponsor of SPONSORS) {
      const { id, ...sponsorData } = sponsor;
      await addDoc(collection(db, 'sponsors'), sponsorData);
    }
    console.log(`✅ Migrated ${SPONSORS.length} Sponsors`);

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};
