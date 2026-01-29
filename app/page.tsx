'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import NoteItem from './components/NoteItem';

type Note = {
  id: string;
  name: string;
  modifiedTime: string;
};

type OpenNote = {
  id: string;
  name: string;
  content: string;
  isDirty: boolean;
};

// Parser for the Master Config file
const parseMasterConfig = (content: string) => {
  const lines = content.split('\n');
  const config = { 
    pinned: [] as string[], 
    archived: [] as string[], 
    categories: {} as Record<string, string[]> 
  };
  let currentSection = '';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    if (trimmed === '[PINNED]') currentSection = 'pinned';
    else if (trimmed === '[ARCHIVED]') currentSection = 'archived';
    else if (trimmed.startsWith('[CATEGORY:')) {
      const catName = trimmed.substring(10, trimmed.length - 1);
      currentSection = `cat:${catName}`;
      if (!config.categories[catName]) config.categories[catName] = [];
    } else if (currentSection) {
      if (currentSection === 'pinned') config.pinned.push(trimmed);
      else if (currentSection === 'archived') config.archived.push(trimmed);
      else if (currentSection.startsWith('cat:')) {
        const catName = currentSection.substring(4);
        if (!config.categories[catName]) config.categories[catName] = [];
        config.categories[catName].push(trimmed);
      }
    }
  });
  return config;
};

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [openNotes, setOpenNotes] = useState<OpenNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNoteName, setActiveNoteName] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isViewMode, setIsViewMode] = useState(false);
  
  // Master Config State
  const [masterConfig, setMasterConfig] = useState<{ 
    pinned: string[], 
    archived: string[], 
    categories: Record<string, string[]> 
  }>({ pinned: [], archived: [], categories: {} });
  const [masterNoteId, setMasterNoteId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null); // null = All Notes
  const [showArchived, setShowArchived] = useState(false);

  
  // Rename Modal State
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  // Add Category Modal State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Dashboard State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'modifiedTime'>('modifiedTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createMasterNote = async () => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: '_SYSTEM_MASTER.txt', 
          content: '[PINNED]\n\n[ARCHIVED]\n' 
        }),
      });
      const data = await res.json();
      setMasterNoteId(data.id);
    } catch (e) {
      console.error("Could not create master note", e);
    }
  };

  const updateMasterConfig = async (newConfig: typeof masterConfig) => {
    if (!masterNoteId) return;

    let textContent = `[PINNED]\n${newConfig.pinned.join('\n')}\n\n[ARCHIVED]\n${newConfig.archived.join('\n')}`;

    Object.entries(newConfig.categories).forEach(([name, noteList]) => {
      textContent += `\n\n[CATEGORY:${name}]\n${noteList.join('\n')}`;
    });

    setMasterConfig(newConfig); // Optimistic

    await fetch(`/api/notes/${masterNoteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: textContent }),
    });
  };

  const addCategory = () => {
    setIsAddingCategory(true);
    setNewCategoryName('');
  };

  const submitAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (masterConfig.categories[name]) {
      alert("Category already exists");
      return;
    }
    const newConfig = {
      ...masterConfig,
      categories: { ...masterConfig.categories, [name]: [] }
    };
    await updateMasterConfig(newConfig);
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const moveToCategory = async (noteName: string, categoryName: string | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const newCategories = { ...masterConfig.categories };
    
    // Remove from all other categories first
    Object.keys(newCategories).forEach(cat => {
      newCategories[cat] = newCategories[cat].filter(n => n !== noteName);
    });

    // Add to new category if specified
    if (categoryName && newCategories[categoryName]) {
      newCategories[categoryName] = [...newCategories[categoryName], noteName];
    }

    await updateMasterConfig({
      ...masterConfig,
      categories: newCategories
    });
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      if (Array.isArray(data)) {
        // Separate duplicate log showing user isn't seeing _SYSTEM_MASTER
        const master = data.find((n: Note) => n.name === '_SYSTEM_MASTER.txt');
        const regularNotes = data.filter((n: Note) => n.name !== '_SYSTEM_MASTER.txt');
        
        setNotes(regularNotes);

        if (master) {
          setMasterNoteId(master.id);
          const masterRes = await fetch(`/api/notes/${master.id}`);
          const masterContent = await masterRes.text();
          setMasterConfig(parseMasterConfig(masterContent));
        } else {
          await createMasterNote();
        }
      }
    } catch (error) {
      console.error('Failed to fetch notes', error);
    }
  };

  const loadNote = async (id: string) => {
    // Check if already open
    const existing = openNotes.find(n => n.id === id);
    if (existing) {
        setActiveNoteId(id);
        setActiveNoteName(existing.name);
        setIsViewMode(false);
        setContent(existing.content);
        return;
    }

    const noteName = notes.find(n => n.id === id)?.name || 'Untitled';
    setActiveNoteId(id);
    setActiveNoteName(noteName);
    setIsViewMode(false);
    setIsLoading(true);
    // Optimistic content clear
    setContent('');
    
    try {
      const res = await fetch(`/api/notes/${id}`);
      const text = await res.text();
      setContent(text);

      const noteName = notes.find(n => n.id === id)?.name || 'Untitled';
      setOpenNotes(prev => [...prev, { id, name: noteName, content: text, isDirty: false }]);
    } catch (error) {
      console.error('Failed to load note', error);
      setContent('Error loading content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (activeNoteId) {
      setOpenNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: newContent, isDirty: true } : n));
    }
  };

  const closeNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newOpen = openNotes.filter(n => n.id !== id);
    setOpenNotes(newOpen);
    if (activeNoteId === id) {
      // If closing active note, switch to another or dashboard
      if (newOpen.length > 0) {
        const next = newOpen[newOpen.length - 1]; // Go to last one
        setActiveNoteId(next.id);
        setActiveNoteName(next.name);
        setContent(next.content);
      } else {
        setActiveNoteId(null);
        setActiveNoteName('');
        setContent('');
      }
    }
  };

  const handleRenameInConfig = async (oldName: string, newName: string) => {
    // Check if any changes are needed
    const isInPinned = masterConfig.pinned.includes(oldName);
    const isInArchived = masterConfig.archived.includes(oldName);
    let isInCategories = false;
    
    // Create new categories object if needed
    const newCategories = { ...masterConfig.categories };
    Object.keys(newCategories).forEach(cat => {
      if (newCategories[cat].includes(oldName)) {
        isInCategories = true;
        newCategories[cat] = newCategories[cat].map(n => n === oldName ? newName : n);
      }
    });

    if (!isInPinned && !isInArchived && !isInCategories) return;

    const newConfig = {
      ...masterConfig,
      categories: newCategories
    };

    if (isInPinned) {
      newConfig.pinned = masterConfig.pinned.map(n => n === oldName ? newName : n);
    }
    
    if (isInArchived) {
      newConfig.archived = masterConfig.archived.map(n => n === oldName ? newName : n);
    }

    await updateMasterConfig(newConfig);
  };

  const saveNote = async () => {
    if (!activeNoteId) return;
    setIsSaving(true);
    try {
      // Check for rename
      const currentNote = notes.find(n => n.id === activeNoteId);
      if (currentNote && activeNoteName.trim() !== currentNote.name) {
          const newName = activeNoteName.trim();
          await fetch(`/api/notes/${activeNoteId}`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ name: newName }),
          });
          await handleRenameInConfig(currentNote.name, newName);
      }

      await fetch(`/api/notes/${activeNoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      const newName = activeNoteName.trim();
      setOpenNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, isDirty: false, name: newName } : n));
      setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, name: newName, modifiedTime: new Date().toISOString() } : n));

      // Optionally refresh the list to update modified timestamps
      fetchNotes();
    } catch (error) {
      console.error('Failed to save', error);
      alert('Failed to save note');
    } finally {
      setIsSaving(false);
    }

  };

  const createNote = async (extension: 'txt' | 'md' = 'txt') => {
    // Generate name based on Date Time: Note_YYYY-MM-DD_HH-mm-ss.txt
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const name = `Note_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.${extension}`;

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content: '' }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create');
      }
      
      const newNote = await res.json();
      setNotes([newNote, ...notes]);
      
      setOpenNotes(prev => [...prev, { id: newNote.id, name: newNote.name, content: '', isDirty: false }]);
      setActiveNoteId(newNote.id);
      setActiveNoteName(newNote.name);
      setContent('');
    } catch (error) {
      console.error('Failed to create note', error);
      alert('Failed to create note');
    }
  };
  
  const togglePin = async (noteName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isPinned = masterConfig.pinned.includes(noteName);
    const newPinned = isPinned 
      ? masterConfig.pinned.filter(n => n !== noteName) 
      : [...masterConfig.pinned, noteName];
    
    await updateMasterConfig({ ...masterConfig, pinned: newPinned });
  };

  const toggleArchive = async (noteName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isArchived = masterConfig.archived.includes(noteName);
    const newArchived = isArchived
      ? masterConfig.archived.filter(n => n !== noteName)
      : [...masterConfig.archived, noteName];

    await updateMasterConfig({ ...masterConfig, archived: newArchived });
  };


  // Dashboard Logic
  const getProcessedNotes = () => {
    const filtered = notes.filter(n => {
       // Hide Master Note
       if (n.name === '_SYSTEM_MASTER.txt') return false;
       
       // Filter by Search
       if (searchQuery) {
          return n.name.toLowerCase().includes(searchQuery.toLowerCase());
       }
       
       // Filter by Category
       if (activeCategory === 'pinned') {
          return masterConfig.pinned.includes(n.name) && !masterConfig.archived.includes(n.name);
       }
       if (activeCategory === 'archived') {
          return masterConfig.archived.includes(n.name);
       }
       if (activeCategory && masterConfig.categories[activeCategory]) {
          return masterConfig.categories[activeCategory].includes(n.name) && !masterConfig.archived.includes(n.name);
       }

       // Default (All Notes): Show non-archived
       if (masterConfig.archived.includes(n.name)) return false;
       
       return true;
    });

    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  };

  const processedNotes = getProcessedNotes();

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the note when clicking delete
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter((n) => n.id !== id));
      setOpenNotes(prev => prev.filter(n => n.id !== id));
      if (activeNoteId === id) {
        setActiveNoteId(null);
        setContent('');
      }
    } catch (error) {
      console.error('Failed to delete note', error);
      alert('Failed to delete note');
    }
  };

  const startRename = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameId(note.id);
    setNewName(note.name);
  };

  const submitRename = async () => {
    if (!renameId || !newName.trim()) return;
    
    // Ensure .txt extension if missing (optional but good practice)
    let finalName = newName.trim();
    // Allow .txt or .md. If neither, append .txt
    const lower = finalName.toLowerCase();
    if (!lower.endsWith('.txt') && !lower.endsWith('.md')) {
      finalName += '.txt';
    }

    try {
      const currentNote = notes.find(n => n.id === renameId);
      const res = await fetch(`/api/notes/${renameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: finalName }),
      });

      if (!res.ok) throw new Error('Failed to rename');

      if (currentNote) {
         await handleRenameInConfig(currentNote.name, finalName);
      }

      setNotes(notes.map(n => n.id === renameId ? { ...n, name: finalName } : n));
      setOpenNotes(prev => prev.map(n => n.id === renameId ? { ...n, name: finalName } : n));
      setRenameId(null);
      setNewName('');
    } catch (error) {
      console.error(error);
      alert('Failed to rename note');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 relative">
      {/* Add Category Modal */}
      {isAddingCategory && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 transform transition-all scale-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">New Category</h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
              placeholder="e.g. Work, Ideas"
              onKeyDown={(e) => e.key === 'Enter' && submitAddCategory()}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitAddCategory}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 transform transition-all scale-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Rename Note</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submitRename()}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRenameId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitRename}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'} bg-white border-r border-gray-200 flex flex-col shadow-sm z-10 transition-all duration-300 overflow-hidden whitespace-nowrap`}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Image src="/notes.png" alt="App Logo" width={32} height={32} className="object-contain" /> Fab Notepad
            </h1>
            <button 
              onClick={() => setIsSidebarOpen(false)}
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
                  onClick={addCategory} 
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
        {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="absolute top-2 left-2 z-50 p-2 bg-white text-gray-500 hover:text-blue-600 shadow-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
              title="Expand Sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            </button>
        )}

        {/* Open Notes Tabs */}
        {openNotes.length > 0 && (
          <div className={`flex bg-white border-b border-gray-200 px-2 pt-2 gap-2 overflow-x-auto shrink-0 scrollbar-hide ${!isSidebarOpen ? 'pl-14' : ''}`}>
            {openNotes.map(note => (
              <div 
                key={note.id} 
                onClick={() => { setActiveNoteId(note.id); setContent(note.content); }}
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
                  onClick={(e) => closeNote(e, note.id)}
                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-300 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {activeNoteId ? (
          <>
            <div className="h-16 px-8 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveNoteId(null)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                  title="Back to Dashboard"
                >
                  ←
                </button>
                <div className="flex flex-col">
                  <input
                    type="text"
                    value={activeNoteName}
                    onChange={(e) => setActiveNoteName(e.target.value)}
                    className="font-semibold text-gray-800 text-lg bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none transition-colors w-full min-w-[200px]"
                    placeholder="Note Title" 
                  />
                  <span className="text-xs text-gray-400 px-1">
                    {isSaving ? 'Saving changes...' : 'Ready to edit'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {activeNoteName.toLowerCase().endsWith('.md') && (
                  <button
                    onClick={() => setIsViewMode(!isViewMode)}
                    className={`flex items-center gap-2 font-medium px-4 py-2 rounded-lg transition-all ${
                      isViewMode 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {isViewMode ? '✎ Edit' : '👁 Preview'}
                  </button>
                )}
                <button
                  onClick={saveNote}
                  disabled={isSaving || isLoading}
                  className={`flex items-center gap-2 font-medium px-6 py-2 rounded-lg transition-all ${
                    isSaving 
                      ? 'bg-green-100 text-green-700 cursor-wait' 
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow active:scale-95'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>💾 Save Content</>
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 p-8 overflow-hidden relative">
              {isViewMode ? (
                <div className="w-full h-full p-8 bg-white rounded-xl shadow-sm overflow-y-auto prose prose-slate max-w-none border border-gray-100">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              ) : (
                <textarea
                  className="w-full h-full p-8 bg-white rounded-xl shadow-sm hover:shadow-md focus:shadow-md transition-shadow outline-none resize-none text-gray-800 leading-relaxed text-[11pt] border border-gray-100 font-[Consolas,monospace]"
                  placeholder="Start typing your thoughts..."
                  value={isLoading ? '' : content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  disabled={isLoading}
                />
              )}
              {isLoading && (
                 <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                   <div className="flex flex-col items-center gap-3 text-gray-500">
                     <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <span>Loading note content...</span>
                   </div>
                 </div>
              )}
            </div>
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}
