import React from 'react';
import { OpenNote } from '../types';

type NoteTabsProps = {
  openNotes: OpenNote[];
  activeNoteId: string | null;
  onSelectNote: (id: string, content: string) => void;
  onCloseNote: (e: React.MouseEvent, id: string) => void;
  isSidebarOpen: boolean;
};

export default function NoteTabs({
  openNotes,
  activeNoteId,
  onSelectNote,
  onCloseNote,
  isSidebarOpen,
}: NoteTabsProps) {
  if (openNotes.length === 0) return null;

  return (
    <div className={`flex bg-white border-b border-gray-200 px-2 pt-2 gap-2 overflow-x-auto shrink-0 scrollbar-hide ${!isSidebarOpen ? 'pl-14' : ''}`}>
      {openNotes.map(note => (
        <div 
          key={note.id} 
          onClick={() => onSelectNote(note.id, note.content)}
          className={`group flex items-center gap-2 px-3 py-2 rounded-t-lg text-sm font-medium cursor-pointer border-t border-x border-b-0 transition-all select-none min-w-[100px] max-w-[200px] ${
            activeNoteId === note.id 
              ? 'bg-gray-50 border-gray-300 text-blue-600 border-b-gray-50 relative top-[1px] z-10' 
              : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200 mb-0.5'
          }`}
          title={note.name}
        >
          <span className="truncate flex-1">{note.name.replace('.txt', '')}</span>
          {note.isDirty && <span className="text-orange-500 text-xs">●</span>}
          <button 
            onClick={(e) => onCloseNote(e, note.id)}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-300 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
