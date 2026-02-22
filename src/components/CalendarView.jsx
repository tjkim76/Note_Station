import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarView({ notes, selectedDate, onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 해당 월의 총 일수 및 첫째 날의 요일 계산
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  // 날짜별 노트 매핑 (createdAt 기준, 성능 최적화를 위해 useMemo 사용)
  const notesByDate = useMemo(() => {
    const map = {};
    notes.forEach(note => {
      const date = new Date(note.createdAt).toDateString();
      if (!map[date]) map[date] = [];
      map[date].push(note);
    });
    return map;
  }, [notes]);

  // 달력 날짜 렌더링
  const renderDays = () => {
    const days = [];
    // 이전 달의 빈 공간 채우기
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = dateObj.toDateString();
      const hasNotes = notesByDate[dateStr]?.length > 0;
      const isSelected = selectedDate && selectedDate.toDateString() === dateStr;
      const isToday = new Date().toDateString() === dateStr;

      days.push(
        <button
          key={d}
          onClick={() => onSelectDate(isSelected ? null : dateObj)}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm relative transition-colors
            ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
            ${isToday && !isSelected ? 'border border-blue-500 text-blue-500' : ''}
          `}
        >
          {d}
          {hasNotes && !isSelected && (
            <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full"></div>
          )}
          {hasNotes && isSelected && (
             <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full"></div>
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <span className="font-semibold text-gray-800 dark:text-gray-200">
          {year}년 {month + 1}월
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="text-xs text-gray-400 font-medium">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 justify-items-center">
        {renderDays()}
      </div>
    </div>
  );
}