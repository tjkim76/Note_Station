import { useState, useCallback, useMemo } from 'react';
import { API_BASE } from '../config';

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // UI 상태
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [addingSubcategoryParentId, setAddingSubcategoryParentId] = useState(null);

  const loadCategories = useCallback(async (db, animate = false, dbName, signal) => {
    // dbName이 인자로 전달되지 않으면 db 객체에서 추출 시도 (App.jsx 구조에 따라 다름)
    // 여기서는 useDatabase에서 currentDbName을 전달받는 것이 좋으나, 
    // 기존 구조 유지를 위해 db 객체 사용을 최소화하고 API 호출로 변경
    const currentDbName = dbName || (sessionStorage.getItem('note_station_username') ? `note_${sessionStorage.getItem('note_station_username')}` : null);
    if (!currentDbName) return [];

    setIsLoading(true);
    setError(null);
    try {
      if (signal?.aborted) return [];

      const response = await fetch(`${API_BASE}/api/categories`, {
        credentials: 'include',
        signal: signal instanceof AbortSignal ? signal : undefined,
        cache: 'no-store'
      });

      if (signal?.aborted) return [];

      if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      
      if (signal?.aborted) return [];

      let loadedCategories = data.map(row => ({
        ...row,
        is_favorite: row.is_favorite === 1
      }));

      if (!Array.isArray(loadedCategories)) {
          loadedCategories = [];
      }

      const updateState = () => setCategories(loadedCategories);

      if (animate && document.startViewTransition) {
        document.startViewTransition(updateState);
      } else {
        updateState();
      }

      return loadedCategories;
    } catch (error) {
      if (error.name === 'AbortError' || signal?.aborted) return [];
      if (error.message === 'Unauthorized') {
        window.dispatchEvent(new CustomEvent('note-app:unauthorized'));
        return [];
      }
      if (error.message === 'Failed to fetch') return [];
      console.error('Error loading categories:', error);
      setError(error);
      return [];
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const addCategory = useCallback(async (db, saveDB, dbName) => {
    const currentDbName = dbName || (sessionStorage.getItem('note_station_username') ? `note_${sessionStorage.getItem('note_station_username')}` : null);
    if (newCategoryName.trim() && currentDbName) {
      try {
        const response = await fetch(`${API_BASE}/api/categories`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newCategoryName.trim(), parentId: null })
        });
        
        if (!response.ok) {
            const data = await response.json();
            alert(data.error || '카테고리 추가 실패');
            return;
        }
        
        loadCategories(null, false, currentDbName);
        setNewCategoryName('');
      } catch (error) {
        console.error('Error adding category:', error);
      }
    }
  }, [newCategoryName, loadCategories]);

  const addSubcategory = useCallback(async (db, saveDB, parentId, dbName) => {
    const currentDbName = dbName || (sessionStorage.getItem('note_station_username') ? `note_${sessionStorage.getItem('note_station_username')}` : null);
    if (newCategoryName.trim() && currentDbName) {
      try {
        const response = await fetch(`${API_BASE}/api/categories`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newCategoryName.trim(), parentId })
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.error || '하위 카테고리 추가 실패');
            return;
        }

        loadCategories(null, false, currentDbName);
        setNewCategoryName('');
      } catch (error) {
        console.error('Error adding subcategory:', error);
      }
    }
  }, [newCategoryName, loadCategories]);

  const reorderCategory = useCallback(async (db, saveDB, sourceId, targetId, dbName) => {
    const currentDbName = dbName || (sessionStorage.getItem('note_station_username') ? `note_${sessionStorage.getItem('note_station_username')}` : null);
    if (!currentDbName) return;

    const sourceCat = categories.find(c => c.id === sourceId);
    const targetCat = categories.find(c => c.id === targetId);

    if (!sourceCat || !targetCat) return;
    if (sourceCat.parent_id !== targetCat.parent_id) return; // 같은 레벨끼리만 이동 가능

    const siblings = categories.filter(c => c.parent_id === sourceCat.parent_id);
    
    const sourceIndex = siblings.findIndex(c => c.id === sourceId);
    const targetIndex = siblings.findIndex(c => c.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

    const newSiblings = [...siblings];
    const [moved] = newSiblings.splice(sourceIndex, 1);
    newSiblings.splice(targetIndex, 0, moved);

    try {
      const updates = newSiblings.map((cat, index) => ({ id: cat.id, orderIndex: index }));
      await fetch(`${API_BASE}/api/categories/reorder`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
      });
      
      loadCategories(null, true, currentDbName); // 순서 변경 시 애니메이션 적용
    } catch (e) {
      console.error("Error reordering categories", e);
    }
  }, [categories, loadCategories]);

  const toggleFavoriteCategory = useCallback(async (db, saveDB, categoryId, dbName) => {
    const currentDbName = dbName || (sessionStorage.getItem('note_station_username') ? `note_${sessionStorage.getItem('note_station_username')}` : null);
    if (!currentDbName) return;
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const newFavoriteStatus = !category.is_favorite;
    try {
      await fetch(`${API_BASE}/api/categories/${categoryId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavorite: newFavoriteStatus })
      });
      loadCategories(null, false, currentDbName);
    } catch (error) {
      console.error('Error toggling favorite category:', error);
    }
  }, [categories, loadCategories]);

  const updateCategory = useCallback(async (db, saveDB, categoryId, newName, dbName) => {
    const currentDbName = dbName || (sessionStorage.getItem('note_station_username') ? `note_${sessionStorage.getItem('note_station_username')}` : null);
    if (!currentDbName) return;

    if (newName.trim()) {
      try {
        await fetch(`${API_BASE}/api/categories/${categoryId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() })
        });
        
        loadCategories(null, false, currentDbName);
        setEditingCategoryId(null);
        setEditingCategoryName('');
      } catch (error) {
        console.error('Error updating category:', error);
      }
    } else {
      alert('카테고리 이름을 입력해주세요.');
    }
  }, [loadCategories]);

  const deleteCategory = useCallback(async (db, saveDB, categoryToDelete, onComplete, dbName) => {
    const currentDbName = dbName || (sessionStorage.getItem('note_station_username') ? `note_${sessionStorage.getItem('note_station_username')}` : null);
    if (categoryToDelete === '전체' || !currentDbName) return;
    
    try {
      const cat = categories.find(c => c.name === categoryToDelete);
      const catId = cat?.id;
      if (!catId) return;
      
      await fetch(`${API_BASE}/api/categories/${catId}`, {
          method: 'DELETE',
          credentials: 'include'
      });
      
      loadCategories(null, true, currentDbName);
      
      if (selectedCategory === catId) {
        // 삭제된 카테고리가 선택되어 있었다면, 첫 번째 카테고리(전체)로 변경
        const firstCat = categories.find(c => !c.parent_id); // 대충 첫번째
        setSelectedCategory(firstCat ? firstCat.id : null);
      }

      if (onComplete) onComplete(); // 노트 목록 새로고침 등을 위한 콜백
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }, [selectedCategory, loadCategories, categories]);

  const categoryTree = useMemo(() => {
    const cats = [...categories];
    const tree = [];
    const map = {};
    cats.forEach(cat => {
        map[cat.id] = { ...cat, children: [] };
    });
    cats.forEach(cat => {
        if (cat.parent_id && map[cat.parent_id]) {
            map[cat.parent_id].children.push(map[cat.id]);
        } else {
            tree.push(map[cat.id]);
        }
    });
    // The order is already handled by the SQL query, so this should be fine.
    return tree;
  }, [categories]);

  const favoriteCategories = useMemo(() => {
    return categories.filter(c => c.is_favorite);
  }, [categories]);

  return {
    categories,
    selectedCategory,
    setSelectedCategory,
    newCategoryName,
    setNewCategoryName,
    editingCategoryId,
    setEditingCategoryId,
    editingCategoryName,
    setEditingCategoryName,
    addingSubcategoryParentId,
    setAddingSubcategoryParentId,
    loadCategories,
    addCategory,
    addSubcategory,
    categoryTree,
    favoriteCategories,
    reorderCategory,
    toggleFavoriteCategory,
    updateCategory,
    deleteCategory,
    isLoading,
    error
  };
}