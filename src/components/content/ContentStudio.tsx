import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ContentHistory } from "@/components/content/ContentHistory";
import { CreativePanel } from "@/components/content/CreativePanel";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useBrandProfile } from "@/hooks/use-brand-profile";
import { useSaveContent } from "@/hooks/use-content";
import type { ContentItem } from "@/lib/api/content-items";
import {
  generateContentCreativePrompt,
  generateContentDraft,
  generateContentIdeas,
} from "@/lib/api/content-studio.functions";
import {
  CONTENT_STATUSES,
  CONTENT_TYPES,
  CREATIVE_PROMPT_FIELDS,
  DEFAULT_CONTENT_CONFIG,
  EMPTY_CREATIVE_PROMPT,
  OBJECTIVES,
  PLATFORMS,
  hasCreativePrompt,
  labelFor,
  type ContentConfig,
  type ContentDraft,
  type ContentIdea,
  type ContentStatus,
  type CreativePrompt,
} from "@/lib/content/schema";

const EMPTY_DRAFT: ContentDraft = { hook: "", body: "", cta: "", hashtags: [] };

type StudioProps = {
  clientId: string;
  workspaceId: string | undefined;
  clientName: string;
  brandOnboardingStatus?: string | undefined;
};

type Busy = null | "ideas" | "content" | "creative" | "hook" | "body" | "cta" | "hashtags";

