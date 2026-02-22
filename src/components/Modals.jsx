import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Keyboard, Activity } from 'lucide-react';
import { API_BASE } from '../config';

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

  if (modals.shortcuts) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={() => setModals(prev => ({ ...prev, shortcuts: false }))}>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-[600px] max-w-[95vw] transform transition-all scale-100" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Keyboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">키보드 단축키</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">작업 속도를 높여주는 단축키 모음입니다.</p>
              </div>
            </div>
            <button 
              onClick={() => setModals(prev => ({ ...prev, shortcuts: false }))} 
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                일반
              </h4>
              <ul className="space-y-4">
                <li className="flex justify-between items-center group">
                  <span className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">새 노트 작성</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">Ctrl</kbd>
                    <span className="text-gray-400 dark:text-gray-600">+</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">Alt</kbd>
                    <span className="text-gray-400 dark:text-gray-600">+</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">N</kbd>
                  </div>
                </li>
                <li className="flex justify-between items-center group">
                  <span className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">사이드바 토글</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">Ctrl</kbd>
                    <span className="text-gray-400 dark:text-gray-600">+</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">\</kbd>
                  </div>
                </li>
                <li className="flex justify-between items-center group">
                  <span className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">단축키 도움말</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">Ctrl</kbd>
                    <span className="text-gray-400 dark:text-gray-600">+</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">/</kbd>
                  </div>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                에디터
              </h4>
              <ul className="space-y-4">
                <li className="flex justify-between items-center group">
                  <span className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">저장</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">Ctrl</kbd>
                    <span className="text-gray-400 dark:text-gray-600">+</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">S</kbd>
                  </div>
                </li>
                <li className="flex justify-between items-center group">
                  <span className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">굵게</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">Ctrl</kbd>
                    <span className="text-gray-400 dark:text-gray-600">+</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">B</kbd>
                  </div>
                </li>
                <li className="flex justify-between items-center group">
                  <span className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">기울임</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">Ctrl</kbd>
                    <span className="text-gray-400 dark:text-gray-600">+</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">I</kbd>
                  </div>
                </li>
                <li className="flex justify-between items-center group">
                  <span className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">밑줄</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">Ctrl</kbd>
                    <span className="text-gray-400 dark:text-gray-600">+</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 rounded-md text-xs font-bold font-mono text-gray-600 dark:text-gray-300 min-w-[24px] text-center">U</kbd>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 py-3 rounded-lg">
              <span className="font-medium">Markdown 문법 지원:</span>
              <div className="flex gap-2">
                <code className="bg-white dark:bg-gray-600 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-500 text-xs font-mono">#</code>
                <code className="bg-white dark:bg-gray-600 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-500 text-xs font-mono">-</code>
                <code className="bg-white dark:bg-gray-600 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-500 text-xs font-mono">1.</code>
                <code className="bg-white dark:bg-gray-600 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-500 text-xs font-mono">&gt;</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (modals.serverStatus) {
    return <ServerStatusModal onClose={() => setModals(prev => ({ ...prev, serverStatus: false }))} />;
  }

  return null;
}

function ServerStatusModal({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/status`, { credentials: 'include' });
        if(res.ok) {
            const json = await res.json();
            setData(json);
        }
      } catch(e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
    const interval = setInterval(fetchData, 3000); // 3초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-[600px] max-w-[95vw] transform transition-all scale-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">서버 상태</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">실시간 시스템 모니터링</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
            </div>

            {loading && !data ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
            ) : !data ? (
                <div className="text-center py-10 text-red-500">데이터를 불러올 수 없습니다.</div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">시스템 정보</h4>
                            <div className="space-y-2">
                                <p className="text-sm flex justify-between"><span className="font-semibold text-gray-700 dark:text-gray-300">OS:</span> <span className="text-gray-600 dark:text-gray-400">{data.system.type} {data.system.release}</span></p>
                                <p className="text-sm flex justify-between"><span className="font-semibold text-gray-700 dark:text-gray-300">Arch:</span> <span className="text-gray-600 dark:text-gray-400">{data.system.arch}</span></p>
                                <p className="text-sm flex justify-between"><span className="font-semibold text-gray-700 dark:text-gray-300">Hostname:</span> <span className="text-gray-600 dark:text-gray-400">{data.system.hostname}</span></p>
                                <p className="text-sm flex justify-between"><span className="font-semibold text-gray-700 dark:text-gray-300">CPUs:</span> <span className="text-gray-600 dark:text-gray-400">{data.system.cpus} Cores</span></p>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">프로세스</h4>
                            <div className="space-y-2">
                                <p className="text-sm flex justify-between"><span className="font-semibold text-gray-700 dark:text-gray-300">PID:</span> <span className="text-gray-600 dark:text-gray-400">{data.process.pid}</span></p>
                                <p className="text-sm flex justify-between"><span className="font-semibold text-gray-700 dark:text-gray-300">Uptime:</span> <span className="text-gray-600 dark:text-gray-400">{formatUptime(data.uptime)}</span></p>
                                <p className="text-sm flex justify-between"><span className="font-semibold text-gray-700 dark:text-gray-300">App Memory:</span> <span className="text-gray-600 dark:text-gray-400">{formatBytes(data.process.memoryUsage.rss)}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">시스템 메모리</h4>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 overflow-hidden mb-2">
                            <div className="bg-green-500 h-full transition-all duration-500 ease-out" style={{ width: `${data.memory.usagePercentage}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>사용중: {formatBytes(data.memory.used)} ({data.memory.usagePercentage}%)</span>
                            <span>전체: {formatBytes(data.memory.total)}</span>
                        </div>
                    </div>

                    {data.disk && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">디스크 사용량</h4>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 overflow-hidden mb-2">
                            <div className="bg-blue-500 h-full transition-all duration-500 ease-out" style={{ width: `${data.disk.usagePercentage}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>사용중: {formatBytes(data.disk.used)} ({data.disk.usagePercentage}%)</span>
                            <span>전체: {formatBytes(data.disk.total)}</span>
                        </div>
                    </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
}