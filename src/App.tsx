import React, { useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DocsPage from "@/pages/DocsPage";
import AgentsPage from "@/pages/AgentsPage";
import AgentDetailPage from "@/pages/AgentDetailPage";
import AgentPreviewPage from "./pages/AgentPreviewPage";

/* -------------------------- Helpers -------------------------- */
function normalizeCode(err: any) {
  return String(err?.code || err?.message || err || "").toLowerCase();
}

type PwChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  valid: boolean;
};

function checkPassword(pw: string): PwChecks {
  const length = pw.length >= 8;
  const upper = /[A-Z]/.test(pw);
  const lower = /[a-z]/.test(pw);
  const digit = /\d/.test(pw);
  return { length, upper, lower, digit, valid: length && upper && lower && digit };
}

/* -------------------------- Top Navigation -------------------------- */
function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="w-full sticky top-0 z-10 backdrop-blur bg-white/80 border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            className="font-bold text-lg tracking-tight hover:opacity-80 transition"
            onClick={() => navigate("/")}
          >
            <span className="inline-flex items-center gap-2">
              <span className="grid place-items-center w-7 h-7 rounded-lg bg-indigo-600 text-white text-sm">AI</span>
              Coach
            </span>
          </button>
          <nav className="hidden sm:flex items-center gap-4">
            <button
              className="text-gray-700 hover:text-black transition"
              onClick={() => navigate("/docs")}
            >
              Documentation
            </button>
            <button
              className="text-gray-700 hover:text-black transition"
              onClick={() => navigate("/agents")}
            >
              Agent Portal
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="hidden sm:inline text-sm text-gray-600">{user.email}</span>
              <button
                onClick={() => logout()}
                className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm hover:opacity-90 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------------------------- Login Screen --------------------------- */
/** Sign in first; on ambiguous "invalid-credential"/"user-not-found", try sign-up.
    Enforce password policy *for sign-up attempts* (min 8, A-Z, a-z, 0-9). */
function LoginPage() {
  const { loginEmail, signupEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [err, setErr] = useState<string>("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const pw = checkPassword(password);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setBusy(true);

    const emailTrimmed = email.trim();

    try {
      // 1) Try sign-in first
      await loginEmail(emailTrimmed, password);
    } catch (error: any) {
      const code = normalizeCode(error);

      // Firebase may return these for both non-existent users AND wrong password (enumeration protection).
      const maybeNoAccount =
        code.includes("auth/user-not-found") ||
        code.includes("auth/invalid-credential") ||
        code.includes("auth/invalid-login-credentials");

      if (maybeNoAccount) {
        // 2) We're about to attempt sign-up. Enforce password policy *before* creating the account.
        if (!pw.valid) {
          setErr(
            "If you’re creating a new account, your password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number. If you already have an account, use the correct password for that account or reset it."
          );
          setBusy(false);
          return;
        }

        try {
          await signupEmail(emailTrimmed, password);
        } catch (e2: any) {
          const code2 = normalizeCode(e2);

          if (code2.includes("auth/email-already-in-use")) {
            // The email exists; the original error was almost surely a wrong password.
            setErr("That email already exists. The password may be incorrect — try again or reset it.");
          } else if (code2.includes("auth/weak-password")) {
            // Extra safety if backend enforces additional strength.
            setErr("Password is too weak. Please meet the password requirements below.");
          } else if (code2.includes("auth/invalid-email")) {
            setErr("That email looks invalid. Double-check the spelling.");
          } else {
            setErr(e2?.message || "Could not create account.");
          }
          setBusy(false);
          return;
        }
      } else {
        setErr(error?.message || "Authentication failed.");
        setBusy(false);
        return;
      }
    }

    // Success (either signed in, or signed up then signed in)
    const to = location.state?.from?.pathname || "/docs";
    navigate(to, { replace: true });
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mx-auto max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600 text-white grid place-items-center text-xl font-bold shadow">
              AI
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Welcome to AI Coach</h1>
            <p className="text-gray-600 text-sm mt-1">
              Log in to continue. If you’re new, we’ll create your account automatically.
            </p>
          </div>

          <form onSubmit={submit} className="bg-white rounded-2xl shadow-lg border p-6 space-y-4">
            {err && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}

            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Email</span>
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Password</span>
              <div className="mt-1 flex items-stretch gap-2">
                <input
                  name="password"
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="shrink-0 px-3 rounded-lg border hover:bg-gray-50 text-sm"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>

              {/* Password policy checklist */}
              <ul className="mt-2 text-xs text-gray-600 space-y-1">
                <li className={pw.length ? "text-green-700" : "text-gray-600"}>
                  {pw.length ? "✓" : "•"} At least 8 characters
                </li>
                <li className={pw.upper ? "text-green-700" : "text-gray-600"}>
                  {pw.upper ? "✓" : "•"} Contains an uppercase letter (A–Z)
                </li>
                <li className={pw.lower ? "text-green-700" : "text-gray-600"}>
                  {pw.lower ? "✓" : "•"} Contains a lowercase letter (a–z)
                </li>
                <li className={pw.digit ? "text-green-700" : "text-gray-600"}>
                  {pw.digit ? "✓" : "•"} Contains a number (0–9)
                </li>
              </ul>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 font-medium hover:opacity-90 disabled:opacity-60 transition"
            >
              {busy ? "Please wait…" : "Continue"}
            </button>

            <p className="text-[12px] text-gray-500 text-center">
              By continuing you agree to the Terms and Privacy Policy.
            </p>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Having trouble? Check your email spelling and try again.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Auth Wrapper -------------------------- */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <div className="animate-pulse text-gray-600">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

/* -------------------------------- App -------------------------------- */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <AuthGate>
            <div className="min-h-screen bg-gray-50">
              <NavBar />
              <main className="mx-auto max-w-6xl px-4 py-6">
                <Routes>
                  <Route index element={<Navigate to="/docs" replace />} />
                  <Route path="docs" element={<DocsPage />} />
                  <Route path="agents" element={<AgentsPage />} />
                  <Route path="agents/:botId" element={<AgentDetailPage />} />
                  <Route path="agents/preview/:botId" element={<AgentPreviewPage />} />
                </Routes>
              </main>
            </div>
          </AuthGate>
        }
      />
    </Routes>
  );
}
