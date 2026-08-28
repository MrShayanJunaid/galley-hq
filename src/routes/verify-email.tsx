import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchVerificationState,
  resendErrorMessage,
  resendVerificationEmail,
} from "@/lib/auth-verification";

export const Route = createFileRoute("/verify-email")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verify your email — GalleyHQ" },
      {
        name: "description",
        content: "Confirm your email address to activate your GalleyHQ agency workspace.",
      },
      { property: "og:title", content: "Verify your email — GalleyHQ" },
      { property: "og:description", content: "Confirm your email to access GalleyHQ." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchVerificationState().then(({ user, verified }) => {
      if (!active) return;
      setEmail(user?.email ?? null);
      setIsChecking(false);
      if (verified) navigate({ to: "/dashboard", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleRecheck() {
    setIsChecking(true);
    // Refresh the session so a just-confirmed email is picked up immediately.
    await supabase.auth.refreshSession();
    const { verified } = await fetchVerificationState();
    setIsChecking(false);
    if (verified) {
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    toast.error("Your email isn't verified yet. Open the link in your inbox first.");
  }

  async function handleResend() {
    if (!email) {
      toast.error("Sign in again so we know where to send the email.");
      return;
    }
    setIsResending(true);
    const { error } = await resendVerificationEmail(email);
    setIsResending(false);
    if (error) {
      toast.error(resendErrorMessage(error.message));
      return;
    }
    toast.success("Verification email sent. Check your inbox.");
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
            aria-hidden
          >
            <MailCheck className="h-8 w-8 text-primary" />
          </span>
          <CardTitle className="text-display mt-4 text-2xl">Verify your email</CardTitle>
          <CardDescription>
            Please verify your email before signing in. Check your inbox for the verification email
            {email ? ` we sent to ${email}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={handleRecheck} disabled={isChecking}>
            {isChecking ? "Checking…" : "I've verified — continue"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={isResending || !email}
          >
            {isResending ? "Sending…" : "Resend verification email"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleSignOut}>
            Sign out
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Wrong address? <Link to="/auth" className="underline underline-offset-4">Back to sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
