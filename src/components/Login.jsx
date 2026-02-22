import React, { useState } from 'react';
import { User, Lock, LogIn, UserPlus, BookOpen, Eye, EyeOff } from 'lucide-react';
import NaverLoginIcon from './NaverLoginIcon';
import KakaoLoginIcon from './KakaoLoginIcon';
import GoogleLoginIcon from './GoogleLoginIcon';

export default function Login({ onLogin, onSignup, onNaverLogin, onKakaoLogin, onGoogleLogin, error, setError }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    if (isLoginView) {
      onLogin(username, password);
    } else {
      onSignup(username, password);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-4 shadow-lg transform -rotate-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Note Station</h1>
          <h2 className="text-lg font-medium text-gray-500 dark:text-gray-400">
            {isLoginView ? '환영합니다!' : '계정 만들기'}
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {isLoginView ? '나만의 노트 공간으로 로그인하세요' : '새로운 여정을 시작해보세요'}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-6 text-center font-medium animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5" />
            <input
              type="text"
              placeholder="아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm dark:text-white dark:placeholder-gray-400"
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm dark:text-white dark:placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-md shadow-indigo-200"
          >
            {isLoginView ? (
              <>
                <LogIn className="w-4 h-4" /> 로그인
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> 회원가입
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-6 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            <span className="flex-shrink mx-4 text-xs text-gray-400 dark:text-gray-500 font-medium">간편 로그인</span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        <div className="space-y-3">
            <button
              onClick={onNaverLogin}
              className="w-full py-3 bg-[#03C75A] text-white rounded-xl hover:bg-[#02b351] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 font-bold text-sm shadow-sm"
            >
                <NaverLoginIcon />
                네이버로 로그인
            </button>
            <button
              onClick={onKakaoLogin}
              className="w-full py-3 bg-[#FEE500] text-[#3A1D1D] rounded-xl hover:bg-[#fddc00] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 font-bold text-sm shadow-sm"
            >
                <KakaoLoginIcon />
                카카오로 로그인
            </button>
            <button
              onClick={onGoogleLogin}
              className="w-full py-3 bg-white text-gray-700 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 font-bold text-sm shadow-sm"
            >
                <GoogleLoginIcon />
                Google로 로그인
            </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsLoginView(!isLoginView);
              setError(null);
              setUsername('');
              setPassword('');
            }}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
          >
            {isLoginView ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}