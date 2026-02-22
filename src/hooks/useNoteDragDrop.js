import { useState } from 'react';

export function useNoteDragDrop({ selectedNotes, itemData, reorderNote }) {
  const [dragOverNoteId, setDragOverNoteId] = useState(null);

  const handleDragStart = (e, noteId) => {
    if (selectedNotes.size > 1 && selectedNotes.has(noteId)) {
      const dragImage = document.createElement('div');
      dragImage.className = 'bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg font-bold text-sm flex items-center gap-2 absolute top-[-9999px] left-[-9999px] z-50';
      dragImage.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        ${selectedNotes.size}개 이동
      `;
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
    
    if (itemData.onDragStart) {
      itemData.onDragStart(e, noteId);
    }
  };

  const handleDragOver = (e, noteId) => {
    e.preventDefault();
    if (dragOverNoteId !== noteId) {
      setDragOverNoteId(noteId);
    }
  };

  const handleDrop = (e, targetNoteId) => {
    e.preventDefault();
    setDragOverNoteId(null);
    const sourceNoteId = e.dataTransfer.getData('text/plain');
    
    if (sourceNoteId && targetNoteId && Number(sourceNoteId) !== targetNoteId) {
      reorderNote(Number(sourceNoteId), targetNoteId);
    }
  };

  return {
    dragOverNoteId,
    handleDragStart,
    handleDragOver,
    handleDrop
  };
}