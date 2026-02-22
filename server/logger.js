import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, 'logs');

// 로그 레벨 정의
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// 환경 변수에서 로그 레벨 가져오기 (기본값: info)
const level = process.env.LOG_LEVEL || 'info';

// 콘솔 출력 포맷
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, requestId, stack, ...meta }) => {
    // 에러 객체가 있으면 스택 트레이스를 포함
    if (message instanceof Error) {
      message = message.stack || message.message;
    }
    const reqIdStr = requestId ? `[${requestId}] ` : '';
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `[${timestamp}] ${level}: ${reqIdStr}${message} ${metaString}${stackStr}`;
  })
);

// 파일 출력 포맷
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.uncolorize(), // 파일에는 색상 코드 제거
  winston.format.printf(({ timestamp, level, message, requestId, stack, ...meta }) => {
    if (message instanceof Error) {
      message = message.stack || message.message;
    }
    const reqIdStr = requestId ? `[${requestId}] ` : '';
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${reqIdStr}${message} ${metaString}${stackStr}`;
  })
);

const logger = winston.createLogger({
  level: level,
  levels: LOG_LEVELS,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.DailyRotateFile({
      level: 'debug',
      dirname: LOG_DIR,
      filename: '%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
    }),
  ],
  exitOnError: false,
});

export default logger;