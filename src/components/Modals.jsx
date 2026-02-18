import React from 'react';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';

export default function Modals({
  modals,
  setModals,
  addingSubcategoryParentId,
  setAddingSubcategoryParentId,
  newCategoryName,
  setNewCategoryName,
  addSubcategory,
  addCategory,
  db,
  saveDB,
  showApiKey,
  setShowApiKey,
  tempApiKey,
  setTempApiKey,
  saveApiKey,
  deleteCategory,
  loadNotes,
  userTemplates,
  editingTemplateId,
  setEditingTemplateId,
  tempTemplateTitle,
  setTempTemplateTitle,
  tempTemplateDesc,
  setTempTemplateDesc,
  updateTemplate,
  createNewNote,
  deleteTemplate
}) {
  if (modals.apiKey) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96">
          <h3 className="text-lg font-bold mb-4 dark:text-white">OpenAI API 키 설정</h3>
          <div className="relative mb-4">
            <input
              type={showApiKey ? "text" : "password"}
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
              placeholder="sk-..."
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500"
            >
              {showApiKey ? "숨기기" : "보기"}
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setModals(prev => ({ ...prev, apiKey: false }))}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              취소
            </button>
            <button
              onClick={saveApiKey}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modals.summary) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold dark:text-white">AI 요약 결과</h3>
            <button onClick={() => setModals(prev => ({ ...prev, summary: null }))}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded mb-4 text-sm leading-relaxed dark:text-gray-200 whitespace-pre-wrap">
            {modals.summary}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => {
                navigator.clipboard.writeText(modals.summary);
                alert('복사되었습니다.');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              복사하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modals.category) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-80">
          <h3 className="text-lg font-bold mb-4 dark:text-white">
            {addingSubcategoryParentId ? '하위 카테고리 추가' : '새 카테고리 추가'}
          </h3>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (addingSubcategoryParentId) {
                  addSubcategory(db, saveDB, addingSubcategoryParentId, newCategoryName);
                } else {
                  addCategory(db, saveDB, newCategoryName);
                }
                setModals(prev => ({ ...prev, category: false }));
                setNewCategoryName('');
                setAddingSubcategoryParentId(null);
              }
            }}
            autoFocus
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded mb-4 dark:bg-gray-700 dark:text-white"
            placeholder="카테고리 이름"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setModals(prev => ({ ...prev, category: false }));
                setNewCategoryName('');
                setAddingSubcategoryParentId(null);
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              취소
            </button>
            <button
              onClick={() => {
                if (addingSubcategoryParentId) {
                  addSubcategory(db, saveDB, addingSubcategoryParentId, newCategoryName);
                } else {
                  addCategory(db, saveDB, newCategoryName);
                }
                setModals(prev => ({ ...prev, category: false }));
                setNewCategoryName('');
                setAddingSubcategoryParentId(null);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              추가
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modals.deleteCategory) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96">
          <h3 className="text-lg font-bold mb-2 dark:text-white">카테고리 삭제</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            '{modals.deleteCategory}' 카테고리를 삭제하시겠습니까?<br/>
            <span className="text-sm text-red-500">포함된 모든 노트가 휴지통으로 이동합니다.</span>
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setModals(prev => ({ ...prev, deleteCategory: null }))}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              취소
            </button>
            <button
              onClick={() => {
                deleteCategory(db, saveDB, modals.deleteCategory, loadNotes);
                setModals(prev => ({ ...prev, deleteCategory: null }));
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modals.template) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[800px] max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold dark:text-white">템플릿 관리</h3>
            <button onClick={() => setModals(prev => ({ ...prev, template: false }))}>
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            {userTemplates && userTemplates.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {userTemplates.map(template => (
                  <div 
                    key={template.id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors group relative cursor-pointer"
                    onDoubleClick={() => {
                      createNewNote(template);
                      setModals(prev => ({ ...prev, template: false }));
                    }}
                  >
                    {editingTemplateId === template.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={tempTemplateTitle}
                          onChange={(e) => setTempTemplateTitle(e.target.value)}
                          className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                          placeholder="템플릿 제목"
                        />
                        <textarea
                          value={tempTemplateDesc}
                          onChange={(e) => setTempTemplateDesc(e.target.value)}
                          className="w-full p-2 border rounded h-20 dark:bg-gray-700 dark:text-white"
                          placeholder="템플릿 설명"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingTemplateId(null)}
                            className="px-3 py-1 text-sm text-gray-500"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => {
                              updateTemplate(template.id, tempTemplateTitle, tempTemplateDesc);
                              setEditingTemplateId(null);
                            }}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg dark:text-white">{template.title}</h4>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTemplateId(template.id);
                                setTempTemplateTitle(template.title);
                                setTempTemplateDesc(template.description || '');
                              }}
                              className="p-1 text-gray-400 hover:text-blue-500"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('정말 삭제하시겠습니까?')) {
                                  deleteTemplate(template.id);
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                          {template.description || '설명 없음'}
                        </p>
                        <button
                          onClick={() => {
                            createNewNote(template);
                            setModals(prev => ({ ...prev, template: false }));
                          }}
                          className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          이 템플릿 사용
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                <p>저장된 템플릿이 없습니다.</p>
                <p className="text-sm mt-2">노트 편집 화면에서 템플릿을 추가해보세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (modals.importProgress !== null) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96">
          <h3 className="text-lg font-bold mb-4 dark:text-white">노트 가져오는 중...</h3>
          <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 mb-2">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${modals.importProgress}%` }}
            ></div>
          </div>
          <p className="text-right text-sm text-gray-600 dark:text-gray-400">
            {modals.importProgress}% 완료
          </p>
        </div>
      </div>
    );
  }

  if (modals.importResult) {
    const { success, fail, total } = modals.importResult;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-[400px] transform transition-all scale-100 animate-bounce-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
              가져오기 완료!
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              노트 가져오기가 성공적으로 끝났습니다.
            </p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 mb-6 overflow-hidden">
            <div
              className="bg-green-500 h-3 rounded-full"
              style={{ width: '100%' }}
            ></div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">총 노트</span>
              <span className="font-bold text-gray-900 dark:text-white">{total}개</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-green-700 dark:text-green-400">성공</span>
              <span className="font-bold text-green-700 dark:text-green-400">{success}개</span>
            </div>
            {fail > 0 && (
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-red-700 dark:text-red-400">실패</span>
                <span className="font-bold text-red-700 dark:text-red-400">{fail}개</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setModals(prev => ({ ...prev, importResult: null }))}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return null;
}