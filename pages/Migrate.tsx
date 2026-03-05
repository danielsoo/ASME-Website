// Temporary page to migrate data from constants.ts to Firestore
// Visit /migrate once to populate your database
// After migration, you can delete this file

import React, { useState } from 'react';
import { migrateDataToFirestore } from '../src/firebase/migrate';

const Migrate: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleMigrate = async () => {
    if (!confirm('Do you want to migrate existing data to Firestore?')) {
      return;
    }

    setLoading(true);
    setStatus('Migration starting...');

    try {
      await migrateDataToFirestore();
      setStatus('✅ Migration complete! Check the data in Firebase Console.');
    } catch (error) {
      setStatus(`❌ Error occurred: ${error}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f131a] text-white p-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Data Migration</h1>
        <p className="mb-4 text-gray-300">
          This page migrates data from constants.ts to Firestore.
          You only need to run this once.
        </p>
        <button
          onClick={handleMigrate}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded disabled:opacity-50"
        >
          {loading ? 'Migrating...' : 'Start Migration'}
        </button>
        {status && (
          <div className="mt-4 p-4 bg-gray-800 rounded">
            <p>{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Migrate;
