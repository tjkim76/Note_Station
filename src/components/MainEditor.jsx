import React, { useRef, useEffect, useMemo, useState } from 'react';
import { 
  Edit2, Save, X, RotateCcw, Loader, Check, Wand2, LayoutTemplate, Upload
} from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { formatDate } from '../utils/utils';
import 'highlight.js/styles/atom-one-dark.css';
import { API_BASE } from '../config';

// 이미지 최적화 헬퍼 함수 (WebP 변환 및 리사이징)
const optimizeImage = (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          // 최적화된 파일이 원본보다 작을 경우에만 사용
          resolve(blob && blob.size < file.size ? blob : file);
        }, 'image/webp', quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function MainEditor({
  selectedNote,
  isEditing,
  editTitle,
  setEditTitle,
  editContent,
  setEditContent,
  editCategoryId,
  setEditCategoryId,
  categories,
  isSummarizing,
  handleSummarize,
  startEditing,
  saveNote,
  cancelEditing,
  restoreNote,
  removeTag,
  newTag,
  setNewTag,
  addTag,
  savingState,
  saveTemplate,
  handlePaste,
  handleSaveContent,
  dbReady
}) {
  const viewContentRef = useRef(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // 조회 모드에서 깨진 이미지 숨기기 (이벤트 캡처링 사용)
  useEffect(() => {
    const container = viewContentRef.current;
    if (!container) return;

    const handleImageError = (e) => {
      if (e.target.tagName === 'IMG') {
        e.target.style.display = 'none';
      }
    };

    container.addEventListener('error', handleImageError, true);
    return () => container.removeEventListener('error', handleImageError, true);
  }, [selectedNote, isEditing]);

  // 조회 모드에서 코드 블록 하이라이팅 적용 (highlight.js)
  useEffect(() => {
    if (!isEditing && viewContentRef.current) {
      import('highlight.js').then((hljs) => {
        if (viewContentRef.current) {
          viewContentRef.current.querySelectorAll('pre code').forEach((block) => {
            hljs.default.highlightElement(block);
          });
        }
      });
    }
  }, [selectedNote, isEditing]);

  // Mixed Content 해결: HTTPS 환경에서 HTTP 이미지 URL을 프록시 URL로 변환 (조회 모드용)
  const processedViewContent = useMemo(() => {
    if (!selectedNote || selectedNote.content === null) return null;
    let content = selectedNote.content;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      content = content.replace(/src="(http:\/\/[^"]+)"/g, (match, url) => {
        return `src="${API_BASE}/api/proxy?url=${encodeURIComponent(url)}"`;
      });
    }
    return content;
  }, [selectedNote]);

  // 드래그 앤 드롭 핸들러
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      setIsOptimizingImage(true);
      
      for (const file of imageFiles) {
        try {
          let uploadBlob = file;
          let ext = file.type.split('/')[1] || 'png';

          // 이미지 최적화 시도
          try {
            const optimized = await optimizeImage(file);
            if (optimized !== file) {
              uploadBlob = optimized;
              ext = 'webp';
            }
          } catch (err) {
            console.warn('Image optimization skipped:', err);
          }

          const filename = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
          const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'x-filename': filename
            },
            body: uploadBlob
          });

          if (!response.ok) throw new Error('Image upload failed');

          const data = await response.json();
          const fullImageUrl = `${API_BASE}${data.url}`;
          const img = `<img src="${fullImageUrl}" alt="이미지" style="max-width: 100%; height: auto; margin: 12px 0; border-radius: 8px;" />`;
          document.execCommand('insertHTML', false, img);
        } catch (error) {
          console.error('Image upload error:', error);
          alert('이미지 업로드 중 오류가 발생했습니다.');
        }
      }
      setIsOptimizingImage(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 자식 요소로 진입할 때 발생하는 이벤트 무시 (깜빡임 방지)
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      {selectedNote ? (
        <>
          <div className="bg-white dark:bg-gray-900 px-8 py-6 flex items-center justify-between transition-colors duration-200">
            <div className="flex items-center gap-3 flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-3xl font-bold text-gray-900 dark:text-white border-b-2 border-blue-500 focus:outline-none flex-1 pb-2 bg-transparent"
                  placeholder="노트 제목"
                />
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedNote.title}</h2>
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-200 rounded-md text-xs font-medium">
                    {categories.find(c => c.id === selectedNote.categoryId)?.name || '개인'}
                  </span>
                </>
              )}
            </div>
            
            {!isEditing && !selectedNote.isDeleted && (
              <div className="flex gap-2">
                <button
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="px-4 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  {isSummarizing ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  요약
                </button>
                <button
                  onClick={startEditing}
                  className="px-4 py-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  편집
                </button>
              </div>
            )}
            {selectedNote.isDeleted && (
              <div className="flex gap-2">
                <button
                  onClick={() => restoreNote(selectedNote.id)}
                  className="px-4 py-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  복구
                </button>
              </div>
            )}
          </div>

          <div className="px-8 pt-2 pb-4 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">생성: {formatDate(selectedNote.createdAt)} | 수정: {formatDate(selectedNote.updatedAt)}</p>
            
            {/* 태그 목록 및 추가 입력 */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {selectedNote.tags && selectedNote.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs flex items-center gap-1">
                  #{tag}
                  {isEditing && (
                    <button onClick={() => removeTag(selectedNote.id, tag)} className="hover:text-blue-800 dark:hover:text-blue-200"><X className="w-3 h-3" /></button>
                  )}
                </span>
              ))}
              {isEditing && (
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newTag.trim()) {
                      addTag(selectedNote.id, newTag);
                      setNewTag('');
                    }
                  }}
                  placeholder="+ 태그 추가"
                  className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:border-blue-500 bg-transparent dark:text-gray-200 min-w-[80px]"
                />
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-8 pb-8 flex flex-col">
            {isEditing ? (
              <div className="flex flex-col h-full">
                {/* 편집 모드 상단 툴바 */}
                <div className="flex items-center justify-between gap-4 pb-4 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">카테고리:</label>
                    <select
                      value={editCategoryId || ''}
                      onChange={(e) => setEditCategoryId(Number(e.target.value))}
                      className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800 dark:text-white"
                    >
                      {categories.filter(cat => !cat.parent_id).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center min-h-[2rem]">
                    {savingState === 'saving' && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium animate-pulse transition-all">
                        <Loader className="w-3 h-3 animate-spin" />
                        <span>자동 저장 중...</span>
                      </div>
                    )}
                    {savingState === 'saved' && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium transition-all animate-in fade-in duration-300">
                        <Check className="w-3 h-3" />
                        <span>저장 완료</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSummarize}
                      disabled={isSummarizing}
                      className="px-3 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                      title="내용 요약"
                    >
                      {isSummarizing ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                          const title = prompt("템플릿 이름을 입력하세요:", editTitle);
                          if (title) {
                              saveTemplate(title, editContent, "사용자 정의 템플릿");
                          }
                      }}
                      className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                      title="현재 내용을 템플릿으로 저장"
                    >
                      <LayoutTemplate className="w-4 h-4" />
                    </button>
                    <button
                      onClick={saveNote}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      저장
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <X className="w-4 h-4" />
                      취소
                    </button>
                  </div>
                </div>
                
                {/* 리치 텍스트 에디터 컴포넌트 */}
                <div 
                  className="flex-1 mt-4 overflow-hidden relative"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                >
                  <RichTextEditor 
                    key={selectedNote.id}
                    content={editContent}
                    onChange={setEditContent}
                    onPaste={handlePaste}
                    onSave={handleSaveContent}
                  />
                  {isDragOver && (
                    <div className="absolute inset-0 bg-blue-50/90 dark:bg-gray-800/90 border-2 border-dashed border-blue-500 rounded-xl flex flex-col items-center justify-center z-30 pointer-events-none backdrop-blur-sm animate-in fade-in duration-200">
                      <div className="p-4 bg-white dark:bg-gray-700 rounded-full shadow-lg mb-4 animate-bounce">
                        <Upload className="w-8 h-8 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">이미지를 여기에 놓으세요</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">자동으로 최적화되어 업로드됩니다</p>
                    </div>
                  )}
                  {isOptimizingImage && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-20 backdrop-blur-sm">
                      <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 border border-gray-200 dark:border-gray-700">
                        <Loader className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">이미지 최적화 및 업로드 중...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // 조회 모드 (HTML 렌더링)
              selectedNote.content === null ? (
                <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>내용 불러오는 중...</span>
                </div>
              ) : (
                <div 
                  ref={viewContentRef}
                  className="prose prose-slate dark:prose-invert max-w-none overflow-y-auto h-full pr-4" 
                  dangerouslySetInnerHTML={{ __html: processedViewContent || '<p class="text-gray-400 italic">내용이 없습니다. 편집 버튼을 눌러 내용을 추가하세요.</p>' }} 
                />
              )
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center flex flex-col items-center">
            {!dbReady ? (
               <>
                 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
                 <p className="text-lg">데이터베이스 로딩 중...</p>
               </>
            ) : (
               <>
                 <Edit2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                 <p className="text-lg">노트를 선택하거나 새로 만들어보세요</p>
               </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}