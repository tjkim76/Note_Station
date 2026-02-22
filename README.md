# Note Station (React Note App)

**Note Station**은 React와 SQLite를 기반으로 한 에버노트 스타일의 웹 노트 애플리케이션입니다.
강력한 리치 텍스트 에디터, 실시간 데이터 동기화, 오프라인 지원(PWA) 등 다양한 생산성 도구를 제공합니다.

## ✨ 주요 기능

- **📝 리치 텍스트 에디터**: 굵게, 기울임, 밑줄, 취소선, 색상 변경, 정렬, 표/이미지 삽입 등 다양한 서식 지원
- **⚡ 마크다운 단축키**: `#`, `-`, `1.`, `>` 등을 이용한 빠른 서식 적용
- **✅ 할 일 관리 (To-Do)**: 체크박스 삽입 및 미완료 항목 필터링, 완료 시 자동 스타일 적용
- **📅 캘린더 뷰**: 작성일 기준 노트 모아보기 및 날짜별 필터링
- **🏷️ 태그 시스템**: 유연한 노트 분류 및 검색
- **🌙 다크 모드**: 눈이 편안한 어두운 테마 지원 (시스템 설정 연동)
- **🌐 번역 기능**: 15개 언어 지원, 자동 언어 감지 (Google Translate API)
- **📁 카테고리 관리**: 커스텀 카테고리 생성, 필터링, 편집 기능
- **🔍 검색 기능**: 제목 및 내용 실시간 검색 및 필터링
- **📷 이미지 지원**: Ctrl+V로 이미지 붙여넣기 및 자동 저장
- **💻 PWA 지원**: 데스크탑 및 모바일에 앱으로 설치 가능 (오프라인 지원)
- **🔄 실시간 동기화**: WebSocket을 이용한 클라이언트-서버 간 데이터 실시간 저장
- **🤖 AI 요약**: OpenAI API를 연동한 노트 내용 자동 요약
- **🔐 보안**: 로컬 HTTPS 개발 환경 지원 및 비밀번호 암호화 저장
- **💾 데이터 저장**: SQLite 브라우저 데이터베이스, localStorage 백업 및 자동 저장

## 🛠️ 기술 스택
- **텍스트 서식**: 굵게, 기울임, 밑줄, 취소선
- **단락 스타일**: H1, H2, H3, 본문
- **목록**: 글머리 기호, 번호 매기기, 인용구
- **정렬**: 왼쪽, 가운데, 오른쪽
- **색상**: 글자 색상, 배경 색상
- **링크**: URL 링크 삽입

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express, WebSocket (ws)
- **Database**: SQLite (Server), sql.js (Client/WASM), IndexedDB
- **Tools**: concurrently, vite-plugin-pwa, vite-plugin-mkcert
- **Mobile**: Capacitor (Android, iOS)

## 🚀 설치 및 실행 방법

### 1. 사전 요구사항 (Prerequisites)

- **Node.js**: v18 이상 권장
- **mkcert**: 로컬 HTTPS 인증서 생성을 위해 필요합니다.
  - **Windows (Chocolatey)**: `choco install mkcert`
  - **macOS (Homebrew)**: `brew install mkcert`
  - 또는 mkcert GitHub에서 실행 파일을 다운로드하여 프로젝트 루트에 `mkcert.exe`로 저장하세요.

### 2. 프로젝트 클론 및 의존성 설치

```bash
# 의존성 설치
npm install
```

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 자동 오픈

### 3. 프로덕션 빌드
```bash
npm run build
```

빌드 결과물은 `dist` 폴더에 생성됩니다.

### 4. 모바일 앱 빌드 (Android/iOS)

Capacitor를 사용하여 네이티브 앱으로 빌드할 수 있습니다. (Android Studio 또는 Xcode 필요)

1. **의존성 설치 및 초기화**
   ```bash
   npm install
   npx cap add android
   npx cap add ios
   ```

2. **프로젝트 빌드 및 동기화**
   ```bash
   npm run mobile:sync
   ```

3. **네이티브 IDE 열기**
   ```bash
   # Android Studio 열기
   npm run mobile:android
   
   # Xcode 열기 (macOS)
   npm run mobile:ios
   ```

## 📂 프로젝트 구조

```
react-note-app/
├── src/
│   ├── App.jsx          # 메인 노트 앱 컴포넌트
│   ├── main.jsx         # 엔트리 포인트
│   └── index.css        # 글로벌 스타일
├── index.html           # HTML 템플릿
├── package.json         # 의존성 관리
├── vite.config.js       # Vite 설정
├── tailwind.config.js   # Tailwind 설정
└── postcss.config.js    # PostCSS 설정
```

## 🎨 커스터마이징

### 색상 변경
`tailwind.config.js`에서 테마 색상 수정

### 기본 카테고리 변경
`App.jsx`에서 `defaultCategories` 배열 수정

## 🔧 개발 팁

### Hot Module Replacement (HMR)
개발 중 코드 변경 시 자동으로 페이지 새로고침

### React DevTools
Chrome 확장 프로그램 설치하여 컴포넌트 디버깅

## 📝 라이선스

MIT License
