import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useBrandProfile } from "@/hooks/use-brand-profile";
import {
  brandProfileKeys,
  isValidWebsiteUrl,
  saveBrandProfile,
  type BrandProfileInput,
} from "@/lib/api/brand-profile";

const emptyState: Required<{ [K in keyof BrandProfileInput]: string }> = {
  brand_name: "",
  website_url: "",
  industry: "",
  description: "",
  target_audience: "",
  brand_positioning: "",
  brand_voice: "",
  tone_preferences: "",
  key_offerings: "",
  brand_notes: "",
};

type FormState = typeof emptyState;

const textAreas: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
  {
    key: "description",
    label: "Brand description",
    placeholder: "What the brand does and what makes it different.",
  },
  {
    key: "target_audience",
    label: "Target audience",
    placeholder: "Who the brand speaks to — demographics, interests, pain points.",
  },
  {
    key: "brand_positioning",
    label: "Brand positioning",
    placeholder: "How the brand is positioned against alternatives.",
  },
  {
    key: "brand_voice",
    label: "Brand voice",
    placeholder: "Confident, warm, expert — plus phrases to use or avoid.",
  },
  {
    key: "tone_preferences",
    label: "Tone preferences",
    placeholder: "Preferred tone per channel, emoji and formatting rules.",
  },
  {
    key: "key_offerings",
    label: "Key services / products",
    placeholder: "Core offers to feature in content.",
  },
  {
    key: "brand_notes",
    label: "Additional brand notes",
    placeholder: "Anything else the team should know.",
  },
];

export function BrandProfileForm({
  clientId,
  workspaceId,
  clientName,
  clientWebsite,
  disabled,
}: {
  clientId: string;
  workspaceId: string | undefined;
  clientName: string;
  clientWebsite: string | null;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useBrandProfile(clientId);
  const [values, setValues] = useState<FormState>(emptyState);
  const [websiteError, setWebsiteError] = useState<string | null>(null);

  useEffect(() => {
    setValues({
      brand_name: profile?.brand_name ?? clientName ?? "",
      website_url: profile?.website_url ?? clientWebsite ?? "",
      industry: profile?.industry ?? "",
      description: profile?.description ?? "",
      target_audience: profile?.target_audience ?? "",
      brand_positioning: profile?.brand_positioning ?? "",
      brand_voice: profile?.brand_voice ?? "",
      tone_preferences: profile?.tone_preferences ?? "",
      key_offerings: profile?.key_offerings ?? "",
      brand_notes: profile?.brand_notes ?? "",
    });
  }, [profile, clientName, clientWebsite]);

  const mutation = useMutation({
    mutationFn: () => saveBrandProfile(clientId, workspaceId!, values),
    onSuccess: (saved) => {
      toast.success("Brand profile saved");
      queryClient.setQueryData(brandProfileKeys.detail(clientId), saved);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function set<K extends keyof FormState>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (values.website_url.trim() && !isValidWebsiteUrl(values.website_url)) {
      setWebsiteError("Enter a valid website URL, e.g. northwind.com");
      return;
    }
    setWebsiteError(null);
    mutation.mutate();
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Brand profile</CardTitle>
        <CardDescription>
          Structured brand context for this client. Future content modules will read from here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Brand name</Label>
                <Input
                  id="brand-name"
                  value={values.brand_name}
                  onChange={(event) => set("brand_name", event.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-website">Website URL</Label>
                <Input
                  id="brand-website"
                  value={values.website_url}
                  onChange={(event) => set("website_url", event.target.value)}
                  placeholder="northwind.com"
                  disabled={disabled}
                />
                {websiteError ? (
                  <p className="text-xs text-destructive">{websiteError}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-industry">Industry</Label>
                <Input
                  id="brand-industry"
                  value={values.industry}
                  onChange={(event) => set("industry", event.target.value)}
                  placeholder="Specialty coffee"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {textAreas.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`brand-${field.key}`}>{field.label}</Label>
                  <Textarea
                    id={`brand-${field.key}`}
                    rows={3}
                    value={values[field.key]}
                    onChange={(event) => set(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={disabled || !workspaceId || mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save brand profile"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
