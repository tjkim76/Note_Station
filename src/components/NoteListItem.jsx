import React, { useMemo, useCallback } from 'react';
import { Pin, Trash2, RotateCcw } from 'lucide-react';
import { formatDate } from '../utils/utils';

// React.memo를 사용하여 props가 변경되지 않으면 리렌더링 방지 (성능 최적화)
export const NoteListItem = React.memo(function NoteListItem({ note, categories, isSelected, isMultiSelected, onNoteClick, onDoubleClick, onDelete, onDragStart, onDragOver, onDrop, isDragOver, onPin, onContextMenu, onRestore, style, showPinnedDivider }) {
  // 최적화: useNotes에서 미리 계산된 plainText 사용 (정규식 연산 제거)
  const previewText = note.plainText || '내용 없음';
  
  const handleDragStart = useCallback((e) => onDragStart(e, note.id), [onDragStart, note.id]);
  const handleContextMenu = useCallback((e) => onContextMenu(e, note.id), [onContextMenu, note.id]);
  const handleClick = useCallback((e) => onNoteClick(e, note), [onNoteClick, note]);
  const handlePin = useCallback((e) => { e.stopPropagation(); onPin(note.id); }, [onPin, note.id]);
  const handleDelete = useCallback((e) => { e.stopPropagation(); onDelete(note.id); }, [onDelete, note.id]);
  const handleRestore = useCallback((e) => { e.stopPropagation(); onRestore(note.id); }, [onRestore, note.id]);
  const handleDoubleClick = useCallback(() => onDoubleClick(note), [onDoubleClick, note]);
  const handleDragOver = useCallback((e) => onDragOver && onDragOver(e, note.id), [onDragOver, note.id]);
  const handleDrop = useCallback((e) => onDrop && onDrop(e, note.id), [onDrop, note.id]);

  // 카테고리 이름 조회 (메모이제이션)
  const categoryName = useMemo(() => {
    const cat = categories.find(c => c.id === note.categoryId);
    return cat ? cat.name : '개인';
  }, [categories, note.categoryId]);

  return (
    <div
      style={{ ...style, viewTransitionName: `note-${note.id}` }}
      draggable="true"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragStart={handleDragStart}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`group relative p-4 border-b border-gray-50 dark:border-gray-800 cursor-pointer transition-all duration-200 ${
        isSelected ? 'bg-blue-50/60 dark:bg-blue-900/30' : isMultiSelected ? 'bg-slate-100 dark:bg-gray-700' : isDragOver ? 'border-t-2 border-t-blue-500 bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />}
      
      {showPinnedDivider && (
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-gray-100 dark:from-gray-800 to-transparent pointer-events-none z-10 border-t border-gray-200 dark:border-gray-700"></div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold break-words ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>{note.title}</h3>
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-md flex-shrink-0 font-medium">
              {categoryName}
            </span>
          </div>
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {note.tags.map(tag => <span key={tag} className="text-[10px] text-blue-500 dark:text-blue-300">#{tag}</span>)}
            </div>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1 font-light line-clamp-2 break-words">{previewText}</p>
          <p className="text-xs text-gray-400 dark:text-gray-400 mt-2">{formatDate(note.updatedAt)}</p>
        </div>
        <button
          onClick={note.isDeleted ? handleRestore : handlePin}
          className={`p-1.5 rounded-md transition-colors ${
            note.isDeleted 
              ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 opacity-0 group-hover:opacity-100' 
              : note.isPinned 
                ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100'
          }`}
          title={note.isDeleted ? "복구" : (note.isPinned ? "고정 해제" : "상단 고정")}
        >
          {note.isDeleted ? (
            <RotateCcw className="w-4 h-4" />
          ) : (
            <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-current' : ''}`} />
          )}
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors opacity-0 group-hover:opacity-100"
          title={note.isDeleted ? "영구 삭제" : "삭제"}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export const Row = ({ index, style, data }) => {
  const { notes, categories, selectedNoteId, selectedNotesSet, onNoteClick, onDoubleClick, onDragStart, onDragOver, onDrop, dragOverNoteId, onPin, onContextMenu, onDelete, onRestore } = data;
  const note = notes[index];
  const prevNote = notes[index - 1];
  const showPinnedDivider = note && !note.isPinned && prevNote && prevNote.isPinned;

  return (
    <NoteListItem
      style={style}
      key={note.id}
      note={note}
      categories={categories}
      isSelected={selectedNoteId === note.id}
      isMultiSelected={selectedNotesSet.has(note.id)}
      onNoteClick={onNoteClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      isDragOver={dragOverNoteId === note.id}
      onPin={onPin}
      onContextMenu={onContextMenu}
      onDelete={onDelete}
      onRestore={onRestore}
      showPinnedDivider={showPinnedDivider}
    />
  );
};