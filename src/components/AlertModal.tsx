import React from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  confirmText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  confirmText = 'OK',
}) => {
  if (!isOpen) return null;

  const iconConfig = {
    success: { icon: CheckCircle, color: 'bg-green-100', iconColor: 'text-green-600' },
    error: { icon: XCircle, color: 'bg-red-100', iconColor: 'text-red-600' },
    warning: { icon: AlertCircle, color: 'bg-yellow-100', iconColor: 'text-yellow-600' },
    info: { icon: Info, color: 'bg-blue-100', iconColor: 'text-blue-600' },
  };

  const config = iconConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex-shrink-0 w-12 h-12 ${config.color} rounded-full flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 whitespace-pre-line">{message}</p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded text-white font-medium ${
              type === 'success'
                ? 'bg-green-600 hover:bg-green-700'
                : type === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'warning'
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
