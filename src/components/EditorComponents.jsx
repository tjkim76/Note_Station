import React, { useState, useRef, useEffect } from 'react';
import { Table, Smile } from 'lucide-react';
import { COLORS, COMMON_EMOJIS } from '../utils/constants';

export const ColorPicker = ({ icon: Icon, title, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center justify-center"
        onClick={() => setIsOpen(!isOpen)}
        title={title}
      >
        <Icon className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 w-64">
          <div className="grid grid-cols-10 gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                className="w-5 h-5 rounded-sm border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
                title={color}
              />
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
             <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded justify-center">
                <span>사용자 지정...</span>
                <input 
                    type="color" 
                    className="w-0 h-0 opacity-0 absolute" 
                    onChange={(e) => {
                        onChange(e.target.value);
                        setIsOpen(false);
                    }}
                />
             </label>
          </div>
        </div>
      )}
    </div>
  );
};

export const TablePicker = ({ onInsert }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverSize, setHoverSize] = useState({ rows: 0, cols: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setHoverSize({ rows: 0, cols: 0 });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center justify-center"
        onClick={() => setIsOpen(!isOpen)}
        title="표 삽입"
      >
        <Table className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 select-none">
          <div className="mb-2 text-center text-sm text-gray-600 dark:text-gray-200 font-medium">
            {hoverSize.rows > 0 ? `${hoverSize.rows} x ${hoverSize.cols}` : '표 크기 선택'}
          </div>
          <div className="grid grid-cols-10 gap-1" onMouseLeave={() => setHoverSize({ rows: 0, cols: 0 })}>
            {Array.from({ length: 100 }).map((_, i) => {
              const row = Math.floor(i / 10) + 1;
              const col = (i % 10) + 1;
              const isActive = row <= hoverSize.rows && col <= hoverSize.cols;
              return (
                <div
                  key={i}
                  className={`w-4 h-4 border cursor-pointer transition-colors ${
                    isActive ? 'bg-blue-200 dark:bg-blue-900 border-blue-500' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                  onMouseEnter={() => setHoverSize({ rows: row, cols: col })}
                  onClick={() => {
                    onInsert(row, col);
                    setIsOpen(false);
                    setHoverSize({ rows: 0, cols: 0 });
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const EmojiPicker = ({ onInsert }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="p-1.5 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center justify-center"
        onClick={() => setIsOpen(!isOpen)}
        title="이모지 삽입"
      >
        <Smile className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 w-64 h-64 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-8 gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-lg"
                onClick={() => {
                  onInsert(emoji);
                  setIsOpen(false);
                }}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};