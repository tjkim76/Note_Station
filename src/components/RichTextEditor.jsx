import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, CheckSquare,
  Link, Eraser, Type, Highlighter, Code, Table
} from 'lucide-react';
import { ColorPicker, EmojiPicker } from './EditorComponents';
import { useImageResize } from '../hooks/useImageResize';
import { API_BASE } from '../config';

// 표 삽입 피커 컴포넌트
const TablePicker = ({ onInsert }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverSize, setHoverSize] = useState({ rows: 0, cols: 0 });
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
        setHoverSize({ rows: 0, cols: 0 });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInsert = () => {
    if (hoverSize.rows > 0 && hoverSize.cols > 0) {
      onInsert(hoverSize.rows, hoverSize.cols);
      setIsOpen(false);
      setHoverSize({ rows: 0, cols: 0 });
    }
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        className={`p-1.5 rounded-md transition-colors ${isOpen ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        onClick={() => setIsOpen(!isOpen)}
        title="표 삽입"
      >
        <Table className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 z-50 w-64">
          <div className="mb-2 text-sm font-medium text-center text-gray-700 dark:text-gray-300">
            {hoverSize.rows > 0 ? `${hoverSize.rows} x ${hoverSize.cols}` : '표 크기 선택'}
          </div>
          <div 
            className="grid gap-1" 
            style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}
            onMouseLeave={() => setHoverSize({ rows: 0, cols: 0 })}
          >
            {[...Array(10)].map((_, r) => (
              [...Array(10)].map((_, c) => {
                const row = r + 1;
                const col = c + 1;
                const isActive = row <= hoverSize.rows && col <= hoverSize.cols;
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`w-4 h-4 border rounded-sm cursor-pointer transition-colors ${
                      isActive 
                        ? 'bg-blue-500 border-blue-600' 
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-300'
                    }`}
                    onMouseEnter={() => setHoverSize({ rows: row, cols: col })}
                    onClick={handleInsert}
                  />
                );
              })
            ))}
          </div>
          <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
            최대 10x10
          </div>
        </div>
      )}
    </div>
  );
};

// 리치 텍스트 에디터 컴포넌트 (contentEditable 사용)
export default function RichTextEditor({ content, onChange, onPaste, onSave }) {
  const editorRef = useRef(null);
  const initialContent = useRef(content);
  const [stats, setStats] = useState({ chars: 0, words: 0 });
  const timeoutRef = useRef(null);

  // 글자 수 및 단어 수 업데이트
  const updateStats = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      setStats({
        chars: text.length,
        words: text.trim() === '' ? 0 : text.trim().split(/\s+/).length
      });
    }
  };

  // 입력 핸들러 (변경 사항 감지 및 디바운스 처리)
  const handleInput = () => {
    if (editorRef.current) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onChange(editorRef.current.innerHTML);
        updateStats();
      }, 300);
    }
  };

  // 이미지 리사이징 훅 사용 (이미지 클릭 시 크기 조절 핸들 표시)
  const { selectedImage, resizerRef, handleResizeMouseDown } = useImageResize(editorRef, handleInput);

  // 컴포넌트 마운트 시 초기 콘텐츠 설정 및 체크박스 스타일 적용
  useEffect(() => {
    if (editorRef.current) {
      let initialHTML = content;
      // Mixed Content 해결: HTTPS 환경에서 HTTP 이미지인 경우 프록시 사용
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        initialHTML = initialHTML.replace(/src="(http:\/\/[^"]+)"/g, (match, url) => {
          return `src="${API_BASE}/api/proxy?url=${encodeURIComponent(url)}"`;
        });
      }

      editorRef.current.innerHTML = initialHTML;
      
      // 초기 로드 시 체크된 항목 스타일 적용
      const checkboxes = editorRef.current.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        if (cb.hasAttribute('checked')) {
          cb.checked = true;
          if (cb.parentElement) {
            cb.parentElement.style.textDecoration = 'line-through';
            cb.parentElement.style.color = '#9ca3af';
          }
        }
      });

      updateStats();
    }
  }, []); // 마운트 시에만 실행

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // 체크박스 클릭 이벤트 처리 (체크 상태 변경 및 스타일 적용)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleCheckboxClick = (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
        const parent = e.target.parentElement;
        if (e.target.checked) {
          e.target.setAttribute('checked', 'true');
          if (parent) {
            parent.style.textDecoration = 'line-through';
            parent.style.color = '#9ca3af';
          }
        } else {
          e.target.removeAttribute('checked');
          if (parent) {
            parent.style.textDecoration = 'none';
            parent.style.color = '';
          }
        }
        handleInput(); // 변경 사항 저장 트리거
      }
    };

    editor.addEventListener('click', handleCheckboxClick);
    return () => editor.removeEventListener('click', handleCheckboxClick);
  }, [onChange]); // onChange가 변경될 때마다 리스너 갱신

  // 단축키 처리 (Ctrl+S 저장 및 Markdown 문법 지원)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleKeyDown = (e) => {
      // Ctrl+S: 저장
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const currentHTML = editor.innerHTML;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        onChange(currentHTML); // 상태 동기화
        if (onSave) onSave(currentHTML); // 저장 요청
        return;
      }

      // 이미지 삭제 (Delete/Backspace) - 이미지가 선택된 상태일 때
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImage) {
        e.preventDefault();
        selectedImage.remove();
        handleInput();
      }

      // Markdown 단축키 (스페이스바 입력 시 동작)
      if (e.key === ' ') {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const node = range.startContainer;

        // 텍스트 노드이고 커서가 텍스트 내부에 있을 때
        if (node.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
          const text = node.textContent.slice(0, range.startOffset);
          
          const patterns = {
            '#': { cmd: 'formatBlock', val: 'H1' },
            '##': { cmd: 'formatBlock', val: 'H2' },
            '###': { cmd: 'formatBlock', val: 'H3' },
            '-': { cmd: 'insertUnorderedList' },
            '*': { cmd: 'insertUnorderedList' },
            '1.': { cmd: 'insertOrderedList' },
            '>': { cmd: 'formatBlock', val: 'BLOCKQUOTE' },
          };

          if (patterns[text]) {
            e.preventDefault();
            const { cmd, val } = patterns[text];
            
            // 패턴 텍스트 삭제 (예: "# " 제거)
            const rangeToDelete = document.createRange();
            rangeToDelete.setStart(node, 0);
            rangeToDelete.setEnd(node, range.startOffset);
            rangeToDelete.deleteContents();

            // 서식 적용
            document.execCommand(cmd, false, val);
          }
        }
      }
    };

    editor.addEventListener('keydown', handleKeyDown);
    return () => editor.removeEventListener('keydown', handleKeyDown);
  }, [onChange, onSave]);

  // document.execCommand 래퍼 함수
  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
  };

  // 선택 영역을 특정 태그로 감싸기
  const wrapSelection = (tagName) => {
    execCommand('formatBlock', tagName);
  };

  // 리스트 삽입
  const insertList = (ordered = false) => {
    execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
  };

  // 링크 삽입
  const insertLink = () => {
    const url = prompt('링크 URL을 입력하세요:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  // 표 삽입
  const insertTable = (rows, cols) => {
    if (rows > 0 && cols > 0) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      const borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';

      let html = `<table style="border-collapse: collapse; width: 100%; border: 1px solid ${borderColor}; margin-bottom: 1rem;"><tbody>`;
      for (let i = 0; i < rows; i++) {
        html += '<tr>';
        for (let j = 0; j < cols; j++) {
          html += `<td style="border: 1px solid ${borderColor}; padding: 8px; min-width: 50px;"><br /></td>`;
        }
        html += '</tr>';
      }
      html += '</tbody></table><p><br /></p>';
      execCommand('insertHTML', html);
    }
  };

  // 이모지 삽입
  const insertEmoji = (emoji) => {
    execCommand('insertHTML', emoji);
  };

  // 코드 블록 삽입
  const insertCodeBlock = () => {
    const html = `<pre><code>// 코드를 입력하세요</code></pre><p><br /></p>`;
    execCommand('insertHTML', html);
  };

  // 체크박스 삽입
  const insertCheckbox = () => {
    const html = '<div style="display: flex; align-items: center;"><input type="checkbox" style="margin-right: 6px; cursor: pointer;" />&nbsp;</div>';
    execCommand('insertHTML', html);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 flex flex-col h-full shadow-sm">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #cbd5e1;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #374151;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #4b5563;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background-color: #111827;
        }
        pre {
          background-color: #f1f5f9;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-family: monospace;
          margin: 0.5rem 0;
        }
        .dark pre {
          background-color: #1e293b;
          color: #e2e8f0;
        }
      `}</style>
      <div className="sticky top-0 z-10 flex gap-1 flex-wrap p-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 items-center">
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('bold')} title="굵게 (Ctrl+B)"><Bold className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('italic')} title="기울임 (Ctrl+I)"><Italic className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('underline')} title="밑줄 (Ctrl+U)"><Underline className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('strikeThrough')} title="취소선"><Strikethrough className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
        <select 
          onChange={(e) => { execCommand('fontName', e.target.value); e.target.value = ''; }} 
          className="px-2 py-1 text-sm text-gray-600 dark:text-gray-200 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer focus:outline-none dark:bg-gray-800"
          title="글꼴"
          defaultValue=""
        >
          <option value="">글꼴</option>
          <option value="Malgun Gothic">맑은 고딕</option>
          <option value="Gulim">굴림</option>
          <option value="Dotum">돋움</option>
          <option value="Batang">바탕</option>
          <option value="Gungsuh">궁서</option>
          <option value="Arial">Arial</option>
          <option value="Verdana">Verdana</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Trebuchet MS">Trebuchet MS</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courier New</option>
          <option value="Impact">Impact</option>
        </select>
        <select 
          onChange={(e) => { execCommand('fontSize', e.target.value); e.target.value = '2'; }} 
          className="px-2 py-1 text-sm text-gray-600 dark:text-gray-200 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer focus:outline-none dark:bg-gray-800"
          title="글자 크기"
          defaultValue="2"
        >
          <option value="1">11px</option>
          <option value="2">13px</option>
          <option value="3">16px</option>
          <option value="4">20px</option>
          <option value="5">24px</option>
          <option value="6">32px</option>
          <option value="7">48px</option>
        </select>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('justifyLeft')} title="왼쪽 정렬"><AlignLeft className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('justifyCenter')} title="가운데 정렬"><AlignCenter className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('justifyRight')} title="오른쪽 정렬"><AlignRight className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
        <div className="flex items-center gap-1">
          <ColorPicker icon={Type} title="글자 색상" onChange={(color) => execCommand('foreColor', color)} />
          <ColorPicker icon={Highlighter} title="배경 색상" onChange={(color) => execCommand('hiliteColor', color)} />
        </div>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={insertLink} title="링크 삽입"><Link className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={insertCodeBlock} title="코드 블록"><Code className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={insertCheckbox} title="체크박스 (To-Do)"><CheckSquare className="w-4 h-4" /></button>
        <TablePicker onInsert={insertTable} />
        <EmojiPicker onInsert={insertEmoji} />
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('removeFormat')} title="서식 지우기"><Eraser className="w-4 h-4" /></button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div 
          ref={editorRef} 
          className="h-full overflow-y-auto p-4 outline-none custom-scrollbar dark:text-gray-100" 
          contentEditable={true} 
          onInput={handleInput} 
          onPaste={onPaste} 
          suppressContentEditableWarning={true} 
          style={{ lineHeight: '1.6' }} 
        />
        {selectedImage && (
          <div
            ref={resizerRef}
            className="absolute border-2 border-blue-500"
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="image-resize-handle absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize"
              style={{ pointerEvents: 'auto' }}
              onMouseDown={handleResizeMouseDown}
            ></div>
          </div>
        )}
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-300 flex justify-end gap-3">
        <span>단어: {stats.words}</span>
        <span>글자: {stats.chars}</span>
      </div>
    </div>
  );
}