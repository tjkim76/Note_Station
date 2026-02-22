@echo off
chcp 65001 >nul
echo.
echo === Note Station GitHub 업로드 도우미 ===
echo.

:: Git 설치 확인
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [오류] Git이 설치되어 있지 않거나 PATH에 없습니다.
    pause
    exit /b
)

:: 1. Git Init
if not exist .git (
    echo [1/6] Git 저장소를 초기화합니다...
    git init
) else (
    echo [1/6] 기존 Git 저장소를 감지했습니다.
)

:: 2. Add
echo [2/6] 파일을 스테이징합니다...
git add .

:: 3. Commit
echo [3/6] 커밋을 생성합니다...
git commit -m "Initial commit: Note Station project setup"

:: 4. Remote URL Input
echo.
echo GitHub에서 생성한 리포지토리 주소(HTTPS)를 입력해주세요.
echo (예: https://github.com/사용자명/note-station.git)
set /p REPO_URL="URL 입력: "

if "%REPO_URL%"=="" (
    echo URL이 입력되지 않았습니다. 작업을 중단합니다.
    pause
    exit /b
)

:: 5. Remote Add & Push
echo [5/6] 원격 저장소 연결 및 푸시를 진행합니다...
git remote remove origin >nul 2>nul
git remote add origin %REPO_URL%
git branch -M main
git push -u origin main

echo.
echo [완료] 모든 작업이 끝났습니다. 화면을 닫으셔도 됩니다.
pause