import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { ensureOrcaAccount, ORCA_USERNAME } from "@/lib/orca.functions";

const GENERIC_ERROR = "Invalid credentials. Please try again.";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Recipes" },
      { name: "description", content: "Administrator sign-in for the Recipes site." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Sign in — Recipes" },
      { property: "og:description", content: "Administrator sign-in for the Recipes site." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Stage = "password" | "totp" | "enroll";

function AuthPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("password");
  const [username, setUsername] = useState(ORCA_USERNAME);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollQr, setEnrollQr] = useState<string | null>(null);
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);

  async function fail(message = GENERIC_ERROR) {
    await supabase.auth.signOut();
    setError(message);
    setBusy(false);
  }

  async function onPasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const ensured = await ensureOrcaAccount({ data: { username, password } });
    if (!ensured.ok || !ensured.email) {
      setError(GENERIC_ERROR);
      setBusy(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ensured.email,
      password,
    });
    if (signInError) {
      setError(GENERIC_ERROR);
      setBusy(false);
      return;
    }

    const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
    if (factorError) {
      await fail();
      return;
    }

    const verified = (factors?.totp ?? []).find((factor) => factor.status === "verified");
    if (verified) {
      setFactorId(verified.id);
      setStage("totp");
      setBusy(false);
      return;
    }

    const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Recipes ${Date.now()}`,
    });
    if (enrollError || !enrolled) {
      await fail();
      return;
    }
    setFactorId(enrolled.id);
    setEnrollQr(enrolled.totp.qr_code);
    setEnrollSecret(enrolled.totp.secret);
    setStage("enroll");
    setBusy(false);
  }

  async function onCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!factorId) return;
    setError(null);
    setBusy(true);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });
    if (verifyError) {
      setError("That code didn't work. Try the next one from your authenticator.");
      setCode("");
      setBusy(false);
      return;
    }

    setBusy(false);
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-5 py-20 sm:px-8">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Admin</span>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">
          {stage === "password" ? "Sign in" : stage === "totp" ? "Two-factor code" : "Set up two-factor"}
        </h1>

        {stage === "password" ? (
          <form onSubmit={onPasswordSubmit} className="mt-6 space-y-4">
            <Field label="Username" htmlFor="username">
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-foreground outline-none placeholder:text-muted-foreground"
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-foreground outline-none"
              />
            </Field>
            <SubmitButton busy={busy}>Continue</SubmitButton>
          </form>
        ) : null}

        {stage === "enroll" ? (
          <div className="mt-6 space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Scan this with your authenticator app, then enter the 6-digit code it shows.
            </p>
            {enrollQr ? (
              <img
                src={enrollQr}
                alt="TOTP enrollment QR code"
                className="mx-auto h-48 w-48 rounded-lg bg-white p-2"
              />
            ) : null}
            {enrollSecret ? (
              <p className="break-all rounded-md border border-border bg-input px-3 py-2 text-center font-mono text-xs text-muted-foreground">
                {enrollSecret}
              </p>
            ) : null}
            <CodeForm
              code={code}
              setCode={setCode}
              busy={busy}
              onSubmit={onCodeSubmit}
              label="Verify and finish"
            />
          </div>
        ) : null}

        {stage === "totp" ? (
          <div className="mt-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Enter the 6-digit code from your authenticator app.
            </p>
            <div className="mt-4">
              <CodeForm
                code={code}
                setCode={setCode}
                busy={busy}
                onSubmit={onCodeSubmit}
                label="Verify"
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function CodeForm({
  code,
  setCode,
  busy,
  onSubmit,
  label,
}: {
  code: string;
  setCode: (value: string) => void;
  busy: boolean;
  onSubmit: (event: React.FormEvent) => void;
  label: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Authentication code" htmlFor="totp-code">
        <input
          id="totp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-foreground outline-none"
        />
      </Field>
      <SubmitButton busy={busy}>{label}</SubmitButton>
    </form>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}