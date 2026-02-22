import { useState, useEffect, useCallback, useRef } from 'react';
import { WS_BASE } from '../config';

export function useDatabase() {
  // dbReady는 이제 항상 true입니다 (서버 API 사용)
  const dbReady = true;
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'connected', 'disconnected', 'reconnecting'
  const [currentDbName, setCurrentDbName] = useState('member'); // 기본 DB는 member
  const wsRef = useRef(null);
  const connectionIntervalRef = useRef(null);
  const [connectionError, setConnectionError] = useState(null);
  const retryCountRef = useRef(0); // useState 대신 useRef 사용
  const MAX_RETRIES = 5;

  const currentDbNameRef = useRef(currentDbName);
  useEffect(() => { currentDbNameRef.current = currentDbName; }, [currentDbName]);

  // WebSocket 연결 설정 (서버와 실시간 동기화)
  const connectWebSocket = useCallback(() => {
    // 로그인하지 않은 상태(member DB)에서는 WebSocket 연결을 시도하지 않음
    if (currentDbNameRef.current === 'member') {
      if (connectionIntervalRef.current) {
        clearInterval(connectionIntervalRef.current);
        connectionIntervalRef.current = null;
      }
      // 이미 연결된 소켓이 있다면 닫기
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Don't try to connect if a connection is already open or in progress
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const ws = new WebSocket(WS_BASE);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      setConnectionError(null);
      retryCountRef.current = 0; // 연결 성공 시 재시도 횟수 초기화
      console.log('Connected to WebSocket server');
      if (connectionIntervalRef.current) {
        clearInterval(connectionIntervalRef.current);
        connectionIntervalRef.current = null;
      }

      // Heartbeat check
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'note_shared') {
            alert(`'${message.from}'님으로부터 '${message.title}' 노트를 공유받았습니다.`);
            // 여기서 노트를 다시 로드하는 등의 추가 작업을 할 수 있습니다.
          }
        } catch (e) { /* ignore */ }
      };
    };

    ws.onclose = () => {
      // Only retry if the component is still mounted.
      // wsRef.current will be null on unmount.
      setWsStatus('reconnecting');
      if (wsRef.current && retryCountRef.current < MAX_RETRIES) {
        // Exponential backoff: 2^retryCount * 1000ms, with a random factor
        const delay = Math.min(1000 * (2 ** retryCountRef.current) + Math.random() * 1000, 30000);
        console.debug(`WebSocket disconnected. Retrying in ${Math.round(delay / 1000)} seconds... (Attempt ${retryCountRef.current + 1})`);
        
        if (!connectionIntervalRef.current) {
          connectionIntervalRef.current = setTimeout(() => {
            retryCountRef.current += 1;
            connectWebSocket();
            connectionIntervalRef.current = null; // Clear after execution
          }, delay);
        }
      } else if (retryCountRef.current >= MAX_RETRIES) {
        console.error(`WebSocket connection failed after ${MAX_RETRIES} retries. Giving up.`);
        const msg = `서버와 연결에 실패했습니다. 잠시 후 다시 시도해주세요.`;
        setConnectionError({ message: msg, url: WS_BASE, timestamp: Date.now() });
        setWsStatus('disconnected');
      }
    };

    ws.onerror = (err) => {
      let targetUrl = WS_BASE;
      if (targetUrl.startsWith('wss://')) {
        targetUrl = targetUrl.replace('wss://', 'https://');
      } else if (targetUrl.startsWith('ws://')) {
        targetUrl = targetUrl.replace('ws://', 'http://');
      }

      const msg = `WebSocket connection failed. If using self-signed certificates, try visiting the API server URL directly (${targetUrl}) in your browser and accept the certificate.`;

      if (!connectionIntervalRef.current) {
        // console.warn(msg); // 연결 실패 경고 로그 억제
      }

      setConnectionError({ message: msg, url: targetUrl, timestamp: Date.now() });
      setWsStatus('disconnected');
    };
  }, [currentDbName]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      // Cleanup on component unmount
      if (connectionIntervalRef.current) {
        clearInterval(connectionIntervalRef.current);
        connectionIntervalRef.current = null;
      }
      if (wsRef.current) {
        // Prevent the onclose handler from trying to reconnect
        wsRef.current.onclose = null;
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
            wsRef.current.close();
        }
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // 사용할 DB 전환 (사용자별 DB 분리)
  const switchDatabase = useCallback((dbName) => {
    retryCountRef.current = 0; // DB 전환 시 재시도 횟수 초기화
    setCurrentDbName(dbName);
  }, []);

  // saveDB와 reloadDB는 더 이상 사용되지 않지만, 인터페이스 호환성을 위해 빈 함수로 남겨둘 수 있습니다.
  // 하지만 App.jsx에서 이미 오버라이드하고 있으므로 제거해도 무방합니다.
  const saveDB = useCallback(() => {}, []);
  const reloadDB = useCallback(() => {}, []);

  return { db: null, dbReady, wsStatus, saveDB, reloadDB, switchDatabase, currentDbName, connectionError };
}