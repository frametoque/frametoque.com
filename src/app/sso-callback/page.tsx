"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react";
import { useClerk } from "@clerk/nextjs";
import Image from "next/image";

function SSOCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleRedirectCallback } = useClerk();
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing authentication...");
  const [showManualButton, setShowManualButton] = useState(false);
  const hasProcessed = useRef(false);
  const redirectTimeout = useRef(null);
  const manualButtonTimeout = useRef(null);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          return 95;
        }
        return prev + 1;
      });
    }, 40);

    return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    if (progress < 30) {
      setStatusMessage("Initializing authentication...");
    } else if (progress < 60) {
      setStatusMessage("Verifying credentials...");
    } else if (progress < 90) {
      setStatusMessage("Setting up your session...");
    } else if (progress < 100) {
      setStatusMessage("Finalizing...");
    }
  }, [progress]);

  useEffect(() => {
    // Show manual button after 8 seconds if not completed
    manualButtonTimeout.current = setTimeout(() => {
      if (!isComplete) {
        setShowManualButton(true);
      }
    }, 8000);

    return () => {
      if (manualButtonTimeout.current) {
        clearTimeout(manualButtonTimeout.current);
      }
    };
  }, [isComplete]);

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      try {
        const errorParam = searchParams.get("error");
        if (errorParam) {
          throw new Error(decodeURIComponent(errorParam));
        }

        await handleRedirectCallback({
  afterSignInUrl: "/dashboard",
  afterSignUpUrl: "/dashboard",
});

setProgress(100);
setStatusMessage("Authentication successful!");
setIsComplete(true);
setShowManualButton(false);
redirectTimeout.current = setTimeout(() => {
  router.push("/dashboard");
}, 600);

      } catch (err) {
        console.error("Authentication error:", err);
        setError(err.message || "Authentication failed");
        if (redirectTimeout.current) {
          clearTimeout(redirectTimeout.current);
        }
        setTimeout(() => {
          router.push("/login?error=" + encodeURIComponent(err.message || "Authentication failed. Please try again."));
        }, 2000);
      }
    };

    const timer = setTimeout(() => {
      handleAuthCallback();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, [handleRedirectCallback, router, searchParams]);

  // Safety fallback - if authentication takes too long
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (!isComplete && progress >= 95 && !error) {
        console.log("Safety redirect triggered");
        setProgress(100);
        setIsComplete(true);
        setShowManualButton(false);
        setTimeout(() => {
          router.push("/dashboard");
        }, 800);
      }
    }, 15000); // 15 second safety timeout

    return () => clearTimeout(safetyTimeout);
  }, [isComplete, progress, error, router]);

  const handleManualRedirect = () => {
    console.log("Manual redirect to dashboard");
    setProgress(100);
    setIsComplete(true);
    setShowManualButton(false);
    
    if (redirectTimeout.current) {
      clearTimeout(redirectTimeout.current);
    }
    
    setTimeout(() => {
      router.push("/dashboard");
    }, 300);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Framtoque
            </span>
          </div>
          
          <div className="w-20 h-20 border-4 border-red-500/30 rounded-full flex items-center justify-center mb-6 mx-auto">
            <div className="w-16 h-16 border-4 border-red-500 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold">!</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3 text-red-400">Authentication Error</h2>
          <p className="text-gray-300 mb-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            {error}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-lg transition-all duration-300 text-white font-medium border border-slate-700 hover:border-slate-600"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        {/* Logo with Progress Spinner */}
        <div className="flex items-center justify-center mb-10">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-full blur-xl"></div>
            
            {isComplete ? (
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/30">
                  <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center animate-pulse">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
             
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute -inset-1 rounded-lg blur-sm opacity-60"></div>
              <div className="relative w-auto rounded-lg flex items-center justify-center overflow-hidden px-3 py-2">
                <img 
                  src="/logos/ft/name-logo.png" 
                  alt="Framtoque Logo" 
                  className="h-6 object-contain"
                  style={{ minWidth: '120px' }} 
                />
              </div>
            </div>
          </div>
            
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
              {isComplete ? "Welcome to Framtoque!" : "Securing Your Access"}
            </h2>
            
            <p className="text-gray-300">
              {isComplete 
                ? "Your dashboard is ready!" 
                : "Please wait while we secure your credentials..."
              }
            </p>
          </div>
          
          {/* Progress Container */}
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Progress</span>
                  <span className="font-medium text-blue-400">
                    {isComplete ? "100%" : `${progress}%`}
                  </span>
                </div>
                
                <div className="h-3 w-full bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out shadow-lg shadow-blue-500/30"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  {!isComplete && (
                    <>
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                    </>
                  )}
                </div>
              </div>
              
              {/* Status Message */}
              <div className="pt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-center gap-3">
                  {isComplete ? (
                    <div className="flex items-center gap-2 text-blue-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">{statusMessage}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-gray-300 font-medium">{statusMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Manual Redirect Button - Shows after delay if not completed */}
          {showManualButton && !isComplete && (
            <div className="mt-6 animate-fadeIn">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border border-blue-500/20">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-blue-400 mb-1">Taking longer than usual?</h4>
                    <p className="text-sm text-gray-400">
                      If the process seems stuck, you can manually proceed to your dashboard.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleManualRedirect}
                  className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 px-6 py-4 text-white font-medium transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span>Proceed to Dashboard</span>
                  </div>
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-white/30 group-hover:bg-white/50 transition-colors duration-300"></div>
                </button>
                
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Your authentication is likely complete, this is just a backup option.
                </p>
              </div>
            </div>
          )}
          
          {/* Timeout Warning */}
          {!isComplete && progress < 50 && !showManualButton && (
            <div className="mt-6 animate-fadeIn">
              <div className="inline-flex items-center gap-2 text-sm text-gray-400 bg-slate-800/30 px-4 py-3 rounded-xl border border-slate-700/50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>This usually takes just a few seconds</span>
              </div>
            </div>
          )}
          
          {/* Cancel Button */}
          {!isComplete && !showManualButton && (
            <div className="mt-8 pt-6 border-t border-slate-800/50">
              <p className="text-sm text-gray-400 mb-4">
                Taking longer than expected?
              </p>
              <button
                onClick={() => {
                  if (redirectTimeout.current) {
                    clearTimeout(redirectTimeout.current);
                  }
                  router.push("/login");
                }}
                className="px-6 py-3 text-sm bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-lg transition-all duration-300 text-white font-medium border border-slate-700 hover:border-slate-600"
              >
                Cancel & Return to Sign In
              </button>
            </div>
          )}
        </div>
        
        {/* Footer Note */}
        <div className="mt-8">
          <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-slate-900/30 px-4 py-3 rounded-xl border border-slate-800/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>{isComplete ? "Redirecting to secure dashboard..." : "Your session is being encrypted and secured"}</span>
          </div>
        </div>
      </div>
      
      {/* Background Glow Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}

export default function SSOCallback() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
  <div className="relative">
    <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl blur-sm opacity-60"></div>
    <div className="relative w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 overflow-hidden">
      <img 
        src="/logos/ft/logo.png" 
        alt="Framtoque Logo" 
        className="w-8 h-8 object-contain"
      />
    </div>
  </div>
  
  <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
    Framtoque
  </span>
</div>
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-500/20 rounded-full animate-ping absolute inset-0" />
              <div className="w-20 h-20 border-4 border-transparent border-t-blue-400 border-r-blue-500 rounded-full animate-spin" />
            </div>
            <p className="mt-6 text-gray-400">Loading authentication...</p>
          </div>
        </div>
      }
    >
      <SSOCallbackContent />
    </Suspense>
  );
}