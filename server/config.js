import fs from 'fs';
import path from 'path';

let envCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 60000; // 60초 캐싱

// .env 파싱 함수 (재사용 가능하도록 분리)
const parseEnv = () => {
  const now = Date.now();
  if (envCache && (now - lastCacheTime < CACHE_TTL)) {
    return envCache;
  }

  const config = {};
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf-8');
      envConfig.split(/\r?\n/).forEach(line => {
        const parts = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
        if (parts) {
          const key = parts[1];
          let value = parts[2] || '';
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          config[key] = value.trim();
        }
      });
    }
  } catch (e) { /* ignore */ }
  
  envCache = config;
  lastCacheTime = now;
  return config;
};

// 초기 로드 (process.env에 적용)
const initialConfig = parseEnv();
Object.keys(initialConfig).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = initialConfig[key];
  }
});

export const COOKIE_SECRET = process.env.COOKIE_SECRET || 'your-super-secret-and-long-string-for-cookie-session';

export const PORT = process.env.PORT || 4000;

// '0.0.0.0'으로 설정하면 모든 IP에서 접근 가능합니다. (외부 접속 허용)
// 보안을 위해 특정 IP나 도메인만 허용하려면 해당 값을 입력하세요 (예: 'localhost', '192.168.0.10')
export const HOST = process.env.HOST || '0.0.0.0';

// 동적으로 .env 값을 읽어오는 함수 (서버 재시작 없이 변경 사항 반영)
export const getSessionExpiresIn = () => {
  const currentConfig = parseEnv();
  return currentConfig.SESSION_EXPIRES_IN || process.env.SESSION_EXPIRES_IN || '30d';
};