import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const buttonColor = type === 'danger' 
    ? 'bg-red-600 hover:bg-red-700' 
    : type === 'warning'
    ? 'bg-yellow-600 hover:bg-yellow-700'
    : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex-shrink-0 w-12 h-12 ${
            type === 'danger' ? 'bg-red-100' : type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
          } rounded-full flex items-center justify-center`}>
            <AlertTriangle className={`w-6 h-6 ${
              type === 'danger' ? 'text-red-600' : type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
            }`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 whitespace-pre-line">{message}</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 ${buttonColor} text-white px-4 py-2 rounded font-medium`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
