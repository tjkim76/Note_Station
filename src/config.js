// 클라이언트에서 바라볼 API 서버 설정
const SERVER_PORT = import.meta.env.VITE_SERVER_PORT || 4000;

// 기본값은 현재 브라우저의 호스트(window.location.hostname)를 사용합니다.
// 특정 서버 IP로 고정하려면 아래 값을 변경하세요. 예: '192.168.0.10'
const SERVER_HOST = import.meta.env.VITE_SERVER_HOST || window.location.hostname;

export const API_BASE = `${window.location.protocol}//${SERVER_HOST}:${SERVER_PORT}`;
export const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${SERVER_HOST}:${SERVER_PORT}`;