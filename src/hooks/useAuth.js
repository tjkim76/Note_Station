import { useState, useCallback, useEffect } from 'react';
import { API_BASE } from '../config';

export function useAuth(db, saveDB, switchDatabase, currentDbName, authCodes) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(true);

  // 초기 로드 시 로그인 상태 확인
  useEffect(() => {
    let mounted = true;

    const checkLoginStatus = async () => {
      // 소셜 로그인 콜백 처리
      const { naverAuthCode, kakaoAuthCode, googleAuthCode } = authCodes;
      if (naverAuthCode) {
        await handleNaverLogin(naverAuthCode);
        return;
      }
      if (googleAuthCode) {
        await handleGoogleLogin(googleAuthCode);
        return;
      }
      if (kakaoAuthCode) {
        await handleKakaoLogin(kakaoAuthCode);
        return;
      }

      // 기존 세션 확인
      const storedUserId = sessionStorage.getItem('note_station_user_id');
      const storedUsername = sessionStorage.getItem('note_station_username');

      if (storedUserId && storedUsername) {
        try {
          const response = await fetch(`${API_BASE}/api/auth/me`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (response.ok && mounted) {
            // 세션 유효함: 사용자 상태 복구 및 DB 전환
            setUser({ id: Number(storedUserId), username: storedUsername });
            if (currentDbName === 'member') {
              switchDatabase(`note_${storedUsername}`);
            }
          } else if (response.status === 401) {
            throw new Error('Session invalid');
          }
        } catch (e) {
          console.warn("Session check failed, logging out locally:", e);
          // 세션 만료 시 스토리지 즉시 정리
          sessionStorage.removeItem('note_station_user_id');
          sessionStorage.removeItem('note_station_username');
          if (mounted) {
            setUser(null);
            if (currentDbName !== 'member') switchDatabase('member');
          }
        }
      }
      
      if (mounted) setIsSessionChecking(false);
    };

    checkLoginStatus();
    
    return () => { mounted = false; };
  }, [authCodes]); // 의존성 최소화: 마운트 시 및 authCode 변경 시에만 실행

  const login = useCallback(async (username, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const userInfo = data.user;
        setUser(userInfo);
        sessionStorage.setItem('note_station_user_id', String(userInfo.id));
        sessionStorage.setItem('note_station_username', userInfo.username);
        setError(null);
        
        // 사용자 DB로 전환
        switchDatabase(`note_${userInfo.username}`);
      } else {
        setError(data.error || '로그인에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      if (e.message === 'Failed to fetch') {
        setError('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      } else {
        setError('로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [switchDatabase]);

  const signup = useCallback(async (username, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 회원가입 후 바로 로그인 처리
        await login(username, password);
      } else {
        setError(data.error || '회원가입에 실패했습니다.');
      }
    } catch (e) {
      console.error('Signup error:', e);
      if (e.message === 'Failed to fetch') {
        setError('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      } else {
        setError('로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(async () => {
    // 1. 클라이언트 상태 즉시 초기화 (UI 반응성 및 루프 방지)
    setUser(null);
    sessionStorage.removeItem('note_station_user_id');
    sessionStorage.removeItem('note_station_username');
    switchDatabase('member');

    try {
      // 2. 서버에 로그아웃 요청 (쿠키 삭제) - 실패해도 클라이언트는 이미 로그아웃됨
      await fetch(`${API_BASE}/api/auth/logout`, { 
        method: 'POST',
        credentials: 'include' 
      });
    } catch (e) {
      console.warn("Server logout failed (client cleared):", e);
    }
  }, [switchDatabase]);

  const initiateNaverLogin = useCallback(() => {
    // !!! 중요 !!!
    // 아래 값들을 실제 네이버 개발자 센터에서 발급받은 정보로 교체해야 합니다.
    const NAVER_CLIENT_ID = 'YOUR_NAVER_CLIENT_ID'; // 실제 클라이언트 ID로 교체
    const REDIRECT_URI = window.location.origin; // 현재 접속한 주소(IP 등)를 자동으로 사용

    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('naver_auth_state', state);

    const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
    window.location.href = url;
  }, []);

  const handleNaverLogin = useCallback(async (code) => {
    // --- 보안 경고 ---
    // 이 부분은 원래 백엔드 서버에서 Client Secret과 함께 처리되어야 합니다.
    // 클라이언트에서 직접 토큰을 요청하는 것은 보안상 매우 취약합니다.
    // 여기서는 교육 목적으로 백엔드 로직을 시뮬레이션합니다.
    
    alert('네이버 로그인 콜백을 수신했습니다. 실제 서비스에서는 이 단계에서 서버와 통신하여 사용자 정보를 받아옵니다.');
    console.log('Received Naver auth code:', code);

    // --- 시뮬레이션된 백엔드 로직 ---
    // 1. 실제로는 백엔드가 이 code를 받아 네이버에 access_token을 요청합니다.
    // 2. 백엔드는 access_token으로 사용자 프로필(네이버 ID, 이름 등)을 받아옵니다.
    const naverUser = { naver_id: 'simulated_naver_id_12345', username: '네이버사용자' };

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider: 'naver', socialId: naverUser.naver_id, username: naverUser.username })
      });
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        sessionStorage.setItem('note_station_user_id', String(data.user.id));
        sessionStorage.setItem('note_station_username', data.user.username);
        switchDatabase(`note_${data.user.username}`);
      }
    } catch (e) {
      console.error('Naver login processing error:', e);
      setError('네이버 로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [switchDatabase]);

  const initiateKakaoLogin = useCallback(() => {
    // !!! 중요 !!!
    // 아래 값들을 실제 카카오 개발자 센터에서 발급받은 정보로 교체해야 합니다.
    const KAKAO_CLIENT_ID = 'YOUR_KAKAO_REST_API_KEY'; // 실제 REST API 키로 교체
    const REDIRECT_URI = window.location.origin; // 현재 접속한 주소(IP 등)를 자동으로 사용

    const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`;
    window.location.href = url;
  }, []);

  const handleKakaoLogin = useCallback(async (code) => {
    // --- 보안 경고 ---
    // 네이버와 마찬가지로, 이 로직은 원래 백엔드에서 처리되어야 합니다.
    // 여기서는 교육 목적으로 백엔드 로직을 시뮬레이션합니다.
    
    alert('카카오 로그인 콜백을 수신했습니다. 실제 서비스에서는 이 단계에서 서버와 통신하여 사용자 정보를 받아옵니다.');
    console.log('Received Kakao auth code:', code);

    // --- 시뮬레이션된 백엔드 로직 ---
    // 1. 실제로는 백엔드가 이 code를 받아 카카오에 access_token을 요청합니다.
    // 2. 백엔드는 access_token으로 사용자 프로필(카카오 ID, 닉네임 등)을 받아옵니다.
    const kakaoUser = { kakao_id: 'simulated_kakao_id_67890', username: '카카오사용자' };

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider: 'kakao', socialId: kakaoUser.kakao_id, username: kakaoUser.username })
      });
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        sessionStorage.setItem('note_station_user_id', String(data.user.id));
        sessionStorage.setItem('note_station_username', data.user.username);
        switchDatabase(`note_${data.user.username}`);
      }
    } catch (e) {
      console.error('Kakao login processing error:', e);
      setError('카카오 로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [switchDatabase]);

  const initiateGoogleLogin = useCallback(() => {
    // !!! 중요 !!!
    // 아래 값들을 실제 구글 클라우드 콘솔에서 발급받은 정보로 교체해야 합니다.
    const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // 실제 클라이언트 ID로 교체
    const REDIRECT_URI = window.location.origin;

    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('google_auth_state', state);

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=email%20profile&state=${state}`;
    window.location.href = url;
  }, []);

  const handleGoogleLogin = useCallback(async (code) => {
    // --- 보안 경고 ---
    // 백엔드 로직 시뮬레이션
    
    alert('구글 로그인 콜백을 수신했습니다. 실제 서비스에서는 이 단계에서 서버와 통신하여 사용자 정보를 받아옵니다.');
    console.log('Received Google auth code:', code);

    // --- 시뮬레이션된 백엔드 로직 ---
    const googleUser = { google_id: 'simulated_google_id_11223', username: '구글사용자' };

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider: 'google', socialId: googleUser.google_id, username: googleUser.username })
      });
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        sessionStorage.setItem('note_station_user_id', String(data.user.id));
        sessionStorage.setItem('note_station_username', data.user.username);
        switchDatabase(`note_${data.user.username}`);
      }
    } catch (e) {
      console.error('Google login processing error:', e);
      setError('구글 로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [switchDatabase]);

  // 401 Unauthorized 이벤트 리스너 (다른 훅에서 발생한 인증 오류 처리)
  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('note-app:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('note-app:unauthorized', handleUnauthorized);
  }, [logout]);

  return { user, login, signup, logout, initiateNaverLogin, initiateKakaoLogin, initiateGoogleLogin, error, setError, isLoading, isSessionChecking };
}