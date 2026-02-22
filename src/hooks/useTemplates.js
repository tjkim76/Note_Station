import { useState, useCallback } from 'react';
import { API_BASE } from '../config';
import { DEFAULT_TEMPLATES } from '../utils/templates';

export function useTemplates() {
  const [userTemplates, setUserTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTemplates = useCallback(async (signal) => {
    const currentDbName = sessionStorage.getItem('note_station_username') ? `note_${sessionStorage.getItem('note_station_username')}` : null;
    if (!currentDbName) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/templates`, {
        credentials: 'include',
        signal: signal instanceof AbortSignal ? signal : undefined,
        cache: 'no-store'
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      
      const loaded = Array.isArray(data) ? data.map(row => ({
        ...row,
        isUser: true
      })) : [];
      
      setUserTemplates([...DEFAULT_TEMPLATES, ...loaded]);
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (e.message === 'Unauthorized') {
        window.dispatchEvent(new CustomEvent('note-app:unauthorized'));
        return;
      }
      if (e.message === 'Failed to fetch') return;
      console.error("Error loading templates", e);
      setError(e);
      setUserTemplates(DEFAULT_TEMPLATES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveTemplate = useCallback(async (title, content, description = '') => {
    const currentDbName = sessionStorage.getItem('note_station_username') ? `note_${sessionStorage.getItem('note_station_username')}` : null;
    if (!currentDbName) return;

    try {
      await fetch(`${API_BASE}/api/templates`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, description })
      });
      await loadTemplates();
      alert('템플릿이 저장되었습니다.');
    } catch (e) {
      console.error("Error saving template", e);
      alert('템플릿 저장 실패');
    }
  }, [loadTemplates]);

  const deleteTemplate = useCallback(async (id) => {
    const currentDbName = sessionStorage.getItem('note_station_username') ? `note_${sessionStorage.getItem('note_station_username')}` : null;
    if (!currentDbName) return;
    if (DEFAULT_TEMPLATES.some(t => t.id === id)) {
      alert('기본 템플릿은 삭제할 수 없습니다.');
      return;
    }
    if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;

    try {
      await fetch(`${API_BASE}/api/templates/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      await loadTemplates();
    } catch (e) {
      console.error("Error deleting template", e);
    }
  }, [loadTemplates]);

  const updateTemplate = useCallback(async (id, title, description) => {
    const currentDbName = sessionStorage.getItem('note_station_username') ? `note_${sessionStorage.getItem('note_station_username')}` : null;
    if (!currentDbName) return;
    if (DEFAULT_TEMPLATES.some(t => t.id === id)) {
      alert('기본 템플릿은 수정할 수 없습니다.');
      return;
    }

    try {
      await fetch(`${API_BASE}/api/templates/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });
      await loadTemplates();
    } catch (e) {
      console.error("Error updating template", e);
    }
  }, [loadTemplates]);

  return {
    userTemplates,
    loadTemplates,
    saveTemplate,
    deleteTemplate,
    updateTemplate,
    isLoading,
    error
  };
}