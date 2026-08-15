import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/confirm")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Email confirmed — GalleyHQ" },
      {
        name: "description",
        content: "Confirm your GalleyHQ email address and open your agency workspace.",
      },
      { property: "og:title", content: "Email confirmed — GalleyHQ" },
      { property: "og:description", content: "Your GalleyHQ workspace is ready." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmPage,
});

type ConfirmState =
  | { status: "pending" }
  | { status: "confirmed"; signedIn: boolean }
  | { status: "error"; title: string; message: string };

function readParams() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const get = (key: string) => hash.get(key) ?? query.get(key);
  return {
    error: get("error"),
    errorCode: get("error_code"),
    errorDescription: get("error_description"),
    tokenHash: get("token_hash"),
    type: get("type"),
    code: get("code"),
  };
}

function ConfirmPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<ConfirmState>({ status: "pending" });

  useEffect(() => {
    let active = true;

    async function run() {
      const params = readParams();

      if (params.error || params.errorCode) {
        const expired =
          (params.errorCode ?? "").includes("expired") ||
          (params.errorDescription ?? "").toLowerCase().includes("expired");
        if (!active) return;
        setState({
          status: "error",
          title: expired ? "This link has expired" : "This link is invalid",
          message:
            "This authentication link is no longer valid. Please request a new one from the sign-in page.",
        });
        return;
      }

      // PKCE / code exchange links
      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (!active) return;
        if (error) {
          setState({
            status: "error",
            title: "This link is invalid",
            message: "We couldn't verify this confirmation link. Please request a new one.",
          });
          return;
        }
        setState({ status: "confirmed", signedIn: true });
        return;
      }

      // Token-hash verification links
      if (params.tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: (params.type as "signup" | "email" | "email_change" | "invite") ?? "signup",
          token_hash: params.tokenHash,
        });
        if (!active) return;
        if (error) {
          const expired = error.message.toLowerCase().includes("expired");
          setState({
            status: "error",
            title: expired ? "This link has expired" : "This link is invalid",
            message:
              "This authentication link is no longer valid. Please request a new one from the sign-in page.",
          });
          return;
        }
        setState({ status: "confirmed", signedIn: true });
        return;
      }

      // Implicit-flow links already set the session via the client.
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setState({ status: "confirmed", signedIn: true });
        return;
      }
      setState({
        status: "error",
        title: "This link is invalid",
        message:
          "We couldn't find a confirmation to process. Please open the link from your email again or request a new one.",
      });
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        {state.status === "pending" ? (
          <CardHeader className="items-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
            <CardTitle className="mt-4">Confirming your email…</CardTitle>
            <CardDescription>This only takes a moment.</CardDescription>
          </CardHeader>
        ) : null}

        {state.status === "confirmed" ? (
          <>
            <CardHeader className="items-center text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
                aria-hidden
              >
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </span>
              <CardTitle className="text-display mt-4 text-2xl">Email confirmed</CardTitle>
              <CardDescription>
                Your email has been successfully verified. Your GalleyHQ workspace is ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() =>
                  state.signedIn
                    ? navigate({ to: "/dashboard", replace: true })
                    : navigate({ to: "/auth", replace: true })
                }
              >
                Continue to GalleyHQ
              </Button>
            </CardContent>
          </>
        ) : null}

        {state.status === "error" ? (
          <>
            <CardHeader className="items-center text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
                aria-hidden
              >
                <MailWarning className="h-8 w-8 text-destructive" />
              </span>
              <CardTitle className="text-display mt-4 text-2xl">{state.title}</CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/auth">Request a new link</Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Still stuck? Email{" "}
                <a href="mailto:support@galleyhq.com" className="underline underline-offset-4">
                  support@galleyhq.com
                </a>
              </p>
            </CardContent>
          </>
        ) : null}
      </Card>
    </div>
  );
}
