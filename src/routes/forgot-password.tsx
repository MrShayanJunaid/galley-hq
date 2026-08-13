import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — GalleyHQ" },
      {
        name: "description",
        content: "Request a password reset link for your GalleyHQ agency workspace account.",
      },
      { property: "og:title", content: "Reset your password — GalleyHQ" },
      { property: "og:description", content: "Request a GalleyHQ password reset link." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{sent ? "Check your email" : "Forgot your password?"}</CardTitle>
          <CardDescription>
            {sent
              ? `We sent a reset link to ${email}.`
              : "We'll email you a link to set a new password."}
          </CardDescription>
        </CardHeader>
        {!sent ? (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </CardContent>
        ) : null}
        <CardContent className="space-y-3 pt-0">
          <Link
            to="/auth"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Back to login
          </Link>
          <p className="text-xs text-muted-foreground">
            Need help? Email{" "}
            <a
              href="mailto:support@galleyhq.com"
              className="underline underline-offset-4"
            >
              support@galleyhq.com
            </a>
          </p>
        </CardContent>

      </Card>
    </div>
  );
}
