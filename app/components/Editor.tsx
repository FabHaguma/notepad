import React from 'react';
import ReactMarkdown from 'react-markdown';

type EditorProps = {
  activeNoteName: string;
  setActiveNoteName: (name: string) => void;
  content: string;
  isLoading: boolean;
  isSaving: boolean;
  isViewMode: boolean;
  setIsViewMode: (mode: boolean) => void;
  onSave: () => void;
  onClose: () => void;
  handleContentChange: (newContent: string) => void;
};

export default function Editor({
  activeNoteName,
  setActiveNoteName,
  content,
  isLoading,
  isSaving,
  isViewMode,
  setIsViewMode,
  onSave,
  onClose,
  handleContentChange,
}: EditorProps) {
  return (
    <>
      <div className="h-16 px-8 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
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
            onClick={onSave}
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
  );
}
