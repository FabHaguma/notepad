import React from 'react';
import { Note, MasterConfig } from '../types';

type DashboardProps = {
  processedNotes: Note[];
  loadNote: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: 'name' | 'modifiedTime';
  setSortBy: (sortBy: 'name' | 'modifiedTime') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: React.SetStateAction<'asc' | 'desc'>) => void;
  masterConfig: MasterConfig;
  togglePin: (noteName: string, e: React.MouseEvent) => void;
  toggleArchive: (noteName: string, e: React.MouseEvent) => void;
  deleteNote: (id: string, e: React.MouseEvent) => void;
  startRename: (note: Note, e: React.MouseEvent) => void;
  moveToCategory: (noteName: string, categoryName: string | null, e?: React.MouseEvent) => void;
};

export default function Dashboard({
  processedNotes,
  loadNote,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  masterConfig,
  togglePin,
  toggleArchive,
  deleteNote,
  startRename,
  moveToCategory,
}: DashboardProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Dashboard Header */}
      <div className="p-8 pb-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">My Notes</h2>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          
          {/* Search Bar */}
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'modifiedTime')}
                className="p-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-gray-50 flex-1 md:flex-none"
              >
                <option value="modifiedTime">📅 Date Modified</option>
                <option value="name">Aa Name</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 bg-white transition-colors"
                title={sortOrder === 'asc' ? "Ascending" : "Descending"}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto p-8 pt-2">
        {processedNotes.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <span className="text-4xl mb-4 opacity-50">🦕</span>
              <p>No notes found matching your criteria.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {processedNotes.map(note => {
               const isPinned = masterConfig.pinned.includes(note.name);
               const isArchived = masterConfig.archived.includes(note.name);
               
               return (
                  <div 
                    key={note.id}
                    onClick={() => loadNote(note.id)}
                    className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 cursor-pointer group flex flex-col h-48 relative overflow-hidden ${isPinned ? 'ring-1 ring-blue-200 bg-blue-50/10' : ''}`}
                  >
                     {/* Card Actions (Hover) */}
                     <div className="absolute top-2 right-2 flex gap-1 transform translate-x-12 group-hover:translate-x-0 transition-transform duration-200 z-10">
                        <button onClick={(e) => togglePin(note.name, e)} className="p-1.5 bg-white/90 shadow text-xs rounded-full hover:bg-blue-100 text-gray-500" title={isPinned ? 'Unpin' : 'Pin'}>{isPinned ? '📌' : '📍'}</button>
                        <button onClick={(e) => startRename(note, e)} className="p-1.5 bg-white/90 shadow text-xs rounded-full hover:bg-blue-100 text-gray-500" title="Rename">✏️</button>
                        <button onClick={(e) => deleteNote(note.id, e)} className="p-1.5 bg-white/90 shadow text-xs rounded-full hover:bg-red-100 text-gray-500" title="Delete">🗑️</button>
                     </div>

                     <div className="p-5 flex-1">
                        <h3 className="font-semibold text-gray-800 line-clamp-2 mb-2 leading-tight" title={note.name}>
                          {note.name.replace('.txt','')}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium mb-4">{new Date(note.modifiedTime).toLocaleDateString()}</p>
                        
                        {/* Visual Badges */}
                        <div className="flex flex-wrap gap-2 mt-auto items-center">
                           {isPinned && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Pinned</span>}
                           {isArchived && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Archived</span>}

                           <div onClick={e => e.stopPropagation()}>
                               <select
                                  value={Object.keys(masterConfig.categories).find(cat => masterConfig.categories[cat].includes(note.name)) || ''}
                                  onChange={(e) => moveToCategory(note.name, e.target.value || null)}
                                  className={`max-w-[120px] text-xs border rounded px-1 py-0.5 focus:outline-none cursor-pointer appearance-none truncate ${
                                      Object.keys(masterConfig.categories).find(cat => masterConfig.categories[cat].includes(note.name)) 
                                      ? 'bg-purple-100 text-purple-800 border-purple-200 font-medium' 
                                      : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-50 hover:border-gray-200'
                                  }`}
                                  title="Move to category"
                               >
                                  <option value="">+ Category</option>
                                  {Object.keys(masterConfig.categories).map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                  ))}
                               </select>
                           </div>
                        </div>
                     </div>
                     
                     {/* Decorative bottom bar */}
                     <div className={`h-1.5 w-full ${isPinned ? 'bg-blue-500' : isArchived ? 'bg-gray-300' : 'bg-gray-100 group-hover:bg-blue-400 transition-colors'}`} />
                  </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
