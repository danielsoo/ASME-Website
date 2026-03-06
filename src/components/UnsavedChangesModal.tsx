import React from 'react';
import { AlertTriangle } from 'lucide-react';

export type UnsavedAction = 'save-and-leave' | 'discard' | 'cancel';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onAction: (action: UnsavedAction) => void;
  saving?: boolean;
}

/**
 * Modal when there are unsaved changes: choose before leaving
 * - Save and leave / Discard and leave / Continue editing
 */
const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onAction,
  saving = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">You have unsaved changes</h2>
        </div>
        <p className="text-gray-700 mb-6">
          Do you want to save before leaving?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onAction('save-and-leave')}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2.5 rounded font-medium"
          >
            {saving ? 'Saving...' : 'Save and leave'}
          </button>
          <button
            type="button"
            onClick={() => onAction('discard')}
            disabled={saving}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2.5 rounded font-medium disabled:opacity-60"
          >
            Leave without saving
          </button>
          <button
            type="button"
            onClick={() => onAction('cancel')}
            disabled={saving}
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded font-medium disabled:opacity-60"
          >
            Continue editing
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;
