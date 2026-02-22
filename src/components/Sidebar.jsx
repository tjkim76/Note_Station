import React, { useRef } from 'react';
import { 
  BookOpen, Sun, Moon, ChevronLeft, Wifi, WifiOff, Loader, LogOut, 
  Folder, FolderPlus, Star, Tag, Edit2, X, Trash, Upload, Keyboard, Activity 
} from 'lucide-react';

export default function Sidebar({
  sidebarRef,
  width,
  onResizeStart,
  onDragLeave,
  isSidebarOpen,
  toggleSidebar,
  darkMode,
  toggleDarkMode,
  user,
  wsStatus,
  handleLogout,
  dbReady,
  setModals,
  modals,
  fileInputRef,
  handleFileChange,
  handleImportClick,
  categories,
  selectedCategory,
  setSelectedCategory,
  draggedOverCategory,
  handleCategoryDragOver,
  handleCategoryDrop,
  handleCategoryDragEnter,
  editingCategoryId,
  setEditingCategoryId,
  editingCategoryName,
  setEditingCategoryName,
  updateCategory,
  db,
  saveDB,
  toggleFavoriteCategory,
  setAddingSubcategoryParentId,
  setNewCategoryName,
  deleteCategory,
  loadNotes,
  noteCounts,
  favoriteCategories,
  categoryTree
}) {
  const isCancelingCategoryEdit = useRef(false);

  if (!isSidebarOpen) return null;

  const handleCategoryDragStart = (e, categoryId, categoryName) => {
    e.stopPropagation();
    e.dataTransfer.setData('category-id', categoryId.toString());
    e.dataTransfer.effectAllowed = 'move';

    const dragImage = document.createElement('div');
    dragImage.className = 'bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg font-bold text-sm flex items-center gap-2 absolute top-[-9999px] left-[-9999px] z-50';
    dragImage.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> ${categoryName}`;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };


  return (
    <div 
      ref={sidebarRef}
      className="bg-slate-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 relative transition-colors duration-200"
      style={{ width }}
      onDragLeave={onDragLeave}
    >
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-50 opacity-0 hover:opacity-100"
        style={{ right: '-2px' }}
        onMouseDown={onResizeStart}
      />
      <div className="p-5">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600 rounded-lg shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white">Note Station</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleDarkMode} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors" title={darkMode ? "라이트 모드" : "다크 모드"}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={toggleSidebar} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors" title="사이드바 접기">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6 group">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700 dark:text-gray-200">{user.username}님</span>
            {wsStatus === 'connected' && <Wifi className="w-4 h-4 text-green-500" title="서버에 연결됨" />}
            {wsStatus === 'disconnected' && <WifiOff className="w-4 h-4 text-red-500" title="서버 연결 끊김" />}
            {wsStatus === 'reconnecting' && (
              <div title="서버 재연결 중...">
                <Loader className="w-4 h-4 text-yellow-500 animate-spin" />
              </div>
            )}
          </div>
          <div className="absolute top-16 left-5 bg-white dark:bg-gray-700 p-2 rounded-md shadow-md text-xs text-gray-600 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {wsStatus === 'connected' ? '서버에 연결되었습니다.' : wsStatus === 'reconnecting' ? '서버에 재연결 중입니다...' : '서버 연결이 끊겼습니다. 로컬에만 저장됩니다.'}
          </div>
          <button onClick={handleLogout} className="text-xs text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1"><LogOut className="w-3 h-3" /> 로그아웃</button>
        </div>
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Folder className="w-4 h-4" />
          카테고리
        </h2>
        <button
          onClick={() => setModals(prev => ({ ...prev, category: true }))}
          disabled={!dbReady}
          className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm ${!dbReady ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <FolderPlus className="w-4 h-4" />
          새 카테고리
        </button>
      </div>

      {!dbReady ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {/* 즐겨찾기 섹션 */}
          {favoriteCategories.length > 0 && (
            <div className="mb-6">
              <h3 className="px-3 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Star className="w-3 h-3" />
                즐겨찾기
              </h3>
              {favoriteCategories.map(category => (
                <div
                  key={`fav-${category.id}`}
                  className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all ${
                    selectedCategory === category.id
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                      : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <Tag className={`w-4 h-4 flex-shrink-0 ${selectedCategory === category.id ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className="truncate text-sm font-medium">{category.name}</span>
                    <span className={`text-xs flex-shrink-0 ${selectedCategory === category.id ? 'text-blue-400' : 'text-gray-400'}`}>
                      ({noteCounts[category.id] || 0})
                    </span>
                  </div>
                </div>
              ))}
              <div className="my-2 border-b border-gray-200 dark:border-gray-700 mx-3"></div>
            </div>
          )}

          {categoryTree.map(category => (
            <div key={`cat-${category.id}`}>
              <div
                className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all category-transition-item ${
                  selectedCategory === category.id
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                    : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                } ${draggedOverCategory === category.id ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 scale-[1.02] shadow-lg z-10 relative' : ''}`}
                style={{ '--view-transition-name': `category-${category.id}` }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleCategoryDrop(e, category)}
                onDragEnter={(e) => {
                  if (category.name !== '전체') handleCategoryDragEnter(e, category.id);
                }}
                draggable={category.name !== '전체'}
                onDragStart={(e) => handleCategoryDragStart(e, category.id, category.name)}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div 
                  className="flex items-center gap-2.5 flex-1 min-w-0"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (category.name !== '전체') {
                      setEditingCategoryId(category.id);
                      setEditingCategoryName(category.name);
                    }
                  }}
                >
                  <Tag className={`w-4 h-4 flex-shrink-0 ${selectedCategory === category.id ? 'text-blue-500' : 'text-gray-400'}`} />
                  {editingCategoryId === category.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      onBlur={() => {
                        if (!isCancelingCategoryEdit.current) {
                          updateCategory(db, saveDB, category.id, editingCategoryName);
                        }
                        isCancelingCategoryEdit.current = false;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateCategory(db, saveDB, category.id, editingCategoryName);
                        if (e.key === 'Escape') {
                          isCancelingCategoryEdit.current = true;
                          setEditingCategoryId(null);
                          setEditingCategoryName('');
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-white"
                    />
                  ) : (
                    <>
                      <span className="truncate text-sm font-medium">{category.name}</span>
                      <span className={`text-xs flex-shrink-0 ${selectedCategory === category.id ? 'text-blue-400' : 'text-gray-400'}`}>
                        ({noteCounts[category.id] || 0})
                      </span>
                    </>
                  )}
                </div>
                {category.name !== '전체' && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteCategory(db, saveDB, category.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        category.is_favorite ? 'hover:bg-yellow-50 dark:hover:bg-yellow-900/30 text-yellow-500' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400'
                      }`}
                      title={category.is_favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                    >
                      <Star className={`w-3 h-3 ${category.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingSubcategoryParentId(category.id);
                        setNewCategoryName('');
                        setModals(prev => ({ ...prev, category: true }));
                      }}
                      className={`p-1 rounded transition-colors ${
                        selectedCategory === category.id
                          ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                      title="하위 카테고리 추가"
                    >
                      <FolderPlus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategoryId(category.id);
                        setEditingCategoryName(category.name);
                      }}
                      className={`p-1 rounded transition-colors ${
                        selectedCategory === category.id
                          ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                      title="편집"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModals(prev => ({ ...prev, deleteCategory: category.name }));
                      }}
                      className={`p-1 rounded transition-colors ${
                        selectedCategory === category.id
                          ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                      title="삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              
              {/* 하위 카테고리 렌더링 */}
              {category.children.map(subcat => (
                <div
                  key={`subcat-${subcat.id}`}
                  className={`group flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-all ml-6 category-transition-item ${
                    selectedCategory === subcat.id
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                      : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                  } ${draggedOverCategory === subcat.id ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 scale-[1.02] shadow-lg z-10 relative' : ''}`}
                  style={{ '--view-transition-name': `category-${subcat.id}` }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleCategoryDrop(e, subcat)}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    // handleCategoryDragEnter logic needed here if not passed directly
                  }}
                  draggable="true"
                  onDragStart={(e) => handleCategoryDragStart(e, subcat.id, subcat.name)}
                  onClick={() => setSelectedCategory(subcat.id)}
                >
                  <div 
                    className="flex items-center gap-2 flex-1 min-w-0"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingCategoryId(subcat.id);
                      setEditingCategoryName(subcat.name);
                    }}
                  >
                    <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0"></div>
                    {editingCategoryId === subcat.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onBlur={() => {
                          if (!isCancelingCategoryEdit.current) {
                            updateCategory(db, saveDB, subcat.id, editingCategoryName);
                          }
                          isCancelingCategoryEdit.current = false;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateCategory(db, saveDB, subcat.id, editingCategoryName);
                          if (e.key === 'Escape') {
                            isCancelingCategoryEdit.current = true;
                            setEditingCategoryId(null);
                            setEditingCategoryName('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 dark:text-white"
                      />
                    ) : (
                      <>
                        <span className="truncate text-sm">{subcat.name}</span>
                        <span className={`text-xs flex-shrink-0 ${selectedCategory === subcat.id ? 'text-blue-400' : 'text-gray-400'}`}>
                          ({noteCounts[subcat.id] || 0})
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteCategory(db, saveDB, subcat.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        subcat.is_favorite ? 'hover:bg-yellow-50 dark:hover:bg-yellow-900/30 text-yellow-500' : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400'
                      }`}
                      title={subcat.is_favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                    >
                      <Star className={`w-3 h-3 ${subcat.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategoryId(subcat.id);
                        setEditingCategoryName(subcat.name);
                      }}
                      className={`p-1 rounded transition-colors ${
                        selectedCategory === subcat.id
                          ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                      title="편집"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModals(prev => ({ ...prev, deleteCategory: subcat.name }));
                      }}
                      className={`p-1 rounded transition-colors ${
                        selectedCategory === subcat.id
                          ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                      title="삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* 휴지통 */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div
              className={`group flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-all ${
                selectedCategory === 'trash'
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-sm ring-1 ring-red-200 dark:ring-red-800'
                  : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
              }`}
              onClick={() => setSelectedCategory('trash')}
            >
              <Trash className={`w-4 h-4 flex-shrink-0 ${selectedCategory === 'trash' ? 'text-red-500' : 'text-gray-400'}`} />
              <span className="truncate text-sm font-medium">휴지통</span>
              <span className={`text-xs flex-shrink-0 ${selectedCategory === 'trash' ? 'text-red-400' : 'text-gray-400'}`}>
                ({noteCounts.trash || 0})
              </span>
            </div>
          </div>

          {/* Evernote 가져오기 */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 px-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".enex" 
              className="hidden" 
            />
            {modals.importProgress !== null ? (
              <div className="w-full px-3 py-2">
                <div className="flex justify-between text-xs mb-1 text-gray-600 dark:text-gray-400">
                  <span className="font-medium">가져오는 중...</span>
                  <span>{modals.importProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${modals.importProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <button onClick={handleImportClick} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-all hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <Upload className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <span className="truncate text-sm font-medium">Evernote 가져오기</span>
              </button>
            )}
          </div>

          {/* 단축키 도움말 */}
          <div className="px-3 mt-1">
            <button onClick={() => setModals(prev => ({ ...prev, shortcuts: true }))} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-all hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400">
              <Keyboard className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="truncate text-sm font-medium">단축키 도움말</span>
            </button>
          </div>

          {/* 서버 상태 */}
          <div className="px-3 mt-1">
            <button onClick={() => setModals(prev => ({ ...prev, serverStatus: true }))} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-all hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400">
              <Activity className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="truncate text-sm font-medium">서버 상태</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}