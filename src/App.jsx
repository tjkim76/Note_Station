import './index.css';
import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { 
  Folder, X
} from 'lucide-react';
import { useCategories } from './hooks/useCategories';
import { useDatabase } from './hooks/useDatabase';
import { useNotes } from './hooks/useNotes';
import { useAuth } from './hooks/useAuth';
import { useTemplates } from './hooks/useTemplates';
import Login from './components/Login';
import { summarizeText, getPlainText } from './utils/utils';

const Sidebar = React.memo(React.lazy(() => import('./components/Sidebar')));
const NoteList = React.memo(React.lazy(() => import('./components/NoteList')));
const MainEditor = React.memo(React.lazy(() => import('./components/MainEditor')));
const Modals = React.memo(React.lazy(() => import('./components/Modals')));

export default function NoteStation() {
  // --- 상태 관리 (State Management) ---
  // 드래그 앤 드롭 시 현재 드래그된 카테고리 ID 저장
  const [draggedOverCategory, setDraggedOverCategory] = useState(null);
  const fileInputRef = useRef(null);
  // 컨텍스트 메뉴 상태 (보임 여부, 위치, 대상 노트 ID)
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, noteId: null });
  // 사이드바 및 리스트 너비 조절 상태
  const [noteListWidth, setNoteListWidth] = useState(320);
  const isResizingNoteList = useRef(false);
  const noteListRef = useRef(null);
  const [savingState, setSavingState] = useState('idle'); // 'idle', 'saving', 'saved'
  const [categorySidebarWidth, setCategorySidebarWidth] = useState(256);
  const isResizingCategorySidebar = useRef(false);
  const categorySidebarRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // --- 요약 기능 상태 (AI Summary) ---
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('openai_api_key') || '';
    } catch (e) {
      return '';
    }
  });
  const [tempApiKey, setTempApiKey] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [authCodes, setAuthCodes] = useState({ naverAuthCode: null, kakaoAuthCode: null, googleAuthCode: null });
  const resizeAnimationFrame = useRef(null);
  const [showApiKey, setShowApiKey] = useState(false);
  // 다크 모드 상태 (로컬 스토리지 또는 시스템 설정 기반 초기화)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [newTag, setNewTag] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(null);
  const [showTodo, setShowTodo] = useState(false);

  // --- Modal States ---
  const [modals, setModals] = useState({
    apiKey: false,
    summary: null, // can hold the summary string
    category: false,
    deleteCategory: null, // can hold the category name
    importProgress: null, // can hold the percentage
    importResult: null,
    template: false,
    shortcuts: false,
    serverStatus: false
  });

  // 템플릿 편집 상태
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [tempTemplateTitle, setTempTemplateTitle] = useState('');
  const [tempTemplateDesc, setTempTemplateDesc] = useState('');

  // 다크 모드 적용 효과
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), []);

  useEffect(() => {
    document.title = 'Note Station';
  }, []);

  // 전역 이미지 에러 핸들링 (CSP 위반 방지를 위해 인라인 onerror 대신 이벤트 위임 사용)
  useEffect(() => {
    const handleImageError = (e) => {
      if (e.target.tagName === 'IMG') {
        e.target.style.display = 'none';
      }
    };
    // error 이벤트는 버블링되지 않으므로 캡처링 단계에서 잡아야 합니다.
    document.addEventListener('error', handleImageError, true);
    return () => document.removeEventListener('error', handleImageError, true);
  }, []);

  // 소셜 로그인 인증 코드 처리 (URL 파라미터 파싱)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = localStorage.getItem('naver_auth_state');
    const storedGoogleState = localStorage.getItem('google_auth_state');
    
    if (code && state && state === storedState && storedState) {
      // Naver Login
      localStorage.removeItem('naver_auth_state');
      setAuthCodes(prev => ({ ...prev, naverAuthCode: code }));
      // URL에서 인증 코드 정보 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code && state && state === storedGoogleState && storedGoogleState) {
      // Google Login
      localStorage.removeItem('google_auth_state');
      setAuthCodes(prev => ({ ...prev, googleAuthCode: code }));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code && !state) {
      // Kakao Login
      setAuthCodes(prev => ({ ...prev, kakaoAuthCode: code }));
      // URL에서 인증 코드 정보 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // --- 리사이징 핸들러 (Resizing Handlers) ---
  const startResizing = useCallback(() => {
    isResizingNoteList.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const startResizingCategorySidebar = useCallback(() => {
    isResizingCategorySidebar.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizingNoteList.current = false;
    isResizingCategorySidebar.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // 마우스 이동에 따른 너비 조절 (requestAnimationFrame으로 성능 최적화)
  const resize = useCallback((e) => {
    if (resizeAnimationFrame.current) return;

    resizeAnimationFrame.current = requestAnimationFrame(() => {
      if (isResizingNoteList.current && noteListRef.current) {
        const newWidth = e.clientX - noteListRef.current.getBoundingClientRect().left;
        if (newWidth > 200 && newWidth < 800) {
          setNoteListWidth(newWidth);
        }
      }
      if (isResizingCategorySidebar.current && categorySidebarRef.current) {
        const newWidth = e.clientX - categorySidebarRef.current.getBoundingClientRect().left;
        if (newWidth > 180 && newWidth < 600) {
          setCategorySidebarWidth(newWidth);
        }
      }
      resizeAnimationFrame.current = null;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // 로컬 DB 및 WebSocket 상태 관리 훅 사용
  const { dbReady, wsStatus, switchDatabase, currentDbName, connectionError } = useDatabase();

  // 실시간 저장이므로 기존 saveDB는 비활성화
  const saveDB = useCallback(() => {}, []);
  const db = null; // 직접적인 DB 쿼리 접근 차단 (REST API 사용 권장)

  // 인증 관련 훅 사용
  const { user, login, signup, logout, initiateNaverLogin, initiateKakaoLogin, initiateGoogleLogin, error: authError, setError: setAuthError, isSessionChecking } = useAuth(db, saveDB, switchDatabase, currentDbName, authCodes);

  // 로그아웃 처리 (스토리지 및 캐시 초기화)
  const handleLogout = useCallback(async () => {
    // 테마 설정은 유지하고 나머지 정보만 삭제
    const currentTheme = localStorage.getItem('theme');
    localStorage.clear();
    if (currentTheme) localStorage.setItem('theme', currentTheme);
    sessionStorage.clear();
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      } catch (e) {
        console.error('Failed to clear caches:', e);
      }
    }
    if (logout) await logout();
    window.location.reload();
  }, [logout]);

  // DB가 준비되면 플래그 설정 (로그인 화면 표시 전 깜빡임 방지용)
  useEffect(() => {
    if (dbReady) setIsDbInitialized(true);
  }, [dbReady]);

  // 카테고리 관리 훅 사용
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    newCategoryName,
    setNewCategoryName,
    editingCategoryId,
    setEditingCategoryId,
    editingCategoryName,
    setEditingCategoryName,
    addingSubcategoryParentId,
    setAddingSubcategoryParentId,
    loadCategories,
    addCategory,
    addSubcategory,
    categoryTree,
    favoriteCategories,
    reorderCategory,
    toggleFavoriteCategory,
    updateCategory,
    deleteCategory
  } = useCategories();

  // 노트 관리 훅 사용 (CRUD, 검색, 필터링 등)
  const {
    notes,
    selectedNote,
    selectedNotes,
    setSelectedNote,
    isEditing,
    setIsEditing,
    searchTerm,
    setSearchTerm,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
    editCategoryId,
    setEditCategoryId,
    loadNotes,
    createNewNote,
    deleteNoteWithImages,
    deleteMultipleNotes,
    moveSelectedNotes,
    restoreNote,
    emptyTrash,
    startEditing,
    saveNote,
    cancelEditing,
    toggleNoteSelection,
    updateNoteCategory,
    togglePin,
    importFromEvernote,
    handlePaste,
    filteredNotes,
    addTag,
    removeTag,
    isLoading,
    reorderNote,
  } = useNotes(categories, selectedCategory, currentDbName, user);

  // handleSummarize 최적화를 위한 ref (타이핑 시 함수 재생성 방지)
  const editContentRef = useRef(editContent);
  useEffect(() => { editContentRef.current = editContent; }, [editContent]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // 전역 단축키 핸들러
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + \ : 사이드바 토글
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Ctrl + / : 단축키 도움말
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setModals(prev => ({ ...prev, shortcuts: !prev.shortcuts }));
        return;
      }

      // Ctrl + Alt + N : 새 노트
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        createNewNote();
        return;
      }

      // Esc : 모달 닫기
      if (e.key === 'Escape') {
        setModals(prev => {
          const isAnyOpen = Object.values(prev).some(v => v !== false && v !== null);
          if (isAnyOpen) {
             // 모든 모달 초기화
             return { apiKey: false, summary: null, category: false, deleteCategory: null, importProgress: null, importResult: null, template: false, shortcuts: false, serverStatus: false };
          }
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, createNewNote]);

  // 템플릿 관리 훅
  const { userTemplates, loadTemplates, saveTemplate, deleteTemplate, updateTemplate } = useTemplates();

  useEffect(() => {
    if (dbReady && user) {
      loadTemplates();
    }
  }, [dbReady, user, loadTemplates]);

  // 캘린더 및 할 일 필터링 적용 (메모이제이션으로 성능 최적화)
  const displayNotes = useMemo(() => {
    let filtered = filteredNotes;

    if (showCalendar && calendarDate) {
      filtered = filtered.filter(note => {
        return new Date(note.createdAt).toDateString() === calendarDate.toDateString();
      });
    }

    if (showTodo) {
      filtered = filtered.filter(note => {
        if (!note.content) return false;
        // 체크되지 않은 체크박스가 있는지 확인 (<input type="checkbox"> 태그 중 checked 속성이 없는 것)
        const checkboxes = note.content.match(/<input[^>]+type=["']?checkbox["']?[^>]*>/gi);
        return checkboxes && checkboxes.some(cb => !cb.includes('checked'));
      });
    }

    return filtered;
  }, [filteredNotes, showCalendar, calendarDate, showTodo]);

  // 성능 최적화를 위한 Refs
  const selectedNotesRef = useRef(selectedNotes);
  useEffect(() => { selectedNotesRef.current = selectedNotes; }, [selectedNotes]);

  // 자동 저장 기능 (내용 변경 후 10초 뒤 자동 저장)
  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(async () => {
        setSavingState('saving');
        try {
          await saveNote({ exit: false, content: editContent });
          setSavingState('saved');
          setTimeout(() => setSavingState('idle'), 1500);
        } catch (e) {
          console.error("Auto-save failed", e);
          setSavingState('idle'); // Or an 'error' state
        }
      }, 10000); // 10초

      return () => clearTimeout(timer);
    }
  }, [isEditing, editContent, saveNote]); // saveNote는 이제 안정적이므로 의존성에 추가해도 괜찮습니다.

  // 컨텍스트 메뉴 닫기 (화면의 다른 곳 클릭 시)
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (dbReady && user) {
      // loadNotes는 useNotes 훅 내부에서 자동으로 호출되므로 중복 호출 제거
      const controller = new AbortController();
      loadCategories(db, false, null, controller.signal);
      return () => controller.abort();
    }
  }, [dbReady, db, loadCategories, user]);

  // --- 드래그 앤 드롭 핸들러 (Drag and Drop Handlers) ---
  const handleNoteDragStart = useCallback((e, noteId) => {
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleCategoryDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleCategoryDragEnter = useCallback((e, categoryId) => {
    e.preventDefault();
    setDraggedOverCategory(categoryId);
  }, []);

  const handleSidebarDragLeave = useCallback((e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDraggedOverCategory(null);
    }
  }, []);

  const handleCategoryDrop = useCallback((e, targetCategory) => {
    e.preventDefault();
    setDraggedOverCategory(null);
    
    const draggedCategoryId = e.dataTransfer.getData('category-id');
    if (draggedCategoryId) {
      // 카테고리 순서 변경
      reorderCategory(db, saveDB, Number(draggedCategoryId), targetCategory.id);
      return;
    }

    if (targetCategory.name === '전체') return;
    const noteId = e.dataTransfer.getData('text/plain');
    if (noteId) {
      updateNoteCategory(Number(noteId), targetCategory.id);
    }
  }, [db, saveDB, reorderCategory, updateNoteCategory]);

  // 파일 가져오기 버튼 클릭 핸들러
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 파일 선택 시 처리 (Evernote .enex 파일 가져오기)
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setModals(prev => ({ ...prev, importProgress: 0, importResult: null }));
      const result = await importFromEvernote(file, (progress) => setModals(prev => ({ ...prev, importProgress: progress })));
      if (result) {
        loadCategories(db); // 새 카테고리가 추가되었을 수 있으므로 갱신
        setModals(prev => ({ ...prev, importProgress: null, importResult: result }));
      } else {
        setModals(prev => ({ ...prev, importProgress: null }));
      }
      e.target.value = ''; // 입력 초기화
    }
  }, [importFromEvernote, loadCategories, db]);

  // 노트 우클릭 컨텍스트 메뉴 핸들러
  const handleContextMenu = useCallback((e, noteId) => {
    e.preventDefault();
    // 선택되지 않은 노트를 우클릭한 경우, 해당 노트만 선택 (기존 다중 선택 해제)
    if (!selectedNotesRef.current.has(noteId)) {
      toggleNoteSelection(noteId, false, false);
    }
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      noteId
    });
  }, [toggleNoteSelection]); // selectedNotes 의존성 제거

  const handleNoteClick = useCallback((e, note) => {
    toggleNoteSelection(note.id, e.ctrlKey || e.metaKey, e.shiftKey);
    setIsEditing(false);
  }, [toggleNoteSelection]);

  const handleNoteDoubleClick = useCallback((note) => {
    setSelectedNote(note);
    setIsEditing(true);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategoryId(note.categoryId);
  }, [setSelectedNote, setIsEditing, setEditTitle, setEditContent, setEditCategoryId]);

  // 가상화 리스트(react-window)에 전달할 데이터 객체 (메모이제이션)
  const itemData = useMemo(() => ({
    notes: displayNotes,
    categories: categories,
    selectedNoteId: selectedNote?.id,
    selectedNotesSet: selectedNotes,
    onNoteClick: handleNoteClick,
    onDoubleClick: handleNoteDoubleClick,
    onDragStart: handleNoteDragStart,
    onPin: togglePin,
    onContextMenu: handleContextMenu,
    onDelete: deleteNoteWithImages,
    onRestore: restoreNote
  }), [displayNotes, categories, selectedNote, selectedNotes, handleNoteClick, handleNoteDoubleClick, handleNoteDragStart, togglePin, handleContextMenu, deleteNoteWithImages, restoreNote]);

  // RichTextEditor에 전달할 저장 핸들러 (수동 저장)
  const handleSaveContent = useCallback((content) => {
    setSavingState('saving');
    try {
      saveNote({ exit: false, content });
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 1500);
    } catch (e) {
      console.error("Manual save failed", e);
      setSavingState('idle');
    }
  }, [saveNote]);

  // AI 요약 요청 핸들러
  const handleSummarize = useCallback(async () => {
    if (!selectedNote && !isEditing) return;
    
    if (!apiKey) {
      setTempApiKey('');
      setModals(prev => ({ ...prev, apiKey: true }));
      return;
    }

    setIsSummarizing(true);
    try {
      const textContent = getPlainText(isEditing ? editContentRef.current : selectedNote.content);
      const summary = await summarizeText(textContent, apiKey);
      setModals(prev => ({ ...prev, summary }));
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('key')) {
        alert('API 키가 유효하지 않습니다. 다시 설정해주세요.');
        setApiKey('');
        localStorage.removeItem('openai_api_key');
        setModals(prev => ({ ...prev, apiKey: true }));
      } else {
        alert('요약 중 오류가 발생했습니다: ' + error.message);
      }
    } finally {
      setIsSummarizing(false);
    }
  }, [apiKey, selectedNote, isEditing]); // editContent 의존성 제거

  // API 키 저장 핸들러
  const saveApiKey = useCallback(() => {
    if (tempApiKey.trim()) {
      const key = tempApiKey.trim();
      setApiKey(key);
      localStorage.setItem('openai_api_key', key);
      setModals(prev => ({ ...prev, apiKey: false }));
    }
  }, [tempApiKey]);

  // 카테고리별 노트 개수 계산 (성능 최적화를 위해 메모이제이션)
  const noteCounts = useMemo(() => {
    const counts = { trash: 0 };
    
    notes.forEach(note => {
      if (note.isDeleted) {
        counts.trash++;
        return;
      }
      const categoryId = note.categoryId;
      if (categoryId) {
        counts[categoryId] = (counts[categoryId] || 0) + 1;
      }
    });
    
    // '전체' 카테고리 수동 계산
    const allCategory = categories.find(c => c.name === '전체');
    if (allCategory) {
      counts[allCategory.id] = notes.filter(n => !n.isDeleted).length;
    }
    return counts;
  }, [notes, categories]);

  // 세션 확인 중이거나 DB 초기화 전 로딩 화면
  if (isSessionChecking || !isDbInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 로그인 화면
  if (!user) {
    return <Login onLogin={login} onSignup={signup} onNaverLogin={initiateNaverLogin} onKakaoLogin={initiateKakaoLogin} onGoogleLogin={initiateGoogleLogin} error={authError} setError={setAuthError} />;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-200">
      <style>{`
        font[size='1'] { font-size: 11px; }
        font[size='2'] { font-size: 13px; }
        font[size='3'] { font-size: 16px; }
        font[size='4'] { font-size: 20px; }
        font[size='5'] { font-size: 24px; }
        font[size='6'] { font-size: 32px; }
        font[size='7'] { font-size: 48px; }
      `}</style>
      <Suspense fallback={
        <div className="flex items-center justify-center w-full h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      }>
          {/* 왼쪽 사이드바: 카테고리 목록 */}
          <Sidebar
            sidebarRef={categorySidebarRef}
            width={categorySidebarWidth}
            onResizeStart={startResizingCategorySidebar}
            onDragLeave={handleSidebarDragLeave}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            user={user}
            wsStatus={wsStatus}
            handleLogout={handleLogout}
            dbReady={dbReady}
            setModals={setModals}
            modals={modals}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            handleImportClick={handleImportClick}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            draggedOverCategory={draggedOverCategory}
            handleCategoryDragOver={handleCategoryDragOver}
            handleCategoryDrop={handleCategoryDrop}
            handleCategoryDragEnter={handleCategoryDragEnter}
            editingCategoryId={editingCategoryId}
            setEditingCategoryId={setEditingCategoryId}
            editingCategoryName={editingCategoryName}
            setEditingCategoryName={setEditingCategoryName}
            updateCategory={updateCategory}
            db={db}
            saveDB={saveDB}
            toggleFavoriteCategory={toggleFavoriteCategory}
            setAddingSubcategoryParentId={setAddingSubcategoryParentId}
            setNewCategoryName={setNewCategoryName}
            deleteCategory={deleteCategory}
            loadNotes={loadNotes}
            noteCounts={noteCounts}
            favoriteCategories={favoriteCategories}
            categoryTree={categoryTree}
          />

          {/* 중간 사이드바: 노트 목록 */}
          <NoteList
            noteListRef={noteListRef}
            width={noteListWidth}
            onResizeStart={startResizing}
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
            calendarDate={calendarDate}
            setCalendarDate={setCalendarDate}
            reorderNote={reorderNote}
            filteredNotes={filteredNotes}
            displayNotes={displayNotes}
            itemData={itemData}
            isLoading={isLoading}
          />

          {/* 오른쪽 메인 영역: 노트 내용 편집/조회 */}
          <MainEditor
            selectedNote={selectedNote}
            isEditing={isEditing}
            editTitle={editTitle}
            setEditTitle={setEditTitle}
            editContent={editContent}
            setEditContent={setEditContent}
            editCategoryId={editCategoryId}
            setEditCategoryId={setEditCategoryId}
            categories={categories}
            isSummarizing={isSummarizing}
            handleSummarize={handleSummarize}
            startEditing={startEditing}
            saveNote={saveNote}
            cancelEditing={cancelEditing}
            restoreNote={restoreNote}
            removeTag={removeTag}
            newTag={newTag}
            setNewTag={setNewTag}
            addTag={addTag}
            savingState={savingState}
            saveTemplate={saveTemplate}
            handlePaste={handlePaste}
            handleSaveContent={handleSaveContent}
            dbReady={dbReady}
          />

          <Modals
            modals={modals}
            setModals={setModals}
            addingSubcategoryParentId={addingSubcategoryParentId}
            setAddingSubcategoryParentId={setAddingSubcategoryParentId}
            newCategoryName={newCategoryName}
            setNewCategoryName={setNewCategoryName}
            addSubcategory={addSubcategory}
            addCategory={addCategory}
            db={db}
            saveDB={saveDB}
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
            tempApiKey={tempApiKey}
            setTempApiKey={setTempApiKey}
            saveApiKey={saveApiKey}
            deleteCategory={deleteCategory}
            loadNotes={loadNotes}
            userTemplates={userTemplates}
            editingTemplateId={editingTemplateId}
            setEditingTemplateId={setEditingTemplateId}
            tempTemplateTitle={tempTemplateTitle}
            setTempTemplateTitle={setTempTemplateTitle}
            tempTemplateDesc={tempTemplateDesc}
            setTempTemplateDesc={setTempTemplateDesc}
            updateTemplate={updateTemplate}
            createNewNote={createNewNote}
            deleteTemplate={deleteTemplate}
          />
      </Suspense>

          {/* 컨텍스트 메뉴 */}
          {contextMenu.visible && (
            <div
              className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg py-1 z-50 min-w-[160px]"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                카테고리 이동
              </div>
              <div className="max-h-64 overflow-y-auto">
                {categoryTree.map(category => (
                  <React.Fragment key={category.id}>
                    <button
                      onClick={() => {
                        if (selectedNotes.size > 0) {
                          moveSelectedNotes(category.id);
                        } else if (contextMenu.noteId) {
                          updateNoteCategory(contextMenu.noteId, category.id);
                        }
                        setContextMenu({ ...contextMenu, visible: false });
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Folder className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      {category.name}
                    </button>
                    {category.children.map(subcat => (
                      <button
                        key={subcat.id}
                        onClick={() => {
                          if (selectedNotes.size > 0) {
                            moveSelectedNotes(subcat.id);
                          } else if (contextMenu.noteId) {
                            updateNoteCategory(contextMenu.noteId, subcat.id);
                          }
                          setContextMenu({ ...contextMenu, visible: false });
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 pl-8"
                      >
                        <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0"></div>
                        {subcat.name}
                      </button>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* WebSocket 연결 상태 알림 */}
          {(wsStatus === 'reconnecting' || (wsStatus === 'disconnected' && connectionError)) && (
            <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded shadow-lg z-50 max-w-md animate-bounce-in">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {wsStatus === 'reconnecting' ? '서버에 재연결 중...' : '연결 오류'}
                  </p>
                  {connectionError && (
                    <div className="mt-1 text-xs opacity-90">
                      <p>서버 인증서가 신뢰되지 않아 연결이 차단되었습니다.</p>
                      <a 
                        href={connectionError.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline mt-1 inline-block hover:text-blue-200"
                      >
                        여기를 클릭하여 인증서를 수락해주세요
                      </a>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => {
                    // 일시적으로 알림 숨기기
                    const el = document.querySelector('.animate-bounce-in');
                    if(el) el.style.display = 'none';
                  }}
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
    </div>
  );
}
