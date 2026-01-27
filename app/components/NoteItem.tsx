import React from 'react';

type Note = {
  id: string;
  name: string;
  modifiedTime: string;
};

// Extracted NoteItem component for cleaner render logic
export default function NoteItem({ 
  note, isActive, isPinned, isArchived, onClick, onPin, onArchive, onDelete, startRename 
}: { 
  note: Note; 
  isActive: boolean; 
  isPinned: boolean; 
  isArchived: boolean;
  onClick: () => void;
  onPin: (e: React.MouseEvent) => void;
  onArchive: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  startRename: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-md transition-all duration-200 group relative ${
        isActive 
          ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
          : 'hover:bg-gray-50 text-gray-700'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="font-medium truncate pr-2 flex-1 flex items-center gap-1" title={note.name}>
          {note.name.replace('.txt','')}
        </div>
        
        {/* Action Buttons */}
        <div className={`flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}>
           <div
            onClick={onPin}
            className={`p-1 rounded cursor-pointer ${isPinned ? 'text-blue-500 hover:bg-blue-100' : 'text-gray-400 hover:bg-gray-100'}`}
            title={isPinned ? "Unpin" : "Pin"}
          >
            📌
          </div>
          <div
            onClick={onArchive}
            className={`p-1 rounded cursor-pointer ${isArchived ? 'text-orange-500 hover:bg-orange-100' : 'text-gray-400 hover:bg-gray-100'}`}
            title={isArchived ? "Unarchive" : "Archive"}
          >
            📦
          </div>
          <div
            onClick={startRename}
            className="p-1 hover:bg-blue-200 text-gray-400 hover:text-blue-600 rounded cursor-pointer"
            title="Rename"
          >
            ✏️
          </div>
          {!isPinned && (
            <div
              onClick={onDelete}
              className="p-1 hover:bg-red-200 text-gray-400 hover:text-red-600 rounded cursor-pointer"
              title="Delete"
            >
              🗑️
            </div>
          )}
        </div>
      </div>
      <div className={`text-xs mt-1 transition-colors ${
        isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-500'
      }`}>
        {new Date(note.modifiedTime).toLocaleDateString()}
      </div>
    </button>
  );
}
