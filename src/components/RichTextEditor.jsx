import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, CheckSquare,
  Link, Eraser, Type, Highlighter, Code, Table,
  Undo, Redo, Indent, Outdent, Quote, Minus,
  Maximize, Minimize, Search, X, Mic, MicOff, ArrowUpDown, Sigma
} from 'lucide-react';
import { ColorPicker, EmojiPicker } from './EditorComponents';
import { useImageResize } from '../hooks/useImageResize';
import { API_BASE } from '../config';
import katex from 'katex';

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
  const [stats, setStats] = useState({ chars: 0, charsNoSpace: 0, words: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  // 글자 수 및 단어 수 업데이트
  const updateStats = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const charsNoSpace = text.replace(/\s/g, '').length;
      setStats({
        chars: text.length,
        charsNoSpace,
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
      // KaTeX 스타일 로드
      if (!document.getElementById('katex-style')) {
        const link = document.createElement('link');
        link.id = 'katex-style';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
        document.head.appendChild(link);
      }

      let initialHTML = content || '';
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

  // 비동기로 콘텐츠가 로드되었을 때 에디터 업데이트 (초기값이 null이었던 경우)
  useEffect(() => {
    if (content !== null && (initialContent.current === null || initialContent.current === undefined) && editorRef.current) {
      let html = content || '';
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        html = html.replace(/src="(http:\/\/[^"]+)"/g, (match, url) => {
          return `src="${API_BASE}/api/proxy?url=${encodeURIComponent(url)}"`;
        });
      }
      
      editorRef.current.innerHTML = html;
      initialContent.current = content;
      updateStats();

      // 체크박스 스타일 적용
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
    }
  }, [content]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // 음성 인식 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'ko-KR';

        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript;
            }
          }
          if (transcript) {
            document.execCommand('insertText', false, transcript + ' ');
            handleInput();
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome, Edge, Safari 등을 사용해주세요.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 전체 화면 모드에서 Esc 키로 종료
  useEffect(() => {
    if (!isFullScreen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullScreen]);

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

  // 폰트 크기 변경 (px 단위 지원)
  const applyFontSize = (size) => {
    // styleWithCSS를 끄고 fontSize 7(가장 큰 크기)을 적용하여 <font size="7"> 태그 생성
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontSize', false, '7');
    
    // 생성된 <font size="7"> 태그를 찾아 인라인 스타일로 교체
    const fontElements = editorRef.current.querySelectorAll('font[size="7"]');
    fontElements.forEach(font => {
      font.removeAttribute('size');
      font.style.fontSize = size;
    });
    
    handleInput();
  };

  // 줄 간격 변경
  const applyLineHeight = (value) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const editor = editorRef.current;

    const getBlockParent = (node) => {
      let curr = node;
      while (curr && curr !== editor) {
        if (curr.nodeType === 1) {
          const display = window.getComputedStyle(curr).display;
          if (display === 'block' || display === 'list-item' || display === 'flex') {
            return curr;
          }
        }
        curr = curr.parentNode;
      }
      return null;
    };

    const startBlock = getBlockParent(range.startContainer);
    const endBlock = getBlockParent(range.endContainer);

    if (startBlock) {
      startBlock.style.lineHeight = value;
      if (startBlock !== endBlock && endBlock) {
         endBlock.style.lineHeight = value;
         // 형제 노드들도 처리 (다중 문단 선택 시)
         if (startBlock.parentNode === endBlock.parentNode) {
             let next = startBlock.nextElementSibling;
             while(next && next !== endBlock) {
                 next.style.lineHeight = value;
                 next = next.nextElementSibling;
             }
         }
      }
    }
    handleInput();
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

  // 수식 삽입
  const insertMath = () => {
    const latex = prompt('LaTeX 수식을 입력하세요 (예: E = mc^2):');
    if (latex) {
      try {
        const html = katex.renderToString(latex, {
          throwOnError: false
        });
        execCommand('insertHTML', `&nbsp;<span contenteditable="false">${html}</span>&nbsp;`);
      } catch (e) {
        alert('수식 변환 중 오류가 발생했습니다.');
      }
    }
  };

  // 찾기 및 바꾸기 로직
  const findNext = () => {
    if (!findText) return;
    
    // 검색 시작 전, 선택 영역이 에디터 외부에 있다면 에디터 처음으로 이동 (입력창 포커스 문제 해결)
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editorRef.current && !editorRef.current.contains(range.commonAncestorContainer)) {
             const newRange = document.createRange();
             newRange.selectNodeContents(editorRef.current);
             newRange.collapse(true);
             selection.removeAllRanges();
             selection.addRange(newRange);
        }
    }

    window.find(findText, false, false, true, false, false, false);
  };

  const replace = () => {
    if (!findText) return;
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // 현재 선택된 텍스트가 검색어와 일치하는지 확인 (에디터 내부인지 체크)
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
          if (range.toString().toLowerCase() === findText.toLowerCase()) {
             document.execCommand('insertText', false, replaceText);
             handleInput();
             findNext(); // 다음 항목 찾기
          } else {
             findNext(); // 일치하지 않으면 다음 항목 찾기
          }
      } else {
          findNext();
      }
    }
  };

  const replaceAll = () => {
    if (!findText) return;
    
    // 에디터 처음부터 시작
    const editor = editorRef.current;
    if (editor) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    let count = 0;
    // 반복해서 찾고 바꾸기
    while (window.find(findText, false, false, false, false, false, false)) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && editorRef.current && editorRef.current.contains(selection.getRangeAt(0).commonAncestorContainer)) {
            document.execCommand('insertText', false, replaceText);
            count++;
        } else { break; } // 에디터 범위를 벗어나면 중단
        if (count > 1000) break; // 무한 루프 방지
    }
    handleInput();
  };

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 flex flex-col h-full shadow-sm ${isFullScreen ? 'fixed inset-0 z-50 rounded-none border-0' : ''}`}>
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
        blockquote {
          border-left: 4px solid #e2e8f0;
          padding-left: 1rem;
          margin: 0.5rem 0;
          color: #64748b;
        }
        .dark blockquote {
          border-left-color: #4b5563;
          color: #94a3b8;
        }
      `}</style>
      <div className="sticky top-0 z-10 flex gap-1 flex-wrap p-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 items-center">
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('undo')} title="실행 취소 (Ctrl+Z)"><Undo className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('redo')} title="다시 실행 (Ctrl+Y)"><Redo className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
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
          <option value="Pretendard">Pretendard</option>
          <option value="Nanum Gothic">나눔고딕</option>
          <option value="Nanum Myeongjo">나눔명조</option>
          <option value="Nanum Pen Script">나눔펜</option>
          <option value="Noto Sans KR">Noto Sans KR</option>
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
          <option value="Helvetica">Helvetica</option>
          <option value="Comic Sans MS">Comic Sans MS</option>
        </select>
        <select 
          onChange={(e) => { applyFontSize(e.target.value); e.target.value = ''; }} 
          className="px-2 py-1 text-sm text-gray-600 dark:text-gray-200 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer focus:outline-none dark:bg-gray-800"
          title="글자 크기"
          defaultValue=""
        >
          <option value="">크기</option>
          <option value="10px">10px</option>
          <option value="11px">11px</option>
          <option value="12px">12px</option>
          <option value="13px">13px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="30px">30px</option>
          <option value="32px">32px</option>
          <option value="36px">36px</option>
          <option value="48px">48px</option>
          <option value="60px">60px</option>
          <option value="72px">72px</option>
          <option value="96px">96px</option>
        </select>
        <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-md ml-1 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors h-[28px]">
          <div className="pl-1.5 text-gray-600 dark:text-gray-200">
            <ArrowUpDown className="w-3 h-3" />
          </div>
          <select 
            onChange={(e) => { applyLineHeight(e.target.value); e.target.value = ''; }} 
            className="px-1 py-1 text-sm text-gray-600 dark:text-gray-200 bg-transparent cursor-pointer focus:outline-none dark:bg-gray-800 w-[4.5rem] h-full"
            title="줄 간격"
            defaultValue=""
          >
            <option value="">간격</option>
            <option value="1.0">1.0</option>
            <option value="1.15">1.15</option>
            <option value="1.2">1.2</option>
            <option value="1.4">1.4</option>
            <option value="1.5">1.5</option>
            <option value="1.6">1.6</option>
            <option value="1.8">1.8</option>
            <option value="2.0">2.0</option>
            <option value="2.5">2.5</option>
            <option value="3.0">3.0</option>
          </select>
        </div>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('justifyLeft')} title="왼쪽 정렬"><AlignLeft className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('justifyCenter')} title="가운데 정렬"><AlignCenter className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('justifyRight')} title="오른쪽 정렬"><AlignRight className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('outdent')} title="내어쓰기"><Outdent className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('indent')} title="들여쓰기"><Indent className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('formatBlock', 'BLOCKQUOTE')} title="인용구"><Quote className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('insertHorizontalRule')} title="구분선"><Minus className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
        <div className="flex items-center gap-1">
          <ColorPicker icon={Type} title="글자 색상" onChange={(color) => execCommand('foreColor', color)} />
          <ColorPicker icon={Highlighter} title="배경 색상" onChange={(color) => execCommand('hiliteColor', color)} />
        </div>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={insertLink} title="링크 삽입"><Link className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={insertCodeBlock} title="코드 블록"><Code className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={insertMath} title="수식 삽입"><Sigma className="w-4 h-4" /></button>
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={insertCheckbox} title="체크박스 (To-Do)"><CheckSquare className="w-4 h-4" /></button>
        <TablePicker onInsert={insertTable} />
        <EmojiPicker onInsert={insertEmoji} />
        <button className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" onClick={() => execCommand('removeFormat')} title="서식 지우기"><Eraser className="w-4 h-4" /></button>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
        <button 
          className={`p-1.5 rounded-md transition-colors ${isListening ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse' : 'text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`} 
          onClick={toggleListening} 
          title={isListening ? "음성 입력 중지" : "음성 입력 시작"}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
        <button 
          className={`p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors ${showFindReplace ? 'bg-gray-200 dark:bg-gray-700' : ''}`} 
          onClick={() => setShowFindReplace(!showFindReplace)} 
          title="찾기 및 바꾸기"
        >
          <Search className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-2"></div>
        <button 
          className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" 
          onClick={() => setIsFullScreen(!isFullScreen)} 
          title={isFullScreen ? "전체 화면 종료 (Esc)" : "전체 화면"}
        >
          {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
      
      {showFindReplace && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2">
          <input 
            type="text" 
            value={findText} 
            onChange={(e) => setFindText(e.target.value)} 
            placeholder="찾을 내용" 
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 w-32"
            onKeyDown={(e) => e.key === 'Enter' && findNext()}
          />
          <input 
            type="text" 
            value={replaceText} 
            onChange={(e) => setReplaceText(e.target.value)} 
            placeholder="바꿀 내용" 
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500 w-32"
            onKeyDown={(e) => e.key === 'Enter' && replace()}
          />
          <button onClick={findNext} className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white whitespace-nowrap">찾기</button>
          <button onClick={replace} className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white whitespace-nowrap">바꾸기</button>
          <button onClick={replaceAll} className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white whitespace-nowrap">모두 바꾸기</button>
          <button onClick={() => setShowFindReplace(false)} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

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
            className="absolute border-2 border-blue-500 pointer-events-none z-50"
          >
            {/* 좌상단 (NW) */}
            <div
              className="image-resize-handle absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 cursor-nwse-resize pointer-events-auto shadow-sm"
              onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
            />
            {/* 우상단 (NE) */}
            <div
              className="image-resize-handle absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 cursor-nesw-resize pointer-events-auto shadow-sm"
              onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
            />
            {/* 좌하단 (SW) */}
            <div
              className="image-resize-handle absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 cursor-nesw-resize pointer-events-auto shadow-sm"
              onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
            />
            {/* 우하단 (SE) */}
            <div
              className="image-resize-handle absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 cursor-nwse-resize pointer-events-auto shadow-sm"
              onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
            />
          </div>
        )}
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-300 flex justify-end gap-3">
        <span>단어: {stats.words}</span>
        <span>글자(공백포함): {stats.chars}</span>
        <span>글자(공백제외): {stats.charsNoSpace}</span>
      </div>
    </div>
  );
}