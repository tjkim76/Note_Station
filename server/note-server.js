import express from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import http from 'http';
import cookieParser from 'cookie-parser';
import cookie from 'cookie';
import crypto from 'crypto';
import https from 'https';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fork } from 'child_process';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { PORT, HOST, COOKIE_SECRET, getSessionExpiresIn } from './config.js';
import logger from './logger.js'; // Winston 로거 가져오기

// 프로세스 명칭 설정
process.title = 'note-station-server';
logger.info(`Server PID: ${process.pid}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 이미지 업로드 폴더 설정
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// DB 폴더 생성 및 기존 파일 이동 로직
const PUBLIC_DIR = path.join(__dirname, '../public');
const TARGET_DB_DIR = path.join(__dirname, 'db');

if (!fs.existsSync(TARGET_DB_DIR)) {
  fs.mkdirSync(TARGET_DB_DIR, { recursive: true });
}

if (fs.existsSync(PUBLIC_DIR)) {
  fs.readdirSync(PUBLIC_DIR).forEach(file => {
    if (file.endsWith('.sqlite')) {
      const oldPath = path.join(PUBLIC_DIR, file);
      const newPath = path.join(TARGET_DB_DIR, file);
      if (!fs.existsSync(newPath)) {
        try {
          fs.renameSync(oldPath, newPath);
          logger.info(`Moved ${file} to db folder`);
        } catch (e) {
          logger.error(`Failed to move ${file}:`, e);
        }
      }
    }
  });
}

const app = express();

// Request ID & Logging Middleware
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  req.logger = logger.child({ requestId: req.requestId });
  res.setHeader('X-Request-ID', req.requestId);
  
  req.logger.info(`${req.method} ${req.url}`);
  
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    req.logger.info(`${res.statusCode} ${res.statusMessage || ''} (${duration}ms)`);
  });
  
  next();
});

// Cookie Parser Middleware
// COOKIE_SECRET을 쿠키 서명 비밀키로 사용합니다.
app.use(cookieParser(COOKIE_SECRET));

// CORS 설정
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// 정적 파일 서빙 (dist 폴더) - 빌드된 앱을 http://localhost:4000 에서 확인 가능
app.use(express.static(path.join(__dirname, '../dist')));
logger.info(`Serving static files from ${path.join(__dirname, '../dist')}`);

// 업로드된 이미지 서빙 (예: http://localhost:4000/uploads/image.png)
app.use('/uploads', express.static(UPLOADS_DIR));

// 일반적인 JSON 요청 처리를 위한 미들웨어 (용량 제한 설정)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- System Status Endpoint ---
app.get('/api/status', async (req, res) => {
  // 간단한 인증 체크 (로그인한 사용자만 볼 수 있도록)
  if (!req.signedCookies.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  let disk = null;
  try {
    // Node.js 18.15.0+ 지원 (비동기 처리로 이벤트 루프 블로킹 방지)
    if (fs.promises && fs.promises.statfs) {
      const stats = await fs.promises.statfs(process.cwd());
      const total = stats.bsize * stats.blocks;
      const free = stats.bsize * stats.bfree;
      const used = total - free;
      disk = {
        total,
        free,
        used,
        usagePercentage: total > 0 ? ((used / total) * 100).toFixed(1) : 0
      };
    } else if (fs.statfsSync) {
      // Fallback for older Node versions
      const stats = fs.statfsSync(process.cwd());
      const total = stats.bsize * stats.blocks;
      const free = stats.bsize * stats.bfree;
      const used = total - free;
      disk = {
        total,
        free,
        used,
        usagePercentage: total > 0 ? ((used / total) * 100).toFixed(1) : 0
      };
    }
  } catch (e) {
    // fs.statfsSync might not be available on older Node versions or some platforms
  }

  res.json({
    system: {
      platform: os.platform(),
      type: os.type(),
      release: os.release(),
      hostname: os.hostname(),
      arch: os.arch(),
      cpus: os.cpus().length
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercentage: ((usedMem / totalMem) * 100).toFixed(1)
    },
    disk,
    uptime: process.uptime(),
    process: {
      pid: process.pid,
      title: process.title,
      memoryUsage: process.memoryUsage()
    }
  });
});

// --- Passport Configuration ---

// Local Strategy (ID/PW 로그인 검증)
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const db = await getDbConnection('member');
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      return done(null, false, { message: '사용자를 찾을 수 없습니다.' });
    }

    let isValid = false;
    if (user.salt) {
      isValid = verifyPassword(password, user.salt, user.password);
    } else if (user.password === password) {
      // 레거시 평문 비밀번호 마이그레이션
      isValid = true;
      const { salt, hash } = hashPassword(password);
      await db.run('UPDATE users SET password = ?, salt = ? WHERE id = ?', [hash, salt, user.id]);
    }

    if (!isValid) {
      return done(null, false, { message: '비밀번호가 일치하지 않습니다.' });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

app.use(passport.initialize());


// --- Proxy Endpoint for Mixed Content (HTTP 이미지 로딩 지원) ---
app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL is required');

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).send('Only HTTP/HTTPS protocols are allowed');
    }
  } catch (e) {
    return res.status(400).send('Invalid URL');
  }

  try {
    const response = await fetch(url);
    // 원본 응답 상태 및 헤더 전달
    res.status(response.status);
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    
    // 브라우저 캐싱을 활용하여 성능 향상 (이미지를 하루 동안 캐시)
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    logger.error('Proxy error:', { message: err.message });
    res.status(500).send(err.message);
  }
});

// --- 이미지 업로드 엔드포인트 ---
app.post('/api/upload', async (req, res) => {
  const filename = req.headers['x-filename'];
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required in x-filename header' });
  }

  // 확장자 추출 및 임시 파일 경로 설정
  const ext = path.extname(filename).toLowerCase() || '.png';
  const tempFilename = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
  const tempFilePath = path.join(UPLOADS_DIR, tempFilename);

  // 해시 계산 및 파일 저장을 위한 스트림 생성
  const hash = crypto.createHash('md5');
  hash.setEncoding('hex');
  const writeStream = fs.createWriteStream(tempFilePath);

  // 간단한 파일 시그니처 검사 (Magic Number Check)
  // 실제 프로덕션에서는 'file-type' 같은 라이브러리 사용 권장
  const checkFileSignature = async (filePath) => {
    const handle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(4);
    await handle.read(buffer, 0, 4, 0);
    await handle.close();
    
    const hex = buffer.toString('hex').toUpperCase();
    // PNG, JPG, GIF, WEBP, BMP 시그니처 확인
    if (hex.startsWith('89504E47') || // PNG
        hex.startsWith('FFD8FF') ||   // JPG
        hex.startsWith('47494638') || // GIF
        hex.startsWith('52494646') || // WEBP (RIFF)
        hex.startsWith('424D')) {     // BMP
      return true;
    }
    return false;
  };

  // 요청 스트림을 해시와 파일 쓰기 스트림으로 동시에 파이핑
  req.pipe(hash);
  req.pipe(writeStream);

  let hashResult = null;
  let writeFinished = false;

  const checkDone = async () => {
    if (hashResult && writeFinished) {
      const finalFilename = `${hashResult}${ext}`;
      const finalFilePath = path.join(UPLOADS_DIR, finalFilename);
      const fileUrl = `/uploads/${finalFilename}`;

      if (fs.existsSync(finalFilePath)) {
        // 중복 파일 존재 시 임시 파일 삭제 및 기존 URL 반환
        fs.unlink(tempFilePath, () => {});
        logger.debug(`Duplicate image detected: ${finalFilename} (using existing)`);
        res.json({ url: fileUrl });
      } else {
        // 파일 유효성 검사
        const isValid = await checkFileSignature(tempFilePath);
        if (!isValid) {
          fs.unlink(tempFilePath, () => {});
          return res.status(400).json({ error: 'Invalid image file format' });
        }

        fs.rename(tempFilePath, finalFilePath, (err) => {
          if (err) {
            logger.error('Rename error:', err);
            fs.unlink(tempFilePath, () => {});
            return res.status(500).json({ error: 'File save failed' });
          }
          res.json({ url: fileUrl });
        });
      }
    }
  };

  writeStream.on('error', (err) => {
    logger.error('Upload stream error:', err);
    fs.unlink(tempFilePath, () => {});
    res.status(500).json({ error: 'File upload failed' });
  });

  writeStream.on('finish', () => {
    writeFinished = true;
    checkDone();
  });

  hash.on('finish', () => {
    hash.end();
    hashResult = hash.read();
    checkDone();
  });
});

// DB 연결 캐시
const dbConnectionPromises = {};

async function getDbConnection(dbName) {
  if (!dbConnectionPromises[dbName]) {
    dbConnectionPromises[dbName] = (async () => {
      try {
        const DB_DIR = path.join(__dirname, 'db');
        if (!fs.existsSync(DB_DIR)) {
          await fs.promises.mkdir(DB_DIR, { recursive: true });
        }
        const DB_PATH = path.join(DB_DIR, `${dbName}.sqlite`);
        
        const initDb = async (retry = false) => {
          let db;
          try {
            db = await open({
              filename: DB_PATH,
              driver: sqlite3.Database
            });
            
            // 동시성 향상을 위한 WAL 모드 설정
            await db.run('PRAGMA journal_mode = WAL;');

            // 테이블 초기화
            if (dbName === 'member') {
              await db.exec(`
                CREATE TABLE IF NOT EXISTS users (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE,
                  password TEXT,
                  salt TEXT,
                  naver_id TEXT,
                  kakao_id TEXT
                );
              `);
            } else if (dbName.startsWith('note_')) {
              await db.exec(`
                CREATE TABLE IF NOT EXISTS notes (
                  id INTEGER PRIMARY KEY,
                  title TEXT,
                  content TEXT,
                  category_id INTEGER,
                  created_at TEXT,
                  updated_at TEXT,
                  is_pinned INTEGER DEFAULT 0,
                  is_deleted INTEGER DEFAULT 0,
                  order_index INTEGER DEFAULT 0,
                  plain_text TEXT
                );
                CREATE TABLE IF NOT EXISTS tags (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT UNIQUE
                );
                CREATE TABLE IF NOT EXISTS note_tags (
                  note_id INTEGER,
                  tag_id INTEGER,
                  PRIMARY KEY (note_id, tag_id),
                  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
                  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS categories (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT,
                  parent_id INTEGER,
                  is_favorite INTEGER DEFAULT 0,
                  order_index INTEGER DEFAULT 0,
                  updated_at TEXT
                );
                CREATE TABLE IF NOT EXISTS images (
                  id TEXT PRIMARY KEY,
                  data TEXT
                );
                CREATE TABLE IF NOT EXISTS templates (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT,
                  content TEXT,
                  description TEXT,
                  created_at TEXT,
                  updated_at TEXT
                );
              `);

              // 컬럼 추가 마이그레이션 (기존 DB 호환성 및 신규 컬럼)
              const migrations = [
                { table: 'categories', col: 'order_index', def: 'INTEGER DEFAULT 0' },
                { table: 'notes', col: 'is_pinned', def: 'INTEGER DEFAULT 0' },
                { table: 'notes', col: 'is_deleted', def: 'INTEGER DEFAULT 0' },
                { table: 'notes', col: 'category_id', def: 'INTEGER' },
                { table: 'notes', col: 'order_index', def: 'INTEGER DEFAULT 0' },
                { table: 'notes', col: 'plain_text', def: 'TEXT' },
                { table: 'categories', col: 'updated_at', def: 'TEXT' },
                { table: 'templates', col: 'updated_at', def: 'TEXT' }
              ];

              for (const { table, col, def } of migrations) {
                // PRAGMA table_info를 사용하여 컬럼 존재 여부를 안전하게 확인
                const columns = await db.all(`PRAGMA table_info(${table})`);
                const columnExists = columns.some(c => c.name === col);
                
                if (!columnExists) {
                  try {
                    await db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
                    logger.info(`Migrated: Added column ${col} to ${table}`);
                  } catch (e) {
                    logger.error(`Failed to add column ${col} to ${table}:`, { message: e.message, table, column: col });
                  }
                }
              }

              // 성능 최적화를 위한 인덱스 추가
              await db.exec(`
                CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id);
                CREATE INDEX IF NOT EXISTS idx_notes_is_deleted ON notes(is_deleted);
                CREATE INDEX IF NOT EXISTS idx_notes_list_sort ON notes(is_pinned DESC, order_index ASC, updated_at DESC);
              `);

              // 기본 카테고리 생성
              const defaultCategories = ['전체', '개인', '업무', '아이디어'];
              for (const cat of defaultCategories) {
                const existing = await db.get('SELECT id FROM categories WHERE name = ? AND parent_id IS NULL', [cat]);
                if (!existing) {
                  await db.run('INSERT INTO categories (name) VALUES (?)', [cat]);
                }
              }
            }
            return db;
          } catch (error) {
            if (error.code === 'SQLITE_CORRUPT' && !retry) {
              logger.warn(`Database ${dbName} is corrupt. Backing up and recreating.`);
              if (db) await db.close();
              const backupPath = `${DB_PATH}.corrupt.${Date.now()}`;
              await fs.promises.rename(DB_PATH, backupPath);
              return initDb(true);
            }
            throw error;
          }
        };

        return initDb();
      } catch (e) {
        logger.error(`[CRITICAL] Failed to initialize DB connection for ${dbName}:`, e);
        // Remove the failed promise from the cache so we can retry
        delete dbConnectionPromises[dbName];
        throw e; // Re-throw the error to be caught by the route handler
      }
    })();
  }
  return dbConnectionPromises[dbName];
}

// --- Authentication Middleware ---
const authMiddleware = (req, res, next) => {
  // 서명된 쿠키에서 사용자 정보 확인
  const userData = req.signedCookies.user;
  
  if (!userData) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = JSON.parse(userData);
    next();
  } catch (e) {
    res.clearCookie('user');
    return res.status(401).json({ error: 'Invalid session' });
  }
};

// --- Password Utils ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  // PBKDF2 with SHA512, 100000 iterations, 64 byte key length
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// 시간 문자열(예: '7d', '1h', '30m')을 밀리초로 변환하는 헬퍼 함수
function parseDuration(duration) {
  if (!duration) return 7 * 24 * 60 * 60 * 1000; // 기본값 7일
  const match = String(duration).match(/^(\d+)([dhms])?$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (!unit) return val * 1000; // 단위 없으면 초 단위로 가정 (JWT 표준)
  if (unit === 'd') return val * 24 * 60 * 60 * 1000;
  if (unit === 'h') return val * 60 * 60 * 1000;
  if (unit === 'm') return val * 60 * 1000;
  if (unit === 's') return val * 1000;
  return val;
}

// --- REST API Endpoints (Notes) ---

app.use('/api/notes', authMiddleware);
app.use('/api/categories', authMiddleware);
app.use('/api/templates', authMiddleware);
app.use('/api/images', authMiddleware);
app.use('/api/tags', authMiddleware);
app.use('/api/upload', authMiddleware);


app.get('/api/notes', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  if (!dbName) return res.status(400).json({ error: 'Database name required' });
  try {
    const db = await getDbConnection(dbName);
    const rows = await db.all(`
      SELECT n.id, n.title, n.category_id, n.created_at, n.updated_at, n.is_pinned, n.is_deleted, n.order_index, n.plain_text, GROUP_CONCAT(t.name) as tags
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      GROUP BY n.id
      ORDER BY n.is_pinned DESC, n.order_index ASC, n.updated_at DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/notes/:id', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { id } = req.params;
  try {
    const db = await getDbConnection(dbName);
    const note = await db.get('SELECT * FROM notes WHERE id = ?', [id]);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    
    const tags = await db.all('SELECT t.name FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?', [id]);
    note.tags = tags.map(t => t.name);
    
    res.json(note);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/notes', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const note = req.body;
  try {
    const db = await getDbConnection(dbName);
    await db.run(
      'INSERT INTO notes (id, title, content, category_id, created_at, updated_at, is_pinned, is_deleted, order_index, plain_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [note.id, note.title, note.content, note.categoryId, note.createdAt, note.updatedAt, 0, 0, 0, note.plainText]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { id } = req.params;
  const { title, content, categoryId, updatedAt, plainText, isPinned } = req.body;
  
  try {
    const db = await getDbConnection(dbName);
    // 동적 업데이트 쿼리 생성
    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (categoryId !== undefined) { updates.push('category_id = ?'); params.push(categoryId); }
    if (updatedAt !== undefined) { updates.push('updated_at = ?'); params.push(updatedAt); }
    if (plainText !== undefined) { updates.push('plain_text = ?'); params.push(plainText); }
    if (isPinned !== undefined) { updates.push('is_pinned = ?'); params.push(isPinned ? 1 : 0); }
    
    if (updates.length > 0) {
      params.push(id);
      await db.run(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/notes', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { ids, permanent } = req.body;
  try {
    const db = await getDbConnection(dbName);
    const placeholders = ids.map(() => '?').join(',');
    if (permanent) {
      await db.run(`DELETE FROM notes WHERE id IN (${placeholders})`, ids);
    } else {
      await db.run(`UPDATE notes SET is_deleted = 1 WHERE id IN (${placeholders})`, ids);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notes/restore', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { id, categoryId } = req.body;
  try {
    const db = await getDbConnection(dbName);
    await db.run('UPDATE notes SET is_deleted = 0, category_id = ? WHERE id = ?', [categoryId, id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/images/delete', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { imageIds } = req.body;
  try {
    const db = await getDbConnection(dbName);
    if (imageIds && imageIds.length > 0) {
      const placeholders = imageIds.map(() => '?').join(',');
      await db.run(`DELETE FROM images WHERE id IN (${placeholders})`, imageIds);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tags', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { noteId, tagName } = req.body;
  try {
    const db = await getDbConnection(dbName);
    await db.run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [tagName]);
    const tagResult = await db.get("SELECT id FROM tags WHERE name = ?", [tagName]);
    await db.run("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)", [noteId, tagResult.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/notes/:id/tags/:tagName', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { id, tagName } = req.params;
  try {
    const db = await getDbConnection(dbName);
    const tagResult = await db.get("SELECT id FROM tags WHERE name = ?", [tagName]);
    if (tagResult) {
      await db.run("DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?", [id, tagResult.id]);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/notes/reorder', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { updates } = req.body;
  try {
    const db = await getDbConnection(dbName);
    await db.run("BEGIN TRANSACTION");
    for (const update of updates) {
      await db.run('UPDATE notes SET order_index = ? WHERE id = ?', [update.orderIndex, update.id]);
    }
    await db.run("COMMIT");
    res.json({ success: true });
  } catch (e) {
    await db.run("ROLLBACK");
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/notes/batch-move', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { ids, categoryId, updatedAt } = req.body;
  if (!ids || ids.length === 0) {
    return res.status(400).json({ error: 'Note IDs are required' });
  }
  try {
    const db = await getDbConnection(dbName);
    const placeholders = ids.map(() => '?').join(',');
    await db.run(
      `UPDATE notes SET category_id = ?, updated_at = ? WHERE id IN (${placeholders})`,
      [categoryId, updatedAt, ...ids]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 대용량 JSON 처리를 위해 body-parser 크기 제한을 라우트별로 적용
app.post('/api/notes/import', authMiddleware, express.json({ limit: '10240mb' }), async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { notes, images } = req.body;
  let db = null;
  try {
    db = await getDbConnection(dbName);
    await db.run("BEGIN TRANSACTION");

    // Batch insert for images
    if (images && images.length > 0) {
      const stmt = await db.prepare('INSERT OR REPLACE INTO images (id, data) VALUES (?, ?)');
      for (const image of images) {
        await stmt.run(image);
      }
      await stmt.finalize();
    }

    // Batch insert for notes
    if (notes && notes.length > 0) {
      const stmt = await db.prepare('INSERT INTO notes (id, title, content, category_id, created_at, updated_at, is_pinned, is_deleted, order_index, plain_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const note of notes) {
        await stmt.run(note);
      }
      await stmt.finalize();
    }

    await db.run("COMMIT");
    res.json({ success: true }); 
  } catch (e) {
    if (db) { await db.run("ROLLBACK").catch(err => logger.error('Rollback failed:', err)); }
    logger.error("Import error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- REST API Endpoints (Sharing) ---
app.post('/api/notes/:id/share', authMiddleware, async (req, res) => {
  const sourceDbName = `note_${req.user.username}`;
  const { id } = req.params;
  const { username: targetUsername } = req.body;

  if (!targetUsername) {
    return res.status(400).json({ error: 'Target username is required' });
  }

  try {
    const memberDb = await getDbConnection('member');
    const targetUser = await memberDb.get('SELECT id FROM users WHERE username = ?', [targetUsername]);

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const sourceDb = await getDbConnection(sourceDbName);
    const noteToShare = await sourceDb.get('SELECT * FROM notes WHERE id = ?', [id]);

    if (!noteToShare) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const targetDbName = `note_${targetUsername}`;
    const targetDb = await getDbConnection(targetDbName);

    // 대상 사용자의 DB에 노트 복사 (ID는 새로 생성하거나 기존 ID 유지, 여기서는 기존 ID 유지)
    await targetDb.run('INSERT OR REPLACE INTO notes (id, title, content, category_id, created_at, updated_at, is_pinned, is_deleted, order_index, plain_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [noteToShare.id, noteToShare.title, noteToShare.content, null, noteToShare.created_at, new Date().toISOString(), 0, 0, 0, noteToShare.plain_text]
    );

    // 실시간 알림 전송
    sendToUser(targetUser.id, { type: 'note_shared', from: req.user.username, title: noteToShare.title });

    res.json({ success: true, message: `Note shared with ${targetUsername}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- REST API Endpoints (Categories) ---

app.get('/api/categories', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  try {
    const db = await getDbConnection(dbName);
    const rows = await db.all('SELECT id, name, parent_id, order_index, is_favorite FROM categories ORDER BY parent_id, order_index, id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { name, parentId } = req.body;
  try {
    const db = await getDbConnection(dbName);
    const existing = await db.get('SELECT id FROM categories WHERE name = ? AND parent_id IS ?', [name, parentId || null]);
    if (existing) return res.status(400).json({ error: 'Duplicate category' });

    const maxOrderResult = await db.get('SELECT MAX(order_index) as maxOrder FROM categories WHERE parent_id IS ?', [parentId || null]);
    const nextOrder = (maxOrderResult?.maxOrder || 0) + 1;

    await db.run('INSERT INTO categories (name, parent_id, order_index) VALUES (?, ?, ?)', [name, parentId || null, nextOrder]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/categories/:id', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { id } = req.params;
  const { name, isFavorite } = req.body;
  try {
    const db = await getDbConnection(dbName);
    if (name !== undefined) {
        await db.run('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
    }
    if (isFavorite !== undefined) {
        await db.run('UPDATE categories SET is_favorite = ? WHERE id = ?', [isFavorite ? 1 : 0, id]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/categories/:id', async (req, res) => {
  const dbName = `note_${req.user.username}`;
  const { id } = req.params;
  try {
    const db = await getDbConnection(dbName);
    // 삭제되는 카테고리의 노트를 '개인' 카테고리로 이동
    const personalCat = await db.get("SELECT id FROM categories WHERE name = '개인'");
    const targetCatId = personalCat ? personalCat.id : null;
    
    if (targetCatId) {
        await db.run('UPDATE notes SET category_id = ? WHERE category_id = ?', [targetCatId, id]);
    }
    
    // 하위 카테고리 및 해당 카테고리 삭제
    await db.run('DELETE FROM categories WHERE parent_id = ?', [id]);
    await db.run('DELETE FROM categories WHERE id = ?', [id]);
    
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories/reorder', async (req, res) => {
    const dbName = `note_${req.user.username}`;
    const { updates } = req.body;
    try {
        const db = await getDbConnection(dbName);
        await db.run("BEGIN TRANSACTION");
        for (const u of updates) {
            await db.run('UPDATE categories SET order_index = ? WHERE id = ?', [u.orderIndex, u.id]);
        }
        await db.run("COMMIT");
        res.json({ success: true });
    } catch (e) {
        await db.run("ROLLBACK");
        res.status(500).json({ error: e.message });
    }
});

// --- REST API Endpoints (Templates) ---

app.get('/api/templates', async (req, res) => {
    const dbName = `note_${req.user.username}`;
    try {
        const db = await getDbConnection(dbName);
        const rows = await db.all('SELECT id, title, content, description FROM templates ORDER BY created_at DESC');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/templates', async (req, res) => {
    const dbName = `note_${req.user.username}`;
    const { title, content, description } = req.body;
    try {
        const db = await getDbConnection(dbName);
        const createdAt = new Date().toISOString();
        await db.run('INSERT INTO templates (title, content, description, created_at) VALUES (?, ?, ?, ?)', [title, content, description, createdAt]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/templates/:id', async (req, res) => {
    const dbName = `note_${req.user.username}`;
    const { id } = req.params;
    const { title, description } = req.body;
    try {
        const db = await getDbConnection(dbName);
        await db.run('UPDATE templates SET title = ?, description = ? WHERE id = ?', [title, description, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/templates/:id', async (req, res) => {
    const dbName = `note_${req.user.username}`;
    const { id } = req.params;
    try {
        const db = await getDbConnection(dbName);
        await db.run('DELETE FROM templates WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- REST API Endpoints (Auth) ---

app.post('/api/auth/login', (req, res, next) => {
    // Passport 인증을 미들웨어로 실행하고, 커스텀 콜백으로 결과를 처리합니다.
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            // 인증 실패 시, 구체적인 정보와 함께 401 응답
            return res.status(401).json({ error: info ? info.message : '로그인에 실패했습니다.' });
        }
        
        // 인증 성공
        const expiresIn = getSessionExpiresIn();
        const maxAge = parseDuration(expiresIn);
        const userPayload = JSON.stringify({ id: user.id, username: user.username });
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('user', userPayload, { 
            httpOnly: true, 
            secure: isProduction, 
            sameSite: 'lax', 
            maxAge: maxAge, 
            signed: true,
            path: '/' 
        });

        return res.json({ success: true, user: { id: user.id, username: user.username } });
    })(req, res, next);
});

app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    // 사용자명 유효성 검사 (보안 강화)
    if (!username || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: '사용자명은 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.' });
    }

    const db = await getDbConnection('member');
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: '이미 존재하는 사용자명입니다.' });
    }

    const { salt, hash } = hashPassword(password);
    const result = await db.run('INSERT INTO users (username, password, salt) VALUES (?, ?, ?)', [username, hash, salt]);
    
    res.json({ success: true, user: { id: result.lastID, username } });
  } catch (e) {
    logger.error('Signup error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/social', async (req, res) => {
  const { provider, socialId, username } = req.body; // provider: 'naver', 'kakao', 'google'
  try {
    const db = await getDbConnection('member');
    const colName = `${provider}_id`;
    
    let user = await db.get(`SELECT * FROM users WHERE ${colName} = ?`, [socialId]);
    
    if (!user) {
      // Create new user with unique username
      // 소셜 이름에서 특수문자 제거 및 기본값 설정
      let sanitized = username.replace(/[^a-zA-Z0-9_]/g, '');
      if (!sanitized) sanitized = `user_${provider}`;
      
      let newUsername = sanitized;
      let exists = await db.get('SELECT id FROM users WHERE username = ?', [newUsername]);
      while (exists) {
        newUsername = `${sanitized}${Math.floor(Math.random() * 1000)}`;
        exists = await db.get('SELECT id FROM users WHERE username = ?', [newUsername]);
      }
      
      const result = await db.run(`INSERT INTO users (username, ${colName}) VALUES (?, ?)`, [newUsername, socialId]);
      user = { id: result.lastID, username: newUsername };
    }
    
    const expiresIn = getSessionExpiresIn();
    const maxAge = parseDuration(expiresIn);

    const userPayload = JSON.stringify({ id: user.id, username: user.username });

    res.cookie('user', userPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAge,
      signed: true
    });
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (e) {
    logger.error('Social login error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('user').json({ success: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  // The authMiddleware has already verified the token and attached req.user
  res.json({ success: true, user: req.user });
});

// SPA Fallback for Client-Side Routing (반드시 에러 핸들러 이전에 위치)
app.get(/.*/, (req, res, next) => {
  // API 요청이나 업로드 파일 요청은 통과 (404 처리 또는 에러 핸들러로 이동)
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  // 그 외 모든 요청은 index.html 반환 (React Router가 처리)
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Use the request-specific logger if it exists, otherwise the main logger
  const log = req.logger || logger;
  
  // Winston will automatically handle the stack trace from the error object
  log.error(err);

  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: 'Internal Server Error',
    // In production, don't leak error details to the client
    message: isProduction ? 'An unexpected error occurred.' : err.message,
  });
});

let server;
const keyPath = path.join(__dirname, '../key.pem');
const certPath = path.join(__dirname, '../cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  server = https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  }, app);
  logger.info('Server running in HTTPS mode');
} else {
  server = http.createServer(app);
  logger.info('Server running in HTTP mode (certs not found)');
}

server.on('upgrade', function upgrade(request, socket, head) {
  try {
    const parsedCookies = cookie.parse(request.headers.cookie || '');
    const userCookie = parsedCookies.user;

    if (!userCookie) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // 서명된 쿠키 검증 (cookie-parser의 signedCookie 사용)
    const unsigned = cookieParser.signedCookie(userCookie, COOKIE_SECRET);

    if (unsigned && unsigned !== userCookie) {
      const user = JSON.parse(unsigned);
      wss.handleUpgrade(request, socket, head, function done(ws) {
        // Pass user object to the connection handler
        wss.emit('connection', ws, request, user);
      });
    } else {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
    }
  } catch (e) {
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    socket.destroy();
  }
});

const wss = new WebSocketServer({ noServer: true });

// 특정 사용자에게 메시지를 보내는 헬퍼 함수
function sendToUser(userId, message) {
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.user && client.user.id === userId) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws, request, user) => {
  ws.user = user;
  ws.isAlive = true;
  logger.info(`Client connected to WebSocket (user: ${user.username})`);

  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message);
      const dbName = `note_${ws.user.username}`;
      const DB_DIR = path.join(__dirname, 'db');
      const DB_PATH = path.join(DB_DIR, `${dbName}.sqlite`);

      if (parsed.type === 'save') {
        if (!fs.existsSync(DB_DIR)) {
          await fs.promises.mkdir(DB_DIR, { recursive: true });
        }
        // Base64 string to Buffer
        const buffer = Buffer.from(parsed.data, 'base64');
        await fs.promises.writeFile(DB_PATH, buffer);
        ws.send(JSON.stringify({ type: 'save_response', success: true }));
        logger.info(`Database saved via WebSocket for ${dbName}`);
      } else if (parsed.type === 'load') {
        if (fs.existsSync(DB_PATH)) {
          const buffer = await fs.promises.readFile(DB_PATH);
          // Buffer to Base64 string
          const base64Data = buffer.toString('base64');
          ws.send(JSON.stringify({ type: 'load_response', success: true, data: base64Data }));
          logger.info(`Database loaded via WebSocket for ${dbName}`);
        } else {
          ws.send(JSON.stringify({ type: 'load_response', success: false, error: 'Database file not found' }));
        }
      } else if (parsed.type === 'sync') {
        // 증분 동기화 처리 (Incremental Sync)
        const db = await getDbConnection(dbName);
        const changes = parsed.changes;
        
        try {
          await db.run('BEGIN TRANSACTION');
          
          // 각 테이블별 변경사항 적용 (Upsert)
          for (const [table, rows] of Object.entries(changes)) {
            if (!rows || rows.length === 0) continue;
            
            for (const row of rows) {
              const columns = Object.keys(row);
              const placeholders = columns.map(() => '?').join(',');
              const values = Object.values(row);
              const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
              await db.run(sql, values);
            }
          }
          
          await db.run('COMMIT');
          ws.send(JSON.stringify({ type: 'sync_response', success: true, timestamp: Date.now() }));
          logger.info(`Database synced incrementally via WebSocket (${dbName})`);
        } catch (e) {
          await db.run('ROLLBACK');
          logger.error('Sync error:', e);
          ws.send(JSON.stringify({ type: 'sync_response', success: false, error: e.message }));
        }
      }
    } catch (err) {
      logger.error('WebSocket error:', err);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// Heartbeat (Ping/Pong) Interval
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// 기존 HTTP 엔드포인트는 유지하거나 필요 없다면 제거해도 됩니다.
// WebSocket 서버와 함께 실행하기 위해 server.listen 사용
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    logger.error(`[FATAL] Port ${PORT} is already in use. Please stop the other process or use a different port.`);
    process.exit(1);
  } else {
    logger.error('[FATAL] Server error:', e);
  }
});

server.listen(PORT, HOST, () => {
  const protocol = (fs.existsSync(keyPath) && fs.existsSync(certPath)) ? 'https' : 'http';
  logger.info(`note-server listening on ${protocol}://${HOST}:${PORT}`);
  logger.info(`Current Log Level: ${(process.env.LOG_LEVEL || 'INFO').toUpperCase()}`);
  if (protocol === 'https') {
    logger.warn(`NOTE: If using self-signed certificates, you may need to visit ${protocol}://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT} in your browser and accept the certificate to allow WebSocket connections.`);
  }
  
  // 이미지 정리 스케줄러 시작
  startCleanupScheduler();
});

function startCleanupScheduler() {
  const cleanupScript = path.join(__dirname, 'cleanup-images.js');
  
  const runCleanup = () => {
    if (!fs.existsSync(cleanupScript)) {
      logger.warn('[System] cleanup-images.js not found. Skipping cleanup.');
      return;
    }
    
    logger.info('[System] Starting scheduled image cleanup...');
    // fork를 사용하여 별도 프로세스로 실행 (메인 서버 블로킹 방지)
    const child = fork(cleanupScript, [], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    
    child.stdout.on('data', (data) => {
      // 자식 프로세스의 출력을 서버 로그에 기록
      const output = data.toString().trim();
      if (output) logger.info(`[Cleanup] ${output}`);
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) logger.error(`[Cleanup Error] ${output}`);
    });
  };

  // 매일 새벽 5시에 실행되도록 스케줄링
  const now = new Date();
  let nextRun = new Date(now);
  nextRun.setHours(5, 0, 0, 0); // 새벽 5시 설정

  // 현재 시간이 이미 새벽 5시를 지났다면 내일 새벽 5시로 설정
  if (now >= nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const timeUntilNextRun = nextRun - now;
  logger.info(`[System] Next image cleanup scheduled at: ${nextRun.toLocaleString()}`);

  setTimeout(() => {
    runCleanup();
  }, timeUntilNextRun);
}
