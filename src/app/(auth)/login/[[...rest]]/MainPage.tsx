"use client";

import { useState, useEffect } from "react";
import { useSignIn, useUser, useSignUp } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaGithub } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
const protectImage = (e) => e.preventDefault();
export default function CustomLogin({ scrolled }) {
  const { isLoaded, signIn } = useSignIn();
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingProvider, setLoadingProvider] = useState(null);

  const { setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signUp, setActive: setSignUpActive } = useSignUp();

  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) setErrorMsg(decodeURIComponent(error));
  }, [searchParams]);

  useEffect(() => {
    if (userLoaded && isSignedIn) router.replace("/dashboard");
  }, [userLoaded, isSignedIn, router]);

  const socialProviders = [
    { provider: "oauth_google", label: "Continue with Google", icon: <FcGoogle size={18} /> },
    { provider: "oauth_apple",  label: "Continue with Apple",  icon: <FaApple  size={18} color="#fff" /> },
    { provider: "oauth_github", label: "Continue with GitHub", icon: <FaGithub size={18} color="#fff" /> },
  ];

  async function handleSignIn(provider) {
    if (!isLoaded || loadingProvider) return;
    setLoadingProvider(provider);
    setErrorMsg("");
    try {
      await signIn.authenticateWithRedirect({
        strategy: provider,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err) {
      console.error("Sign in error:", err);
      setErrorMsg(err.errors?.[0]?.message || "Something went wrong. Please try again.");
      setLoadingProvider(null);
    }
  }
 async function handleEmailLogin(e) {
  e.preventDefault();
  if (!isLoaded || submitting) return;

  setErrorMsg("");
  setSubmitting(true);

  try {
    const result = await signIn.create({
      identifier: email,
      password,
    });

    if (result.status === "complete") {
      await setActive({ session: result.createdSessionId });
      router.replace("/dashboard");
      return;
    }

  } catch (err) {
  const code = err?.errors?.[0]?.code;

  if (code === "strategy_for_user_invalid") {
    setErrorMsg(
      "This account was created using Google, Apple, or GitHub. Please use that method to sign in."
    );
  }

  else if (code === "form_identifier_not_found") {
    try {
      const signUpResult = await signUp.create({
        emailAddress: email,
        password,
      });

    if (signUpResult.status === "missing_requirements") {
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setVerifying(true); 
    } 
    else if (signUpResult.status === "complete") {
      await setSignUpActive({
        session: signUpResult.createdSessionId,
      });
      router.replace("/dashboard");
    }


    } catch (signupErr) {
      setErrorMsg(
        signupErr?.errors?.[0]?.message || "Signup failed."
      );
    }
  }

  else {
    setErrorMsg(
      err?.errors?.[0]?.message || "Invalid email or password."
    );
  }
}
 finally {
    setSubmitting(false);
  }
}

async function handleVerify(e) {
  e.preventDefault();
  if (!code) return;

  setErrorMsg("");

  try {
    const completeSignUp = await signUp.attemptEmailAddressVerification({
      code,
    });

    if (completeSignUp.status === "complete") {
      await setSignUpActive({
        session: completeSignUp.createdSessionId,
      });

      router.replace("/dashboard");
    }

  } catch (err) {
    setErrorMsg("Invalid or expired code.");
  }
}




  if (userLoaded && isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-black flex">
      <Navbar scrolled={true} />

      {/* ── LEFT PANEL ── */}
      <div className="relative flex flex-col justify-center w-full lg:w-1/2 px-8 sm:px-16 py-16">

        <div className="relative z-10 max-w-sm w-full mx-auto">

          <Link href="/" className="inline-block mb-12">
            <Image
              src="/logos/ft/name-logo.png"
              alt="Frametoque"
              width={160}
              height={32}
              className="h-8 w-auto opacity-90 hover:opacity-100 transition-opacity"
              onContextMenu={protectImage}
              onDragStart={protectImage}
            />
          </Link>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            <span className="bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
              Welcome
            </span>
            <span className="bg-gradient-to-b from-brand-400 to-brand-600 bg-clip-text text-transparent">
              {" "}back.
            </span>
          </h1>
          <p className="text-slate-500 text-sm mb-10 leading-relaxed">
            Login or create an account instantly with your email, 
            or continue with a social provider.
          </p>

          {errorMsg && (
            <div className="text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-3 rounded-2xl text-sm mb-6 text-center">
              {errorMsg}
            </div>
          )}

          {/* ── Email + Password ── */}
{verifying ? (
  <form onSubmit={handleVerify} className="space-y-4 mb-5">

    <h2 className="text-xl font-semibold text-white text-center">
      Verify your email
    </h2>

    <p className="text-sm text-slate-500 text-center">
      We sent a 6-digit code to{" "}
      <span className="text-slate-300">{email}</span>
    </p>

    <input
      type="text"
      value={code}
      onChange={(e) => setCode(e.target.value)}
      placeholder="Enter code"
      className="w-full text-center tracking-widest text-lg
                 bg-slate-900 border border-slate-800
                 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20
                 rounded-2xl px-5 py-3.5 text-slate-200"
    />

    <button
      type="submit"
      className="w-full rounded-2xl bg-brand-500 hover:bg-brand-400
                 text-white font-medium py-3.5 text-sm"
    >
      Verify & Continue
    </button>

    <button
      type="button"
      onClick={() => setVerifying(false)}
      className="w-full text-xs text-slate-500 hover:text-slate-300"
    >
      Back to login
    </button>

  </form>
) : (
  <form onSubmit={handleEmailLogin} className="space-y-3 mb-5">

    <div className="relative">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700
                   focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20
                   rounded-2xl px-5 py-3.5 pr-11 text-sm text-slate-200 placeholder-slate-500
                   transition-all"
      />
      <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
    </div>

    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700
                   focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20
                   rounded-2xl px-5 py-3.5 pr-11 text-sm text-slate-200 placeholder-slate-500
                   transition-all"
      />
      <button
        type="button"
        onClick={() => setShowPassword((s) => !s)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>

    <button
      type="submit"
      disabled={submitting || !!loadingProvider}
      className="w-full mt-2 rounded-2xl bg-brand-500 hover:bg-brand-400
                 disabled:opacity-50 disabled:cursor-not-allowed
                 text-white font-medium py-3.5 text-sm transition-colors"
    >
      {submitting ? "Signing in…" : "Login"}
    </button>

    <div id="clerk-captcha" />

  </form>
)}


<div className="flex items-center gap-3 my-5">
  <div className="h-px flex-1 bg-slate-800" />
  <span className="text-xs text-slate-500">or</span>
  <div className="h-px flex-1 bg-slate-800" />
</div>

{/* Social buttons */}
<div className="flex justify-center gap-4">
  {socialProviders.map((btn) => {
    const isLoading = loadingProvider === btn.provider;
    return (
      <button
        key={btn.provider}
        type="button"
        onClick={() => handleSignIn(btn.provider)}
        disabled={!!loadingProvider || submitting}
        title={btn.label}
        className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800
                   hover:bg-slate-800 hover:border-brand-500/40
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center transition-all"
      >
        {isLoading ? (
          <span className="h-4 w-4 rounded-full border-2 border-slate-600 border-t-brand-400 animate-spin" />
        ) : (
          btn.icon
        )}
      </button>
    );
  })}
</div>


          <p className="mt-8 text-center text-xs text-slate-600 leading-relaxed">
            By continuing you agree to our{" "}
            <Link href="/terms"   className="text-brand-500 hover:text-brand-400 transition-colors">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-brand-500 hover:text-brand-400 transition-colors">Privacy Policy</Link>
          </p>

        </div>
      </div>

      {/* ── RIGHT ─ */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">

        <Image
          src="/login-cover.jpg"  
          alt=""
          fill
          className="object-cover object-center"
          priority
        />

        <div className="absolute inset-0 bg-slate-950/40" />

        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-950 to-transparent" />

      </div>

    </div>
      <Footer />
</>
  );
}