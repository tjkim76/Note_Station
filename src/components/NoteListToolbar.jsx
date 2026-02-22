import React from 'react';
import { 
  Menu, Calendar, CheckSquare, FolderInput, Trash2, LayoutTemplate, Plus, Search, Trash, FileText
} from 'lucide-react';

function NoteListToolbar({
  isSidebarOpen,
  toggleSidebar,
  showCalendar,
  setShowCalendar,
  showTodo,
  setShowTodo,
  selectedNotes,
  selectedCategory,
  setContextMenu,
  deleteMultipleNotes,
  setModals,
  dbReady,
  createNewNote,
  emptyTrash,
  searchTerm,
  setSearchTerm
}) {
  return (
    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        {!isSidebarOpen && (
          <button onClick={toggleSidebar} className="mr-2 p-1.5 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors" title="사이드바 펼치기">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <button 
          onClick={() => setShowCalendar(!showCalendar)} 
          className={`mr-2 p-1.5 rounded-md transition-colors ${showCalendar ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          title="캘린더 뷰"
        >
          <Calendar className="w-5 h-5" />
        </button>
        <button 
          onClick={() => { setShowTodo(!showTodo); if (!showTodo) setShowCalendar(false); }} 
          className={`mr-2 p-1.5 rounded-md transition-colors ${showTodo ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          title="할 일(To-Do)만 보기"
        >
          <CheckSquare className="w-5 h-5" />
        </button>
        {selectedNotes.size > 1 ? (
          <>
            <h1 className="text-xl font-bold text-blue-600">
              {selectedNotes.size}개 선택됨
            </h1>
            <div className="flex gap-2">
              {selectedCategory !== 'trash' && <button onClick={(e) => setContextMenu({ visible: true, x: e.clientX, y: e.clientY + 20, noteId: null })} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors" title="선택한 노트 이동">
                <FolderInput className="w-5 h-5" />
              </button>}
              <button onClick={deleteMultipleNotes} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors" title="선택한 노트 모두 삭제">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              {selectedCategory === 'trash' ? <Trash className="w-5 h-5 text-red-500" /> : <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
              {selectedCategory === 'trash' ? '휴지통' : '노트 목록'}
            </h1>
            <div className="flex gap-2">
          {selectedCategory !== 'trash' ? (<><button 
            onClick={() => setModals(prev => ({ ...prev, template: true }))}
            disabled={!dbReady}
            className={`p-1.5 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors ${!dbReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="템플릿 목록"
          >
            <LayoutTemplate className="w-5 h-5" />
          </button>
          <button
            onClick={createNewNote}
            disabled={!dbReady}
            className={`p-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm ${!dbReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="새 노트 만들기"
          >
            <Plus className="w-5 h-5" />
          </button></>) : (
            <button
              onClick={emptyTrash}
              disabled={!dbReady}
              className={`px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-xs font-bold ${!dbReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              휴지통 비우기
            </button>
          )}
            </div>
          </>
        )}
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="노트 검색..."
          value={searchTerm}
          disabled={!dbReady}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 dark:text-white border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all disabled:opacity-50"
        />
      </div>
    </div>
  );
}

export default React.memo(NoteListToolbar);