export function ContentStudio({
  clientId,
  workspaceId,
  clientName,
  brandOnboardingStatus,
}: StudioProps) {
  const ideasFn = useServerFn(generateContentIdeas);
  const draftFn = useServerFn(generateContentDraft);
  const creativeFn = useServerFn(generateContentCreativePrompt);
  const { data: brandProfile } = useBrandProfile(clientId);
  const saveMutation = useSaveContent(clientId);

  const [config, setConfig] = useState<ContentConfig>(DEFAULT_CONTENT_CONFIG);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContentDraft>(EMPTY_DRAFT);
  const [creative, setCreative] = useState<CreativePrompt>(EMPTY_CREATIVE_PROMPT);
  const [instructions, setInstructions] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [lastAction, setLastAction] = useState<null | (() => void)>(null);

  const selectedIdea = useMemo(
    () => ideas.find((idea) => idea.id === selectedIdeaId) ?? null,
    [ideas, selectedIdeaId],
  );
  const hasDraft = Boolean(draft.hook.trim() || draft.body.trim());
  const brandReady = (brandOnboardingStatus ?? "not_started") !== "not_started";

  function reportFailure(result: { message: string; retryable: boolean }, retry: () => void) {
    setError(result);
    setLastAction(() => retry);
    toast.error(result.message);
  }

  async function handleGenerateIdeas(append: boolean) {
    setBusy("ideas");
    setError(null);
    try {
      const result = await ideasFn({
        data: {
          clientId,
          config,
          count: 5,
          avoidTitles: append ? ideas.map((idea) => idea.title) : [],
        },
      });
      if (!result.ok) {
        reportFailure(result, () => void handleGenerateIdeas(append));
        return;
      }
      setIdeas((previous) => (append ? [...previous, ...result.ideas] : result.ideas));
      if (!append) {
        setSelectedIdeaId(null);
        setDraft(EMPTY_DRAFT);
        setCreative(EMPTY_CREATIVE_PROMPT);
        setRecordId(null);
      }
      toast.success(`${result.ideas.length} ideas generated`);
    } catch (thrown) {
      reportFailure(
        { message: (thrown as Error)?.message ?? "Generation failed.", retryable: true },
        () => void handleGenerateIdeas(append),
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateContent(section: Busy = "content") {
    if (!selectedIdea) return;
    setBusy(section);
    setError(null);
    const isSection = section !== "content";
    try {
      const result = await draftFn({
        data: {
          clientId,
          config,
          idea: selectedIdea,
          instructions,
          section: isSection ? (section as "hook" | "body" | "cta" | "hashtags") : null,
          current: isSection ? draft : null,
        },
      });
      if (!result.ok) {
        reportFailure(result, () => void handleGenerateContent(section));
        return;
      }
      if (isSection) {
        const key = section as "hook" | "body" | "cta" | "hashtags";
        setDraft((previous) => ({ ...previous, [key]: result.draft[key] }));
        toast.success(`Regenerated ${key}`);
      } else {
        setDraft(result.draft);
        if (!title.trim()) setTitle(selectedIdea.title);
        toast.success("Content generated");
      }
    } catch (thrown) {
      reportFailure(
        { message: (thrown as Error)?.message ?? "Generation failed.", retryable: true },
        () => void handleGenerateContent(section),
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateCreative() {
    if (!selectedIdea || !hasDraft) return;
    setBusy("creative");
    setError(null);
    try {
      const result = await creativeFn({ data: { clientId, config, idea: selectedIdea, draft } });
      if (!result.ok) {
        reportFailure(result, () => void handleGenerateCreative());
        return;
      }
      setCreative(result.creative);
      if (status === "draft") setStatus("ready_for_creative");
      toast.success("Creative direction generated");
    } catch (thrown) {
      reportFailure(
        { message: (thrown as Error)?.message ?? "Generation failed.", retryable: true },
        () => void handleGenerateCreative(),
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleSave(nextStatus?: ContentStatus) {
    if (!workspaceId) return;
    const effectiveStatus = nextStatus ?? status;
    try {
      const saved = await saveMutation.mutateAsync({
        id: recordId,
        clientId,
        workspaceId,
        config,
        title: title || selectedIdea?.title || "Untitled content",
        status: effectiveStatus,
        draft,
        idea: selectedIdea,
        creative,
        generationMeta: { brandProfileId: brandProfile?.id ?? null, savedAt: new Date().toISOString() },
      });
      setRecordId(saved.id);
      setStatus(effectiveStatus);
      toast.success(recordId ? "Content updated" : "Content saved");
    } catch (thrown) {
      toast.error((thrown as Error)?.message ?? "Couldn't save this content.");
    }
  }

  function loadRecord(item: ContentItem) {
    setConfig({
      platform: item.platform,
      contentType: item.contentType,
      objective: item.objective,
      topic: item.topic,
    });
    setIdeas(item.idea ? [item.idea] : []);
    setSelectedIdeaId(item.idea?.id ?? null);
    setDraft(item.draft);
    setCreative(item.creative);
    setTitle(item.title);
    setStatus(item.status);
    setRecordId(item.id);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startNew() {
    setIdeas([]);
    setSelectedIdeaId(null);
    setDraft(EMPTY_DRAFT);
    setCreative(EMPTY_CREATIVE_PROMPT);
    setTitle("");
    setStatus("draft");
    setRecordId(null);
    setInstructions("");
    setError(null);
  }

  return (
    <div className="space-y-6">
      {!brandReady ? (
        <Alert>
          <Sparkles className="size-4" />
          <AlertTitle>Brand Intelligence not set up yet</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>
              The studio writes from {clientName}&apos;s brand profile. Complete brand onboarding
              first for on-brand results.
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to="/clients/$clientId/brand" params={{ clientId }}>
                Open Brand Intelligence
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{error.message}</span>
            {error.retryable && lastAction ? (
              <Button size="sm" variant="outline" onClick={() => lastAction()}>
                <RefreshCw className="size-4" />
                Retry
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Step 1 — configuration */}
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">1. Content configuration</CardTitle>
              <CardDescription>
                Brand Intelligence is applied automatically. Choose where this is going and why.
              </CardDescription>
            </div>
            {recordId ? (
              <Button variant="ghost" size="sm" onClick={startNew}>
                Start new content
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <ConfigSelect
              label="Platform"
              value={config.platform}
              options={PLATFORMS}
              onChange={(platform) => setConfig((previous) => ({ ...previous, platform }))}
            />
            <ConfigSelect
              label="Content type"
              value={config.contentType}
              options={CONTENT_TYPES}
              onChange={(contentType) => setConfig((previous) => ({ ...previous, contentType }))}
            />
            <ConfigSelect
              label="Objective"
              value={config.objective}
              options={OBJECTIVES}
              onChange={(objective) => setConfig((previous) => ({ ...previous, objective }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="studio-topic">Topic or direction (optional)</Label>
            <Textarea
              id="studio-topic"
              rows={2}
              value={config.topic}
              onChange={(event) => setConfig((previous) => ({ ...previous, topic: event.target.value }))}
              placeholder="e.g. Focus on the new onboarding service for hospitality clients"
            />
          </div>
          <Button onClick={() => void handleGenerateIdeas(false)} disabled={busy !== null}>
            {busy === "ideas" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating ideas…
              </>
            ) : (
              <>
                <Lightbulb className="size-4" />
                Generate ideas
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2 — ideas */}
      {ideas.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">2. Content ideas</CardTitle>
                <CardDescription>
                  Select one to write. You can edit, delete or generate more.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleGenerateIdeas(true)}
                disabled={busy !== null}
              >
                {busy === "ideas" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                More ideas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                selected={idea.id === selectedIdeaId}
                editing={idea.id === editingIdeaId}
                disabled={busy !== null}
                onSelect={() => {
                  setSelectedIdeaId(idea.id);
                  if (!title.trim()) setTitle(idea.title);
                }}
                onToggleEdit={() => setEditingIdeaId(idea.id === editingIdeaId ? null : idea.id)}
                onChange={(next) =>
                  setIdeas((previous) => previous.map((entry) => (entry.id === next.id ? next : entry)))
                }
                onDelete={() => {
                  setIdeas((previous) => previous.filter((entry) => entry.id !== idea.id));
                  if (selectedIdeaId === idea.id) setSelectedIdeaId(null);
                }}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Step 3 — content */}
      {selectedIdea ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">3. Content</CardTitle>
            <CardDescription>
              Written for {labelFor(PLATFORMS, config.platform)} in {clientName}&apos;s brand voice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="studio-instructions">Extra instructions (optional)</Label>
              <Textarea
                id="studio-instructions"
                rows={2}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="e.g. Mention the free consultation, keep it under 100 words"
              />
            </div>

            <Button onClick={() => void handleGenerateContent("content")} disabled={busy !== null}>
              {busy === "content" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Writing content…
                </>
              ) : (
                <>
                  <Wand2 className="size-4" />
                  {hasDraft ? "Regenerate content" : "Generate content"}
                </>
              )}
            </Button>

            {hasDraft ? (
              <div className="space-y-4">
                <Separator />
                <FieldWithRegenerate
                  id="studio-hook"
                  label="Hook"
                  rows={2}
                  value={draft.hook}
                  busy={busy === "hook"}
                  disabled={busy !== null}
                  onChange={(hook) => setDraft((previous) => ({ ...previous, hook }))}
                  onRegenerate={() => void handleGenerateContent("hook")}
                />
                <FieldWithRegenerate
                  id="studio-body"
                  label="Caption"
                  rows={9}
                  value={draft.body}
                  busy={busy === "body"}
                  disabled={busy !== null}
                  onChange={(body) => setDraft((previous) => ({ ...previous, body }))}
                  onRegenerate={() => void handleGenerateContent("body")}
                />
                <FieldWithRegenerate
                  id="studio-cta"
                  label="Call to action"
                  rows={2}
                  value={draft.cta}
                  busy={busy === "cta"}
                  disabled={busy !== null}
                  onChange={(cta) => setDraft((previous) => ({ ...previous, cta }))}
                  onRegenerate={() => void handleGenerateContent("cta")}
                />
                <FieldWithRegenerate
                  id="studio-hashtags"
                  label="Hashtags (comma or space separated)"
                  rows={2}
                  value={draft.hashtags.join(" ")}
                  busy={busy === "hashtags"}
                  disabled={busy !== null}
                  onChange={(value) =>
                    setDraft((previous) => ({
                      ...previous,
                      hashtags: value
                        .split(/[\s,]+/)
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    }))
                  }
                  onRegenerate={() => void handleGenerateContent("hashtags")}
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => void copyPost(draft)}>
                    <Copy className="size-4" />
                    Copy full post
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Step 4 — creative direction */}
      {hasDraft ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">4. Creative direction</CardTitle>
            <CardDescription>
              The structured visual brief that drives image generation in the next step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant={hasCreativePrompt(creative) ? "outline" : "default"}
              onClick={() => void handleGenerateCreative()}
              disabled={busy !== null}
            >
              {busy === "creative" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Building creative brief…
                </>
              ) : (
                <>
                  <ImageIcon className="size-4" />
                  {hasCreativePrompt(creative)
                    ? "Regenerate creative direction"
                    : "Generate creative direction"}
                </>
              )}
            </Button>

            {hasCreativePrompt(creative) ? (
              <div className="grid gap-4 md:grid-cols-2">
                {CREATIVE_PROMPT_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    className={field.key === "prompt" ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}
                  >
                    <Label htmlFor={`creative-${field.key}`}>{field.label}</Label>
                    <Textarea
                      id={`creative-${field.key}`}
                      rows={field.rows}
                      value={creative[field.key]}
                      onChange={(event) =>
                        setCreative((previous) => ({ ...previous, [field.key]: event.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Step 5 — creative visual */}
      {hasDraft ? (
        <CreativePanel
          clientId={clientId}
          contentItemId={recordId}
          platform={config.platform}
          hasCreativeBrief={hasCreativePrompt(creative)}
          saving={saveMutation.isPending}
          onSaveFirst={() => void handleSave()}
        />
      ) : null}

      {/* Step 6 — save */}
      {hasDraft ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">6. Review &amp; save</CardTitle>
            <CardDescription>
              Saved against this client and workspace — brand data stays in the brand profile.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="studio-title">Title</Label>
                <Input
                  id="studio-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Internal title for this content"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studio-status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as ContentStatus)}>
                  <SelectTrigger id="studio-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_STATUSES.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void handleSave()} disabled={saveMutation.isPending || !workspaceId}>
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {recordId ? "Update content" : "Save content"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleSave("ready_for_review")}
                disabled={saveMutation.isPending || !workspaceId}
              >
                <Check className="size-4" />
                Save &amp; mark ready for review
              </Button>
              {recordId ? <Badge variant="secondary">Saved record</Badge> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ContentHistory clientId={clientId} activeId={recordId} onOpen={loadRecord} />
    </div>
  );
}

async function copyPost(draft: ContentDraft) {
  const text = [draft.hook, draft.body, draft.cta, draft.hashtags.join(" ")]
    .filter((part) => part && part.trim())
    .join("\n\n");
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Post copied to clipboard");
  } catch {
    toast.error("Couldn't copy to clipboard");
  }
}

function ConfigSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const id = `studio-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FieldWithRegenerate({
  id,
  label,
  rows,
  value,
  busy,
  disabled,
  onChange,
  onRegenerate,
}: {
  id: string;
  label: string;
  rows: number;
  value: string;
  busy: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={disabled}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Regenerate
        </Button>
      </div>
      <Textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function IdeaCard({
  idea,
  selected,
  editing,
  disabled,
  onSelect,
  onToggleEdit,
  onChange,
  onDelete,
}: {
  idea: ContentIdea;
  selected: boolean;
  editing: boolean;
  disabled: boolean;
  onSelect: () => void;
  onToggleEdit: () => void;
  onChange: (idea: ContentIdea) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      {editing ? (
        <div className="space-y-2">
          <Input value={idea.title} onChange={(event) => onChange({ ...idea, title: event.target.value })} />
          <Textarea
            rows={3}
            value={idea.concept}
            onChange={(event) => onChange({ ...idea, concept: event.target.value })}
          />
          <Input
            value={idea.angle}
            onChange={(event) => onChange({ ...idea, angle: event.target.value })}
            placeholder="Angle"
          />
          <Input
            value={idea.format}
            onChange={(event) => onChange({ ...idea, format: event.target.value })}
            placeholder="Format"
          />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-snug">{idea.title}</p>
            {idea.format ? (
              <Badge variant="outline" className="shrink-0 font-normal">
                {idea.format}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{idea.concept}</p>
          {idea.angle ? (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Angle:</span> {idea.angle}
            </p>
          ) : null}
          {idea.explanation ? (
            <p className="mt-1 text-xs text-muted-foreground">{idea.explanation}</p>
          ) : null}
        </>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" variant={selected ? "default" : "outline"} onClick={onSelect} disabled={disabled}>
          {selected ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
          {selected ? "Selected" : "Use this idea"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggleEdit}>
          <Pencil className="size-4" />
          {editing ? "Done" : "Edit"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
