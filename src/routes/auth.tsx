import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode } => ({
    mode: s.mode === "signup" || s.mode === "forgot" ? s.mode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — AI Study Planner" },
      { name: "description", content: "Log in or create your AI Study Planner account." },
      { property: "og:title", content: "Sign in — AI Study Planner" },
      { property: "og:description", content: "Log in or create your AI Study Planner account." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email");
const pwSchema = z.string().min(8, "Password must be at least 8 characters");

function AuthPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.mode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => data.user && navigate({ to: "/dashboard" }));
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const em = emailSchema.safeParse(email);
    if (!em.success) return setMsg(em.error.issues[0].message);
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(em.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for a reset link.");
        return;
      }
      const pw = pwSchema.safeParse(password);
      if (!pw.success) return setMsg(pw.error.issues[0].message);
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: em.data,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMsg("Almost there — check your email to confirm your account, then log in.");
          return;
        }
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: em.data, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (res.error) return toast.error(res.error.message ?? "Google sign-in failed");
    if (res.redirected) return;
    navigate({ to: "/dashboard" });
  }

  const title = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";

  return (
    <div className="mesh flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Logo />
      <div className="panel mt-8 w-full max-w-sm p-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pw">Password</Label>
                {mode === "login" && (
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => setMode("forgot")}>
                    Forgot password?
                  </button>
                )}
              </div>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
            </div>
          )}
          {msg && <p className="text-sm text-muted-foreground" role="alert">{msg}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Sign up" : mode === "forgot" ? "Send reset link" : "Log in"}
          </Button>
        </form>
        {mode !== "forgot" && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
          </>
        )}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>No account? <button className="text-primary hover:underline" onClick={() => setMode("signup")}>Sign up</button></>
          ) : (
            <>Have an account? <button className="text-primary hover:underline" onClick={() => setMode("login")}>Log in</button></>
          )}
        </p>
      </div>
      <Link to="/" className="mt-6 text-sm text-muted-foreground hover:text-foreground">← Back home</Link>
    </div>
  );
}
