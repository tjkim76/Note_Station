module.exports = {
  apps: [{
    name: "note-station-server:4000",
    script: "./server/note-server.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: "production",
      PORT: 4000  // 포트를 4001로 변경 (필요 시)
    },
    error_file: "./server/logs/pm2-server-error.log",
    out_file: "./server/logs/pm2-server-out.log",
    time: true
  }, {
    name: "note-station-web:3000",
    script: "node_modules/vite/bin/vite.js",
    args: "preview --port 3000",
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: "production"
    },
    error_file: "./server/logs/pm2-web-error.log",
    out_file: "./server/logs/pm2-web-out.log",
    time: true
  }]
};