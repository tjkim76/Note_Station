import React, { useState } from 'react';
import { 
  Menu, Calendar, CheckSquare, FolderInput, Trash2, LayoutTemplate, Plus, Search, Trash, FileText
} from 'lucide-react';
import { List } from 'react-window';
import { Row } from './NoteListItem';
import CalendarView from './CalendarView';

function NoteList({
  noteListRef,
  width,
  onResizeStart,
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
  setSearchTerm,
  calendarDate,
  setCalendarDate,
  reorderNote,
  filteredNotes,
  displayNotes,
  listContainerRef,
  listSize,
  itemData,
  isLoading
}) {
  // 드래그 앤 드롭 시 삽입 위치 가이드라인을 위한 상태
  const [dragOverNoteId, setDragOverNoteId] = useState(null);

  // 드래그 시작 시 커스텀 드래그 이미지 설정 및 기존 핸들러 호출
  const handleDragStart = (e, noteId) => {
    // 다중 선택된 상태에서 드래그 시 커스텀 이미지 설정
    if (selectedNotes.size > 1 && selectedNotes.has(noteId)) {
      const dragImage = document.createElement('div');
      dragImage.className = 'bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg font-bold text-sm flex items-center gap-2 absolute top-[-9999px] left-[-9999px] z-50';
      dragImage.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        ${selectedNotes.size}개 이동
      `;
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
    
    // 원래의 onDragStart 핸들러 호출 (App.jsx에서 전달됨)
    if (itemData.onDragStart) {
      itemData.onDragStart(e, noteId);
    }
  };

  const handleDragOver = (e, noteId) => {
    e.preventDefault();
    if (dragOverNoteId !== noteId) {
      setDragOverNoteId(noteId);
    }
  };

  const handleDrop = (e, targetNoteId) => {
    e.preventDefault();
    setDragOverNoteId(null);
    const sourceNoteId = e.dataTransfer.getData('text/plain');
    
    if (sourceNoteId && targetNoteId && Number(sourceNoteId) !== targetNoteId) {
      reorderNote(Number(sourceNoteId), targetNoteId);
    }
  };

  return (
    <div 
      ref={noteListRef}
      className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 z-10 relative transition-colors duration-200"
      style={{ width }}
    >
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-50 opacity-0 hover:opacity-100"
        style={{ right: '-2px' }}
        onMouseDown={onResizeStart}
      />
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

      {showCalendar && (
        <CalendarView 
          notes={filteredNotes} 
          selectedDate={calendarDate} 
          onSelectDate={setCalendarDate} 
        />
      )}

      {/* 노트 목록 (가상화 적용) */}
      <div className="flex-1 overflow-hidden" ref={listContainerRef}>
        {!dbReady || isLoading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : displayNotes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-400 text-sm">
            {searchTerm ? '검색 결과가 없습니다' : showTodo ? '할 일이 있는 노트가 없습니다' : '노트를 만들어보세요'}
          </div>
        ) : (
          <List
            height={listSize.height}
            width={listSize.width}
            rowCount={displayNotes.length}
            rowHeight={130} // 노트 아이템의 대략적인 높이 (px)
            rowProps={{ data: { 
              ...itemData, 
              onDragStart: handleDragStart,
              onDragOver: handleDragOver,
              onDrop: handleDrop,
              dragOverNoteId
            } }}
            rowComponent={Row}
          />
        )}
      </div>
    </div>
  );
}

export default React.memo(NoteList);