import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CompletionMeter, OnboardingStatusBadge, formatDateTime } from "@/components/brand/brand-status";
import { BrandReferenceManager } from "@/components/brand/BrandReferenceManager";
import { BrandVisualProfile } from "@/components/brand/BrandVisualProfile";
import { ReferenceDesignLanguage } from "@/components/brand/ReferenceDesignLanguage";
import { SuggestionReview } from "@/components/brand/SuggestionReview";
import { WebsiteAnalysisPanel, type AnalysisPhase } from "@/components/brand/WebsiteAnalysisPanel";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBrandAnalysisRuns, useBrandProfile } from "@/hooks/use-brand-profile";
import { analyzeClientWebsite } from "@/lib/api/brand-intelligence.functions";
import {
  applySuggestionValues,
  brandProfileKeys,
  isValidWebsiteUrl,
  profileSuggestions,
  profileToValues,
  saveBrandProfile,
  type BrandProfile,
} from "@/lib/api/brand-profile";
import {
  BRAND_SECTIONS,
  VOICE_FIELDS,
  computeCompletion,
  type BrandFieldValues,
  type BrandSuggestions,
} from "@/lib/brand/schema";

type SaveState = "idle" | "saving" | "saved" | "error";

export function BrandOnboarding({
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
  const { data: runs } = useBrandAnalysisRuns(clientId);
  const { data: referenceList } = useBrandReferences(clientId);
  const referenceCount = (referenceList ?? []).length;
  const analyze = useServerFn(analyzeClientWebsite);


  const [values, setValues] = useState<BrandFieldValues>(() => profileToValues(null));
  const [suggestions, setSuggestions] = useState<BrandSuggestions>({ values: {} });
  const [editedKeys, setEditedKeys] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (isLoading || hydrated.current) return;
    hydrated.current = true;
    setValues(profileToValues(profile, { brandName: clientName, website: clientWebsite }));
    setSuggestions(profileSuggestions(profile));
    if (profile?.website_analysis_error) setAnalysisError(profile.website_analysis_error);
  }, [isLoading, profile, clientName, clientWebsite]);

  const sources = useMemo(
    () => ((profile?.field_sources ?? {}) as Record<string, string>),
    [profile?.field_sources],
  );
  const completion = useMemo(() => computeCompletion(values), [values]);

  const persist = useCallback(
    async (args: {
      nextValues: BrandFieldValues;
      userEditedKeys?: string[];
      aiAcceptedKeys?: string[];
      nextSuggestions?: BrandSuggestions | null;
    }) => {
      if (!workspaceId) throw new Error("Workspace not ready");
      const saved = await saveBrandProfile({
        clientId,
        workspaceId,
        values: args.nextValues,
        userEditedKeys: args.userEditedKeys ?? [],
        aiAcceptedKeys: args.aiAcceptedKeys ?? [],
        ...(args.nextSuggestions !== undefined ? { suggestions: args.nextSuggestions } : {}),
      });
      queryClient.setQueryData(brandProfileKeys.detail(clientId), saved);
      void queryClient.invalidateQueries({ queryKey: brandProfileKeys.overview(workspaceId) });
      return saved;

    },
    [clientId, workspaceId, queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: persist,
    onMutate: () => setSaveState("saving"),
    onSuccess: () => {
      setSaveState("saved");
      setEditedKeys([]);
    },
    onError: (error: Error) => {
      setSaveState("error");
      toast.error(error.message || "Couldn't save the brand profile");
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (websiteUrl: string) => {
      setPhase("fetching");
      setAnalysisError(null);
      const result = await analyze({ data: { clientId, websiteUrl } });
      return result;
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: brandProfileKeys.runs(clientId) });
      if (!result.ok) {
        setPhase("failed");
        setAnalysisError(result.message);
        toast.error(result.message);
        return;
      }
      setPhase("completed");
      setSuggestions({
        values: result.suggestions,
        generatedAt: result.generatedAt,
        model: result.model,
        sourceUrl: result.websiteUrl,
      });
      void queryClient.invalidateQueries({ queryKey: brandProfileKeys.detail(clientId) });
      const count = Object.keys(result.suggestions).length;
      toast.success(
        count > 0
          ? `${count} brand suggestion${count === 1 ? "" : "s"} ready for review`
          : "Analysis finished, but the website had little usable brand information",
      );
    },
    onError: (error: Error) => {
      setPhase("failed");
      const message = error.message || "Website analysis failed. Please retry.";
      setAnalysisError(message);
      toast.error(message);
    },
  });

  // Show the extraction phase once the fetch stage has had time to complete.
  useEffect(() => {
    if (phase !== "fetching") return;
    const timer = setTimeout(() => setPhase("extracting"), 6000);
    return () => clearTimeout(timer);
  }, [phase]);

  // Debounced autosave so the user can leave and return without losing work.
  useEffect(() => {
    if (disabled || !workspaceId || editedKeys.length === 0) return;
    const timer = setTimeout(() => {
      saveMutation.mutate({ nextValues: values, userEditedKeys: editedKeys });
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, editedKeys, disabled, workspaceId]);

  function setField(key: string, value: string) {
    setSaveState("idle");
    setEditedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setValues((prev) =>
      key.startsWith("voice.")
        ? { ...prev, voice: { ...prev.voice, [key.slice(6)]: value } }
        : ({ ...prev, [key]: value } as BrandFieldValues),
    );
  }

  function handleAnalyze() {
    const url = values.website_url.trim();
    if (!isValidWebsiteUrl(url)) {
      setWebsiteError("Enter a valid website URL, for example northwind.com");
      setAnalysisError("Enter a valid website URL, for example northwind.com");
      return;
    }
    setWebsiteError(null);
    if (analyzeMutation.isPending) return;
    analyzeMutation.mutate(url);
  }

  function acceptKeys(keys: string[]) {
    const nextValues = applySuggestionValues(values, suggestions.values, keys);
    const remaining = { ...suggestions.values };
    for (const key of keys) delete remaining[key];
    const nextSuggestions: BrandSuggestions = { ...suggestions, values: remaining };
    setValues(nextValues);
    setSuggestions(nextSuggestions);
    saveMutation.mutate({
      nextValues,
      aiAcceptedKeys: keys,
      userEditedKeys: editedKeys,
      nextSuggestions,
    });
  }

  function rejectKeys(keys: string[]) {
    const remaining = { ...suggestions.values };
    for (const key of keys) delete remaining[key];
    const nextSuggestions: BrandSuggestions = { ...suggestions, values: remaining };
    setSuggestions(nextSuggestions);
    saveMutation.mutate({ nextValues: values, userEditedKeys: editedKeys, nextSuggestions });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                Brand onboarding
                <OnboardingStatusBadge status={profile?.onboarding_status} />
              </CardTitle>
              <CardDescription>
                This profile is the single source of truth for every future AI content feature.
                {profile?.updated_at ? ` Last saved ${formatDateTime(profile.updated_at)}.` : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <SaveIndicator state={saveState} pendingCount={editedKeys.length} />
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate({ nextValues: values, userEditedKeys: editedKeys })}
                disabled={disabled || !workspaceId || saveMutation.isPending}
              >
                <Save className="size-4" />
                Save &amp; continue
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CompletionMeter percent={completion.percent} missing={completion.missing} />
        </CardContent>
      </Card>

      <WebsiteAnalysisPanel
        websiteUrl={values.website_url}
        onWebsiteUrlChange={(value) => setField("website_url", value)}
        onAnalyze={handleAnalyze}
        phase={analyzeMutation.isPending ? phase : phase === "failed" ? "failed" : phase}
        error={websiteError ?? analysisError}
        profile={profile as BrandProfile | null}
        runs={runs ?? []}
        disabled={disabled || !workspaceId}
      />

      <SuggestionReview
        values={values}
        suggestions={suggestions.values}
        sources={sources}
        generatedAt={suggestions.generatedAt}
        sourceUrl={suggestions.sourceUrl}
        onAccept={(key) => acceptKeys([key])}
        onReject={(key) => rejectKeys([key])}
        onAcceptAll={() => acceptKeys(Object.keys(suggestions.values))}
        onDiscardAll={() => rejectKeys(Object.keys(suggestions.values))}
        busy={disabled || saveMutation.isPending}
      />

      <Tabs defaultValue="basics">
        <TabsList>
          {BRAND_SECTIONS.map((section) => (
            <TabsTrigger key={section.id} value={section.id}>
              {section.title}
            </TabsTrigger>
          ))}
          <TabsTrigger value="voice">Brand voice</TabsTrigger>
          <TabsTrigger value="visual">Visual identity</TabsTrigger>

        </TabsList>

        {BRAND_SECTIONS.map((section) => (
          <TabsContent key={section.id} value={section.id}>
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {section.fields.map((field) => (
                  <div
                    key={field.key}
                    className={field.multiline ? "space-y-2 md:col-span-1" : "space-y-2"}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`brand-${field.key}`}>{field.label}</Label>
                      <SourceBadge source={sources[field.key]} />
                    </div>
                    {field.multiline ? (
                      <Textarea
                        id={`brand-${field.key}`}
                        rows={field.rows ?? 3}
                        value={values[field.key]}
                        placeholder={field.placeholder}
                        onChange={(event) => setField(field.key, event.target.value)}
                        disabled={disabled}
                      />
                    ) : (
                      <Input
                        id={`brand-${field.key}`}
                        value={values[field.key]}
                        placeholder={field.placeholder}
                        onChange={(event) => setField(field.key, event.target.value)}
                        disabled={disabled}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="voice">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Brand voice configuration</CardTitle>
              <CardDescription>
                Structured voice rules that future AI content generation reads directly.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {VOICE_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`voice-${field.key}`}>{field.label}</Label>
                    <SourceBadge source={sources[`voice.${field.key}`]} />
                  </div>
                  {field.multiline ? (
                    <Textarea
                      id={`voice-${field.key}`}
                      rows={3}
                      value={values.voice[field.key]}
                      placeholder={field.placeholder}
                      onChange={(event) => setField(`voice.${field.key}`, event.target.value)}
                      disabled={disabled}
                    />
                  ) : (
                    <Input
                      id={`voice-${field.key}`}
                      value={values.voice[field.key]}
                      placeholder={field.placeholder}
                      onChange={(event) => setField(`voice.${field.key}`, event.target.value)}
                      disabled={disabled}
                      list={field.options ? `voice-options-${field.key}` : undefined}
                    />
                  )}
                  {field.options ? (
                    <datalist id={`voice-options-${field.key}`}>
                      {field.options.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visual" className="space-y-6">
          <BrandVisualProfile
            clientId={clientId}
            workspaceId={workspaceId}
            profile={profile as BrandProfile | null}
            disabled={disabled}
          />
          <BrandReferenceManager
            clientId={clientId}
            workspaceId={workspaceId}
            disabled={disabled}
          />
          <ReferenceDesignLanguage
            clientId={clientId}
            profileRow={profile as unknown as Record<string, unknown> | null}
            referenceCount={referenceCount}
            disabled={disabled}
          />

        </TabsContent>
      </Tabs>

    </div>
  );
}

function SourceBadge({ source }: { source: string | undefined }) {
  if (!source) return null;
  return (
    <Badge variant={source === "ai" ? "secondary" : "outline"} className="font-normal">
      {source === "ai" ? "AI-extracted" : "You"}
    </Badge>
  );
}

function SaveIndicator({ state, pendingCount }: { state: SaveState; pendingCount: number }) {
  if (state === "saving") {
    return (
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4" />
        All changes saved
      </span>
    );
  }
  if (state === "error") {
    return <span className="text-sm text-destructive">Save failed — retry</span>;
  }
  return (
    <span className="text-sm text-muted-foreground">
      {pendingCount > 0 ? "Unsaved changes" : "Up to date"}
    </span>
  );
}
