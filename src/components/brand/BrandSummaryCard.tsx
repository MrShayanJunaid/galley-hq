import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

import { CompletionMeter, OnboardingStatusBadge, formatDateTime } from "@/components/brand/brand-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrandProfile } from "@/hooks/use-brand-profile";
import { profileSuggestions, profileToValues } from "@/lib/api/brand-profile";
import { computeCompletion } from "@/lib/brand/schema";

export function BrandSummaryCard({
  clientId,
  clientName,
  clientWebsite,
}: {
  clientId: string;
  clientName: string;
  clientWebsite: string | null;
}) {
  const { data: profile, isLoading } = useBrandProfile(clientId);
  const values = profileToValues(profile, { brandName: clientName, website: clientWebsite });
  const completion = computeCompletion(values);
  const pendingSuggestions = Object.keys(profileSuggestions(profile).values).length;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              Brand intelligence
              <OnboardingStatusBadge status={profile?.onboarding_status} />
            </CardTitle>
            <CardDescription>
              Structured brand profile used by every future AI content feature.
              {profile?.website_analyzed_at
                ? ` Website analyzed ${formatDateTime(profile.website_analyzed_at)}.`
                : " Website not analyzed yet."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {pendingSuggestions > 0 ? (
              <Badge variant="secondary">{pendingSuggestions} to review</Badge>
            ) : null}
            <Button asChild>
              <Link to="/clients/$clientId/brand" params={{ clientId }}>
                {profile?.onboarding_status === "not_started" || !profile
                  ? "Start brand onboarding"
                  : "Open brand setup"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <CompletionMeter percent={completion.percent} missing={completion.missing} />
        )}
      </CardContent>
    </Card>
  );
}
