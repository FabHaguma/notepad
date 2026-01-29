'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { Note, OpenNote, MasterConfig } from './types';
import Sidebar from './components/Sidebar';
import NoteTabs from './components/NoteTabs';
import Editor from './components/Editor';
import Dashboard from './components/Dashboard';
import AddCategoryModal from './components/modals/AddCategoryModal';
import RenameModal from './components/modals/RenameModal';

// Parser for the Master Config file
const parseMasterConfig = (content: string): MasterConfig => {
  const lines = content.split('\n');
  const config: MasterConfig = { 
    pinned: [], 
    archived: [], 
    categories: {} 
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
  const [masterConfig, setMasterConfig] = useState<MasterConfig>({ pinned: [], archived: [], categories: {} });
  const [masterNoteId, setMasterNoteId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null); // null = All Notes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const updateMasterConfig = async (newConfig: MasterConfig) => {
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

      const currentNoteName = notes.find(n => n.id === id)?.name || 'Untitled';
      setOpenNotes(prev => [...prev, { id, name: currentNoteName, content: text, isDirty: false }]);
    } catch (error) {
      console.error('Failed to load note', error);
      setContent('Error loading content');
    } finally {
      setIsLoading(false);
    }
  };

  // Used by Dashboard and NoteTabs
  const handleSelectNote = (id: string, newContent: string) => {
     setActiveNoteId(id);
     const note = openNotes.find(n => n.id === id);
     if (note) {
         setActiveNoteName(note.name);
         setContent(newContent);
         setIsViewMode(false);
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

  const handleRenameInConfig = async (oldName: string, configNewName: string) => {
    // Check if any changes are needed
    const isInPinned = masterConfig.pinned.includes(oldName);
    const isInArchived = masterConfig.archived.includes(oldName);
    let isInCategories = false;
    
    // Create new categories object if needed
    const newCategories = { ...masterConfig.categories };
    Object.keys(newCategories).forEach(cat => {
      if (newCategories[cat].includes(oldName)) {
        isInCategories = true;
        newCategories[cat] = newCategories[cat].map(n => n === oldName ? configNewName : n);
      }
    });

    if (!isInPinned && !isInArchived && !isInCategories) return;

    const newConfig = {
      ...masterConfig,
      categories: newCategories
    };

    if (isInPinned) {
      newConfig.pinned = masterConfig.pinned.map(n => n === oldName ? configNewName : n);
    }
    
    if (isInArchived) {
      newConfig.archived = masterConfig.archived.map(n => n === oldName ? configNewName : n);
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
          const finalNewName = activeNoteName.trim();
          await fetch(`/api/notes/${activeNoteId}`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ name: finalNewName }),
          });
          await handleRenameInConfig(currentNote.name, finalNewName);
      }

      await fetch(`/api/notes/${activeNoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      const finalNewName = activeNoteName.trim();
      setOpenNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, isDirty: false, name: finalNewName } : n));
      setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, name: finalNewName, modifiedTime: new Date().toISOString() } : n));

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
      <AddCategoryModal 
        isOpen={isAddingCategory}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        onClose={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
        onSubmit={submitAddCategory}
      />

      <RenameModal
        isOpen={!!renameId}
        newName={newName}
        setNewName={setNewName}
        onClose={() => setRenameId(null)}
        onSubmit={submitRename}
      />

      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        createNote={createNote}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        masterConfig={masterConfig}
        onAddCategory={addCategory}
      />

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

        <NoteTabs 
          openNotes={openNotes}
          activeNoteId={activeNoteId}
          onSelectNote={handleSelectNote}
          onCloseNote={closeNote}
          isSidebarOpen={isSidebarOpen}
        />

        {activeNoteId ? (
          <Editor 
            activeNoteName={activeNoteName}
            setActiveNoteName={setActiveNoteName}
            content={content}
            isLoading={isLoading}
            isSaving={isSaving}
            isViewMode={isViewMode}
            setIsViewMode={setIsViewMode}
            onSave={saveNote}
            onClose={() => setActiveNoteId(null)}
            handleContentChange={handleContentChange}
          />
        ) : (
          <Dashboard 
            processedNotes={processedNotes}
            loadNote={loadNote}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            masterConfig={masterConfig}
            togglePin={togglePin}
            toggleArchive={toggleArchive}
            deleteNote={deleteNote}
            startRename={startRename}
            moveToCategory={moveToCategory}
          />
        )}
      </div>
    </div>
  );
}
