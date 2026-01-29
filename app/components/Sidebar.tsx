import React from 'react';
import Image from 'next/image';
import { MasterConfig } from '../types';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  createNote: (extension: 'txt' | 'md') => void;
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
  masterConfig: MasterConfig;
  onAddCategory: () => void;
};

export default function Sidebar({
  isOpen,
  onClose,
  createNote,
  activeCategory,
  setActiveCategory,
  masterConfig,
  onAddCategory,
}: SidebarProps) {
  return (
    <div className={`${isOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'} bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 transition-all duration-300 overflow-hidden whitespace-nowrap`}>
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Image src="/notes.png" alt="App Logo" width={32} height={32} className="object-contain" /> Fab Notepad
          </h1>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close Sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => createNote('txt')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-2 rounded-lg transition shadow-sm flex items-center justify-center gap-1 text-sm"
            title="Create Text Note"
          >
            <span>+</span> Text Note
          </button>
          <button
            onClick={() => createNote('md')}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-2 rounded-lg transition shadow-sm flex items-center justify-center gap-1 text-sm"
            title="Create Markdown Note"
          >
            <span>+</span> MD Note
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Library</h3>
          
          <button
              onClick={() => setActiveCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${!activeCategory ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
              <span>📚</span> All Notes
          </button>
          <button
              onClick={() => setActiveCategory('pinned')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${activeCategory === 'pinned' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
              <span>📌</span> Pinned
          </button>
          <button
              onClick={() => setActiveCategory('archived')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${activeCategory === 'archived' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
              <span>📦</span> Archived
          </button>

          <div className="mt-6 mb-2 px-2 flex justify-between items-center group">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Categories</h3>
              <button 
                onClick={onAddCategory} 
                className="bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 rounded p-1 w-6 h-6 flex items-center justify-center transition-colors" 
                title="Add New Category"
              >
                +
              </button>
          </div>
          
          <div className="space-y-1">
              {Object.keys(masterConfig.categories).map(cat => (
                  <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${activeCategory === cat ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                      <span>🏷️</span> {cat}
                      <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{masterConfig.categories[cat].length}</span>
                  </button>
              ))}
              {Object.keys(masterConfig.categories).length === 0 && (
                  <div className="text-sm text-gray-400 px-3 py-2 italic">No categories created.</div>
              )}
          </div>
      </div>
    </div>
  );
}
