import React from 'react';

type RenameModalProps = {
  isOpen: boolean;
  newName: string;
  setNewName: (name: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function RenameModal({
  isOpen,
  newName,
  setNewName,
  onClose,
  onSubmit,
}: RenameModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-96 transform transition-all scale-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Rename Note</h3>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
          >
            Save Name
          </button>
        </div>
      </div>
    </div>
  );
}
