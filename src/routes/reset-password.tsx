import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password — GalleyHQ" },
      {
        name: "description",
        content: "Choose a new password for your GalleyHQ agency workspace account.",
      },
      { property: "og:title", content: "Reset your password — GalleyHQ" },
      { property: "og:description", content: "Choose a new GalleyHQ account password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type LinkState =
  | { status: "checking" }
  | { status: "ready" }
  | { status: "invalid"; title: string; message: string };

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>({ status: "checking" });

  useEffect(() => {
    if (!done || !hasSession) return;
    const timer = window.setTimeout(() => {
      void navigate({ to: "/dashboard" });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [done, hasSession, navigate]);

  useEffect(() => {
    let active = true;

    async function run() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      const get = (key: string) => hash.get(key) ?? query.get(key);

      const errorCode = get("error_code");
      const errorDescription = get("error_description");
      if (get("error") || errorCode) {
        const expired =
          (errorCode ?? "").includes("expired") ||
          (errorDescription ?? "").toLowerCase().includes("expired");
        if (!active) return;
        setLinkState({
          status: "invalid",
          title: expired ? "This link has expired" : "This reset link is invalid",
          message:
            "This authentication link is no longer valid. Please request a new one from the forgot-password page.",
        });
        return;
      }

      const code = get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        setLinkState(
          error
            ? {
                status: "invalid",
                title: "This reset link is invalid",
                message: "We couldn't verify this reset link. Please request a new one.",
              }
            : { status: "ready" },
        );
        return;
      }

      const tokenHash = get("token_hash");
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
        if (!active) return;
        setLinkState(
          error
            ? {
                status: "invalid",
                title: error.message.toLowerCase().includes("expired")
                  ? "This link has expired"
                  : "This reset link is invalid",
                message: "This authentication link is no longer valid. Please request a new one.",
              }
            : { status: "ready" },
        );
        return;
      }

      // Implicit recovery links: the client already stored the recovery session.
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setLinkState(
        data.session
          ? { status: "ready" }
          : {
              status: "invalid",
              title: "This reset link is invalid",
              message:
                "This password reset link is no longer valid. Please request a new one from the forgot-password page.",
            },
      );
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setIsPending(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setIsPending(false);
      toast.error(error.message || "We couldn't update your password. Please try again.");
      return;
    }

    // The recovery link signs the user in, so send them straight to the app.
    const { data } = await supabase.auth.getSession();
    setHasSession(Boolean(data.session));
    setIsPending(false);
    setDone(true);
  }

  if (done) {
    return (
      <Shell>
        <CardHeader className="items-center text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
            aria-hidden
          >
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </span>
          <CardTitle className="text-display mt-4 text-2xl">
            Password updated successfully
          </CardTitle>
          <CardDescription>
            {hasSession
              ? "Your password has been changed. Taking you to your GalleyHQ dashboard…"
              : "Your password has been changed. You can now sign in to GalleyHQ."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            {hasSession ? (
              <Link to="/dashboard">Continue to dashboard</Link>
            ) : (
              <Link to="/auth">Continue to sign in</Link>
            )}
          </Button>
        </CardContent>
      </Shell>
    );
  }

  if (linkState.status === "invalid") {
    return (
      <Shell>
        <CardHeader className="items-center text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
            aria-hidden
          >
            <KeyRound className="h-8 w-8 text-destructive" />
          </span>
          <CardTitle className="text-display mt-4 text-2xl">{linkState.title}</CardTitle>
          <CardDescription>{linkState.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Need help? Email{" "}
            <a href="mailto:support@galleyhq.com" className="underline underline-offset-4">
              support@galleyhq.com
            </a>
          </p>
        </CardContent>
      </Shell>
    );
  }

  return (
    <Shell>
      <CardHeader>
        <CardTitle className="text-display text-2xl">Reset your password</CardTitle>
        <CardDescription>Enter a new password for your GalleyHQ account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          {confirm.length > 0 && password !== confirm ? (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || linkState.status === "checking"}
          >
            {isPending ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">{children}</Card>
    </div>
  );
}
