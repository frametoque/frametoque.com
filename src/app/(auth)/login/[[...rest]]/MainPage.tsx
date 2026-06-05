"use client";

import { useState, useEffect } from "react";
import { useSignIn, useUser, useSignUp } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaGithub } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const protectImage = (e) => e.preventDefault();

export default function CustomLogin() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const { signUp, setActive: setSignUpActive } = useSignUp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState("email");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) setErrorMsg(decodeURIComponent(error));
  }, [searchParams]);

  useEffect(() => {
    if (userLoaded && isSignedIn) {
      const checkAndRedirect = async () => {
        try {
          const response = await fetch("/api/auth/check-role");
          const data = await response.json();
          const redirectPath = data.isAdmin ? "/admin" : "/dashboard";
          router.replace(redirectPath);
        } catch (err) {
          router.replace("/dashboard");
        }
      };
      checkAndRedirect();
    }
  }, [userLoaded, isSignedIn, router]);

  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const socialProviders = [
    { provider: "oauth_google", label: "Continue with Google", icon: <FcGoogle size={18} /> },
    { provider: "oauth_apple", label: "Continue with Apple", icon: <FaApple size={18} color="#fff" /> },
    { provider: "oauth_github", label: "Continue with GitHub", icon: <FaGithub size={18} color="#fff" /> },
  ];

  async function handleSocialSignIn(provider) {
    if (!isLoaded || loadingProvider) return;
    setLoadingProvider(provider);
    clearMessages();
    try {
      await signIn.authenticateWithRedirect({
        strategy: provider,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/sso-callback",
      });
    } catch (err) {
      setErrorMsg(err.errors?.[0]?.message || "Something went wrong. Please try again.");
      setLoadingProvider(null);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    clearMessages();
    setSubmitting(true);

    try {
      const result = await signIn.create({ identifier: email });

      const factors = result.supportedFirstFactors ?? [];
      const hasPassword = factors.some((f) => f.strategy === "password");

      if (factors.length === 0 || !hasPassword) {
        setErrorMsg(
          "This account was created using Google, Apple, or GitHub. Try signing in using them."
        );
        setSubmitting(false);
        return;
      }

      setStep("password");
    } catch (err) {
      const errCode = err?.errors?.[0]?.code;

      if (errCode === "form_identifier_not_found") {
        setStep("register");
      } else if (errCode === "strategy_for_user_invalid") {
        setErrorMsg(
          "This account was created using Google, Apple, or GitHub. Try signing in using them."
        );
      } else {
        setErrorMsg(
          err?.errors?.[0]?.message || "Something went wrong. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordLogin(e) {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    clearMessages();
    setSubmitting(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        try {
          const response = await fetch("/api/auth/check-role");
          const data = await response.json();
          const redirectPath = data.isAdmin ? "/admin" : "/dashboard";
          router.replace(redirectPath);
        } catch (err) {
          router.replace("/dashboard");
        }
      }
    } catch (err) {
      const code = err?.errors?.[0]?.code;
      if (code === "form_password_incorrect") {
        setErrorMsg("Incorrect password. Please try again or reset your password.");
      } else {
        setErrorMsg(err?.errors?.[0]?.message || "Sign in failed. Please try again.");
      }
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    clearMessages();
    setSubmitting(true);

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      if (result.status === "missing_requirements") {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setStep("verify");
      } else if (result.status === "complete") {
        await setSignUpActive({ session: result.createdSessionId });
        router.replace("/dashboard");
      }
    } catch (err) {
      setErrorMsg(err?.errors?.[0]?.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    clearMessages();
    setSubmitting(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setSignUpActive({ session: result.createdSessionId });
        router.replace("/dashboard");
      }
    } catch {
      setErrorMsg("Invalid or expired code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    clearMessages();
    setSubmitting(true);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setSuccessMsg("A reset code has been sent to your email.");
      setStep("reset");
    } catch (err) {
      setErrorMsg(err?.errors?.[0]?.message || "Could not send reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!isLoaded || submitting) return;
    clearMessages();
    setSubmitting(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: newPassword,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/dashboard");
      }
    } catch (err) {
      setErrorMsg(err?.errors?.[0]?.message || "Reset failed. Check your code and try again.");
    } finally {
      setSubmitting(false);
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

  const stepMeta = {
    email: {
      title: "Get",
      titleAccent: "Started.",
      sub: "Enter your email to sign in or create an account.",
    },
    password: {
      title: "Hello",
      titleAccent: "again.",
      sub: `Signing in as ${email}`,
    },
    register: {
      title: "Create your",
      titleAccent: "account.",
      sub: `We'll set up an account for ${email}`,
    },
    verify: {
      title: "Check your",
      titleAccent: "inbox.",
      sub: `We sent a 6-digit code to ${email}`,
    },
    forgot: {
      title: "Reset your",
      titleAccent: "password.",
      sub: `We'll send a reset link to ${email}`,
    },
    reset: {
      title: "New",
      titleAccent: "password.",
      sub: "Enter the code we sent and choose a new password.",
    },
  };

  const meta = stepMeta[step];

  const inputCls =
    "w-full bg-slate-900 border border-slate-800 hover:border-slate-700 " +
    "focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 " +
    "rounded-2xl px-5 py-3.5 text-sm text-slate-200 placeholder-slate-500 transition-all";

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

            {step !== "email" && (
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  if (step === "password" || step === "register") setStep("email");
                  else if (step === "forgot") setStep("password");
                  else if (step === "reset") setStep("forgot");
                  else if (step === "verify") setStep("register");
                }}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs mb-8 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
              <span className="bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
                {meta.title}{" "}
              </span>
              <span className="bg-gradient-to-b from-brand-400 to-brand-600 bg-clip-text text-transparent">
                {meta.titleAccent}
              </span>
            </h1>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">{meta.sub}</p>

            {/* Messages */}
            {errorMsg && (
              <div className="text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-3 rounded-2xl text-sm mb-6 text-center">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-4 py-3 rounded-2xl text-sm mb-6 text-center">
                {successMsg}
              </div>
            )}

            {step === "email" && (
              <>
                <form onSubmit={handleEmailSubmit} className="space-y-3 mb-5">
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className={inputCls + " pr-11"}
                    />
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !!loadingProvider}
                    className="w-full mt-1 rounded-2xl bg-brand-500 hover:bg-brand-400
                               disabled:opacity-50 disabled:cursor-not-allowed
                               text-white font-medium py-3.5 text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : "Continue"}
                  </button>
                  <div id="clerk-captcha" />
                </form>

                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-slate-800" />
                  <span className="text-xs text-slate-500">or</span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>

                <div className="flex justify-center gap-4">
                  {socialProviders.map((btn) => {
                    const isLoading = loadingProvider === btn.provider;
                    return (
                      <button
                        key={btn.provider}
                        type="button"
                        onClick={() => handleSocialSignIn(btn.provider)}
                        disabled={!!loadingProvider || submitting}
                        title={btn.label}
                        className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800
                                   hover:bg-slate-800 hover:border-brand-500/40
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   flex items-center justify-center transition-all"
                      >
                        {isLoading
                          ? <span className="h-4 w-4 rounded-full border-2 border-slate-600 border-t-brand-400 animate-spin" />
                          : btn.icon}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-3 mb-5">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-slate-400">
                  <Mail className="h-4 w-4 text-slate-600 shrink-0" />
                  <span className="truncate">{email}</span>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className={inputCls + " pr-11"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { clearMessages(); setStep("forgot"); }}
                    className="text-xs text-brand-500 hover:text-brand-400 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-brand-500 hover:bg-brand-400
                             disabled:opacity-50 disabled:cursor-not-allowed
                             text-white font-medium py-3.5 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
                </button>
                <div id="clerk-captcha" />
              </form>
            )}

            {step === "register" && (
              <form onSubmit={handleRegister} className="space-y-3 mb-5">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-slate-400">
                  <Mail className="h-4 w-4 text-slate-600 shrink-0" />
                  <span className="truncate">{email}</span>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className={inputCls}
                  />
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className={inputCls + " pr-11"}
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
                  disabled={submitting}
                  className="w-full rounded-2xl bg-brand-500 hover:bg-brand-400
                             disabled:opacity-50 disabled:cursor-not-allowed
                             text-white font-medium py-3.5 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : "Create account"}
                </button>
                <div id="clerk-captcha" />
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleVerify} className="space-y-4 mb-5">
                <input
                  type="text"
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
                  className={
                    inputCls +
                    " text-center tracking-[0.5em] text-lg font-mono"
                  }
                />

                <button
                  type="submit"
                  disabled={submitting || code.length < 6}
                  className="w-full rounded-2xl bg-brand-500 hover:bg-brand-400
                             disabled:opacity-50 disabled:cursor-not-allowed
                             text-white font-medium py-3.5 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : "Verify & continue"}
                </button>
              </form>
            )}

            {step === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-3 mb-5">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-slate-400">
                  <Mail className="h-4 w-4 text-slate-600 shrink-0" />
                  <span className="truncate">{email}</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-brand-500 hover:bg-brand-400
                             disabled:opacity-50 disabled:cursor-not-allowed
                             text-white font-medium py-3.5 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send reset code"}
                </button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-3 mb-5">
                <input
                  type="text"
                  required
                  autoFocus
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="Reset code"
                  maxLength={6}
                  className={inputCls + " text-center tracking-[0.5em] font-mono"}
                />

                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className={inputCls + " pr-11"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-brand-500 hover:bg-brand-400
                             disabled:opacity-50 disabled:cursor-not-allowed
                             text-white font-medium py-3.5 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting…</> : "Reset password"}
                </button>
              </form>
            )}

            {(step === "email" || step === "register") && (
              <p className="mt-8 text-center text-xs text-slate-600 leading-relaxed">
                By continuing you agree to our{" "}
                <Link href="/terms" className="text-brand-500 hover:text-brand-400 transition-colors">Terms</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-brand-500 hover:text-brand-400 transition-colors">Privacy Policy</Link>
              </p>
            )}
          </div>
        </div>

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
      {/* <Footer /> */}
    </>
  );
}