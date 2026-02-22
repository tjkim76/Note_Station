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
git diff --quiet --cached
if %errorlevel% neq 0 (
    git commit -m "수정사항 반영"
) else (
    echo 변경 사항이 없어 커밋을 건너뜁니다.
)

:: 4. Remote URL Input
echo.
echo GitHub에서 생성한 리포지토리 주소(HTTPS)를 입력해주세요.
echo (예: https://github.com/사용자명/note-station.git)
set REPO_URL="https://github.com/tjkim76/Note_Station.git"

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

if %errorlevel% equ 0 goto :finish

echo.
echo ========================================================
echo [!] 푸시 실패: 원격 저장소에 이미 파일이 존재합니다.
echo     (GitHub 리포지토리 생성 시 README/License를 체크하셨나요?)
echo.
echo     로컬 파일로 강제 덮어쓰기를 진행하시겠습니까?
echo ========================================================
set /p FORCE="강제 업로드 (Y/N): "

if /i "%FORCE%"=="Y" git push -f -u origin main

:finish

echo.
echo [완료] 모든 작업이 끝났습니다. 화면을 닫으셔도 됩니다.
pause