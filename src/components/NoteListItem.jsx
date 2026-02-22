import React, { useMemo, useCallback, useRef, useLayoutEffect, useEffect } from 'react';
import { Pin, Trash2, RotateCcw } from 'lucide-react';
import { formatDate } from '../utils/utils';

function arePropsEqual(prevProps, nextProps) {
  // 1. Style check (virtualization position)
  // react-window는 스크롤 시마다 새로운 style 객체를 생성하므로 내부 값 비교가 필요합니다.
  if (prevProps.style !== nextProps.style) {
    if (
      prevProps.style.top !== nextProps.style.top ||
      prevProps.style.left !== nextProps.style.left ||
      prevProps.style.width !== nextProps.style.width ||
      prevProps.style.height !== nextProps.style.height
    ) {
      return false;
    }
  }

  // 2. Selection & Visual state
  if (
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.isMultiSelected !== nextProps.isMultiSelected ||
    prevProps.isDragOver !== nextProps.isDragOver ||
    prevProps.showPinnedDivider !== nextProps.showPinnedDivider
  ) {
    return false;
  }

  // 3. Note content check
  const prevNote = prevProps.note;
  const nextNote = nextProps.note;

  if (prevNote !== nextNote) {
    if (
      prevNote.id !== nextNote.id ||
      prevNote.title !== nextNote.title ||
      prevNote.plainText !== nextNote.plainText ||
      prevNote.updatedAt !== nextNote.updatedAt ||
      prevNote.isPinned !== nextNote.isPinned ||
      prevNote.isDeleted !== nextNote.isDeleted ||
      prevNote.categoryId !== nextNote.categoryId ||
      prevNote.content !== nextNote.content ||
      // 태그 배열 내용 비교 (참조가 달라도 내용이 같으면 리렌더링 방지)
      (prevNote.tags !== nextNote.tags && 
       (!prevNote.tags || !nextNote.tags || 
        prevNote.tags.length !== nextNote.tags.length || 
        !prevNote.tags.every((tag, i) => tag === nextNote.tags[i])))
    ) {
      return false;
    }
  }

  // 4. Category name check
  if (prevProps.categoryName !== nextProps.categoryName) {
    return false;
  }

  return true;
}

// React.memo를 사용하여 props가 변경되지 않으면 리렌더링 방지 (성능 최적화)
export const NoteListItem = React.memo(function NoteListItem({ note, categoryName, isSelected, isMultiSelected, onNoteClick, onDoubleClick, onDelete, onDragStart, onDragOver, onDrop, isDragOver, onPin, onContextMenu, onRestore, style, showPinnedDivider }) {
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
}, arePropsEqual);

export const Row = ({ index, style, data }) => {
  const { notes, categories, selectedNoteId, selectedNotesSet, onNoteClick, onDoubleClick, onDragStart, onDragOver, onDrop, dragOverNoteId, onPin, onContextMenu, onDelete, onRestore, setSize, resizeObserver } = data;
  const note = notes[index];
  const prevNote = notes[index - 1];
  const showPinnedDivider = note && !note.isPinned && prevNote && prevNote.isPinned;
  const categoryName = categories.find(c => c.id === note.categoryId)?.name || '개인';
  
  const rowRef = useRef(null);

  // 1. 초기 렌더링 시 높이 측정 (동기적 처리로 깜빡임 방지)
  useLayoutEffect(() => {
    if (rowRef.current) {
      setSize(index, rowRef.current.getBoundingClientRect().height);
    }
  }, [setSize, index, note, showPinnedDivider, categories]); // 내용이 변경될 때마다 재측정

  // 2. 콘텐츠 크기 변화 감지 (공유 ResizeObserver 사용)
  useEffect(() => {
    const element = rowRef.current;
    if (!element || !resizeObserver) return;

    resizeObserver.observe(element);
    return () => resizeObserver.unobserve(element);
  }, [resizeObserver, index]);

  return (
    <div style={style}>
      <div ref={rowRef} data-index={index}>
        <NoteListItem
          note={note}
          categoryName={categoryName}
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
      </div>
    </div>
  );
};