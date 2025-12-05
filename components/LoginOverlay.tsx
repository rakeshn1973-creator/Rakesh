import React, { useState, useEffect, useRef } from 'react';
import { Stethoscope, ArrowRight, Settings, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { loginUser, loginOrRegisterGoogleUser } from '../services/storageService';
import { User } from '../types';

interface LoginOverlayProps {
  onLogin: (user: User) => void;
}

const LoginOverlay: React.FC<LoginOverlayProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [customClientId, setCustomClientId] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(true);

  // Helper to decode JWT from Google
  const decodeJwt = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
  };

  useEffect(() => {
    // Safe access to process.env
    const envClientId = (typeof process !== 'undefined' && process.env?.GOOGLE_CLIENT_ID) || "";
    // If user typed a key, use it. Otherwise use env.
    const clientId = customClientId.trim() || envClientId;
    
    // Check if we have a potentially valid key
    const isPlaceholder = !clientId || clientId.includes("YOUR_GOOGLE_CLIENT_ID");
    const hasKey = clientId && !isPlaceholder && clientId.length > 10;

    let intervalId: any;
    
    const initializeGoogle = () => {
        const g = (window as any).google;
        
        // 1. If script isn't loaded yet, keep waiting
        if (!g || !g.accounts || !g.accounts.id) {
            return; 
        }

        // 2. Script loaded. Stop the spinner.
        setScriptLoading(false);

        // 3. If we don't have a key, we can't render the REAL button.
        // We will show the "Mock/Fallback" button instead.
        if (!hasKey) {
            setIsGoogleReady(false);
            if (intervalId) clearInterval(intervalId);
            return;
        }

        // 4. We have a key, try to render the REAL button.
        try {
            // Clear any previous button to avoid duplicates
            if (googleBtnRef.current) {
                googleBtnRef.current.innerHTML = ''; 
                
                g.accounts.id.initialize({
                    client_id: clientId,
                    callback: (response: any) => {
                        const payload = decodeJwt(response.credential);
                        if (payload) {
                            const user = loginOrRegisterGoogleUser(
                                payload.email,
                                payload.name,
                                payload.picture
                            );
                            onLogin(user);
                        } else {
                            setError("Failed to decode Google credential.");
                        }
                    },
                    auto_select: false,
                    cancel_on_tap_outside: true
                });

                g.accounts.id.renderButton(
                    googleBtnRef.current,
                    { theme: "outline", size: "large", width: "100%", type: "standard", shape: "rectangular" } 
                );
                
                // If we got here without throwing, the button is ready
                setIsGoogleReady(true);
                setError(""); 
            }
        } catch (e) {
            console.error("Google Auth Init Error", e);
            setIsGoogleReady(false);
        }
        
        if (intervalId) clearInterval(intervalId);
    };

    // Run check every 500ms
    intervalId = setInterval(initializeGoogle, 500);

    // Stop checking after 10 seconds to prevent infinite loops if script blocked
    const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        setScriptLoading(false);
    }, 10000);

    return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
    };
  }, [onLogin, customClientId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = loginUser(username);
    if (user) {
      onLogin(user);
    } else {
      setError('User not found. Try "admin" or "typist".');
    }
  };

  const handleMockGoogleClick = () => {
      // If we don't have a key, we offer to Simulate or Configure
      if (!customClientId && !process.env.GOOGLE_CLIENT_ID) {
          if (confirm("No Google API Key configured.\n\nWould you like to SIMULATE a successful Google Login for demo purposes?\n\n(Click Cancel to open Settings)")) {
              // Simulate Login
              const mockUser = loginOrRegisterGoogleUser(
                  "demo.doctor@gmail.com",
                  "Dr. Demo Google",
                  "https://lh3.googleusercontent.com/a/default-user=s96-c"
              );
              onLogin(mockUser);
          } else {
              setShowSettings(true);
              setError("Please enter your Google Client ID below to enable real Sign In.");
          }
      } else {
          // Key exists but maybe script failed or blocked
          setShowSettings(true);
          setError("Google Script failed to load. Please check your internet connection or ad blockers.");
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="bg-dragon-700 p-8 text-center relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-dragon-600 to-dragon-900 opacity-50"></div>
          <div className="relative z-10">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm shadow-lg">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">DigiMedPro - Transcribe</h1>
            <p className="text-dragon-100 font-medium tracking-wide text-sm uppercase">Helping Physicians Achieve Professional Documentation</p>
          </div>
          
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2"
            title="Configure API Keys"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto custom-scrollbar">
          {showSettings && (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Settings className="w-3 h-3" /> Configuration
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Google Client ID</label>
                        <input 
                            type="text" 
                            value={customClientId}
                            onChange={(e) => setCustomClientId(e.target.value)}
                            placeholder="1234...apps.googleusercontent.com"
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-dragon-500"
                        />
                         <div className="mt-2 text-[10px] text-slate-500 space-y-1">
                             <p>1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline text-blue-600">Google Cloud Credentials</a>.</p>
                             <p>2. Create OAuth 2.0 Client ID (Web Application).</p>
                             <p className="text-dragon-700 dark:text-dragon-400 font-medium bg-dragon-50 dark:bg-dragon-900/20 p-1 rounded">
                                ⚠ Important: Add <u>{window.location.origin}</u> to "Authorized JavaScript origins".
                             </p>
                             <p>3. Paste the Client ID above.</p>
                         </div>
                    </div>
                </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-dragon-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter username (e.g., admin)"
              />
            </div>
            
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
             <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
             <span className="text-xs font-semibold text-slate-400 uppercase">Or continue with</span>
             <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
          </div>

          <div className="relative min-h-[44px]">
             {/* 
                We keep the real container in the DOM so the script can render into it if ready.
                We hide it with CSS if we are not ready.
             */}
             <div 
                ref={googleBtnRef} 
                className={isGoogleReady ? 'block w-full' : 'hidden'}
                style={{ height: '44px' }}
             ></div>

             {/* Fallback / Simulation Button */}
             {!isGoogleReady && (
                 <button 
                    onClick={handleMockGoogleClick}
                    type="button"
                    disabled={scriptLoading}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-3 font-medium shadow-sm disabled:opacity-50"
                 >
                     {scriptLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                     ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                     )}
                     {scriptLoading ? "Loading..." : "Sign in with Google"}
                 </button>
             )}
          </div>
            
          <div className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
             <div className="flex justify-center gap-2 mb-2">
                 <ShieldCheck className="w-3 h-3 text-emerald-500" />
                 <span>Secure Login Environment</span>
             </div>
             Demo Users: <strong className="text-slate-600 dark:text-slate-300">admin</strong> or <strong className="text-slate-600 dark:text-slate-300">typist</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginOverlay;