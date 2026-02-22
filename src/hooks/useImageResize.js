import { useState, useRef, useEffect, useCallback } from 'react';

export function useImageResize(editorRef, onResizeEnd) {
  const [selectedImage, setSelectedImage] = useState(null);
  const resizerRef = useRef(null);

  // 에디터 내부 클릭을 감지하여 이미지 선택/해제
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleClick = (e) => {
      const target = e.target;
      if (target.tagName === 'IMG' && editor.contains(target)) {
        setSelectedImage(target);
      } else if (selectedImage) {
        const isResizeHandle = target.classList.contains('image-resize-handle');
        if (target !== selectedImage && !isResizeHandle) {
          setSelectedImage(null);
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [selectedImage, editorRef]);

  // 리사이저 위치 및 크기 업데이트 함수
  const updateResizer = useCallback(() => {
    const editor = editorRef.current;
    const resizer = resizerRef.current;

    if (selectedImage && resizer && editor && document.body.contains(selectedImage)) {
      const imageRect = selectedImage.getBoundingClientRect();
      const editorRect = editor.getBoundingClientRect();

      resizer.style.top = `${imageRect.top - editorRect.top + editor.scrollTop}px`;
      resizer.style.left = `${imageRect.left - editorRect.left + editor.scrollLeft}px`;
      resizer.style.width = `${imageRect.width}px`;
      resizer.style.height = `${imageRect.height}px`;
    }
  }, [selectedImage, editorRef]);

  // 선택된 이미지에 리사이저를 표시하고 위치를 업데이트
  useEffect(() => {
    const editor = editorRef.current;

    if (selectedImage && editor) {
      updateResizer();
      const updatePosition = () => updateResizer();
      editor.addEventListener('scroll', updatePosition, { passive: true });
      window.addEventListener('resize', updatePosition, { passive: true });

      return () => {
        editor.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [selectedImage, editorRef, updateResizer]);

  // 리사이즈 핸들 드래그 로직
  const handleResizeMouseDown = useCallback((e, direction) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedImage) return;

    const startX = e.clientX;
    const startWidth = selectedImage.offsetWidth;
    
    // 왼쪽 핸들(nw, sw)인 경우 마우스를 왼쪽으로 움직여야 커짐 (dx 반전)
    const isLeft = direction === 'nw' || direction === 'sw';

    const doDrag = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const change = isLeft ? -dx : dx;
      
      let newWidth = startWidth + change;
      if (newWidth < 50) newWidth = 50; // 최소 너비 50px

      selectedImage.style.width = `${newWidth}px`;
      selectedImage.style.height = 'auto'; // 비율 유지
      
      // 리사이즈 중에도 오버레이 위치/크기 동기화 (중앙 정렬 이미지 등 대응)
      updateResizer();
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      if (onResizeEnd) onResizeEnd(); // 변경된 내용(이미지 크기) 저장 알림
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  }, [selectedImage, onResizeEnd, updateResizer]);

  return {
    selectedImage,
    setSelectedImage,
    resizerRef,
    handleResizeMouseDown
  };
}