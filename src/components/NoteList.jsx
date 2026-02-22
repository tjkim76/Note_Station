import { memo, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import { Row } from './NoteListItem';
import CalendarView from './CalendarView';
import NoteListToolbar from './NoteListToolbar.jsx';
import { useNoteDragDrop } from '../hooks/useNoteDragDrop';

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
  itemData,
  isLoading
}) {
  const { dragOverNoteId, handleDragStart, handleDragOver, handleDrop } = useNoteDragDrop({
    selectedNotes,
    itemData,
    reorderNote
  });

  // 리스트 크기 자동 감지
  const listContainerRef = useRef(null);
  const [listSize, setListSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!listContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setListSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(listContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // 동적 높이 관리를 위한 상태
  const sizeMap = useRef({});
  const setSize = useCallback((index, size) => {
    // 높이가 변경되었을 때만 업데이트
    if (sizeMap.current[index] !== size) {
      sizeMap.current[index] = size;
      if (listRef.current) {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, []);

  const getItemSize = useCallback((index) => {
    return sizeMap.current[index] || 130; // 기본 높이 130px
  }, []);

  // 성능 최적화: 단일 ResizeObserver로 모든 Row 관리 (배치 처리로 리렌더링 최소화)
  const resizeObserver = useMemo(() => {
    if (typeof ResizeObserver === 'undefined') return null;
    return new ResizeObserver((entries) => {
      let minIndex = Infinity;
      let hasChanges = false;

      for (const entry of entries) {
        if (entry.target.dataset.index) {
          const index = parseInt(entry.target.dataset.index, 10);
          const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
          
          if (sizeMap.current[index] !== height) {
            sizeMap.current[index] = height;
            if (index < minIndex) minIndex = index;
            hasChanges = true;
          }
        }
      }

      if (hasChanges && listRef.current) {
        listRef.current.resetAfterIndex(minIndex);
      }
    });
  }, []);

  useEffect(() => {
    return () => resizeObserver?.disconnect();
  }, [resizeObserver]);

  // react-window 성능 최적화를 위한 itemKey 함수
  // 인덱스가 아닌 노트의 고유 ID를 키로 사용하여 불필요한 리렌더링 방지
  const itemKey = useCallback((index, data) => {
    const item = data.notes[index];
    return item ? item.id : index;
  }, []);

  // 리스트 너비가 변경되면 높이 재계산 필요 (텍스트 줄바꿈 등)
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [listSize.width]);

  // 렌더링 시마다 새로운 객체가 생성되지 않도록 메모이제이션
  const mergedItemData = useMemo(() => ({
    ...itemData,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    dragOverNoteId,
    setSize, // 초기 렌더링용 (useLayoutEffect)
    resizeObserver // 동적 변화 감지용
  }), [itemData, handleDragStart, handleDragOver, handleDrop, dragOverNoteId, setSize, resizeObserver]);

  // --- 스크롤 위치 저장 및 복원 로직 ---
  const listRef = useRef(null);
  const scrollSaveTimeout = useRef(null);

  // 스크롤 위치 복원 함수
  const restoreScroll = useCallback(() => {
    if (!listRef.current) return;
    // 검색 중일 때는 스크롤을 최상단으로 초기화
    if (searchTerm) {
      if (typeof listRef.current.scrollTo === 'function') {
        listRef.current.scrollTo(0);
      } else if (listRef.current.element) {
        listRef.current.element.scrollTop = 0;
      }
      return;
    }
    const key = `scroll-pos-${selectedCategory}`;
    const saved = localStorage.getItem(key);
    const offset = saved ? parseInt(saved, 10) : 0;
    if (typeof listRef.current.scrollTo === 'function') {
      listRef.current.scrollTo(offset);
    } else if (listRef.current.element) {
      listRef.current.element.scrollTop = offset;
    }
  }, [selectedCategory, searchTerm]);

  // 리스트 마운트 시 ref 설정 및 스크롤 복원
  const setListRef = useCallback((node) => {
    listRef.current = node;
    if (node) {
      restoreScroll();
    }
  }, [restoreScroll]);

  // 카테고리나 검색어가 변경되면 스크롤 복원/초기화
  useEffect(() => {
    restoreScroll();
  }, [restoreScroll]);

  // 스크롤 이벤트 핸들러 (requestIdleCallback으로 최적화)
  const handleScroll = useCallback(({ scrollOffset }) => {
    if (searchTerm) return; // 검색 중에는 위치 저장 안 함

    // 이전 저장 요청 취소
    if (scrollSaveTimeout.current) {
      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(scrollSaveTimeout.current);
      } else {
        clearTimeout(scrollSaveTimeout.current);
      }
    }

    // 브라우저가 유휴 상태일 때 스크롤 위치 저장 (렌더링 방해 최소화)
    if (window.requestIdleCallback) {
      scrollSaveTimeout.current = window.requestIdleCallback(() => {
        const key = `scroll-pos-${selectedCategory}`;
        localStorage.setItem(key, String(scrollOffset));
      }, { timeout: 200 }); // 200ms 내에 유휴 상태가 없으면 강제 실행
    } else {
      // Fallback for older browsers
      scrollSaveTimeout.current = setTimeout(() => {
        const key = `scroll-pos-${selectedCategory}`;
        localStorage.setItem(key, String(scrollOffset));
      }, 150);
    }
  }, [selectedCategory, searchTerm]);

  // 컴포넌트 언마운트 시 예약된 스크롤 저장 작업 취소
  useEffect(() => {
    return () => {
      if (scrollSaveTimeout.current) {
        if (window.cancelIdleCallback) {
          window.cancelIdleCallback(scrollSaveTimeout.current);
        } else {
          clearTimeout(scrollSaveTimeout.current);
        }
      }
    };
  }, []);

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
      
      <NoteListToolbar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        showCalendar={showCalendar}
        setShowCalendar={setShowCalendar}
        showTodo={showTodo}
        setShowTodo={setShowTodo}
        selectedNotes={selectedNotes}
        selectedCategory={selectedCategory}
        setContextMenu={setContextMenu}
        deleteMultipleNotes={deleteMultipleNotes}
        setModals={setModals}
        dbReady={dbReady}
        createNewNote={createNewNote}
        emptyTrash={emptyTrash}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

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
            itemCount={displayNotes.length}
            itemSize={getItemSize} // 동적 높이 함수 전달
            estimatedItemSize={130} // 평균 높이값 설정으로 스크롤 튀는 현상 완화
            itemData={mergedItemData}
            itemKey={itemKey}
            overscanCount={5} // 스크롤 성능 향상을 위해 미리 렌더링할 개수
            ref={setListRef}
            onScroll={handleScroll}
          >
            {Row}
          </List>
        )}
      </div>
    </div>
  );
}

export default memo(NoteList);