import { Check, Compass, Loader2, Save, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSaveCreativeDirection } from "@/hooks/use-creative-direction";
import type { BrandProfile } from "@/lib/api/brand-profile";
import {
  CREATIVE_STYLE_OPTIONS,
  VISUAL_DIRECTION_MODES,
  VISUAL_STYLE_PRESETS,
  emptyCreativeDirection,
  isDirectionConfigured,
  toCreativeDirection,
  type CreativeDirection,
  type VisualDirectionMode,
} from "@/lib/brand/creative-direction";
import { cn } from "@/lib/utils";

/**
 * Layers 2 and 3 of the Brand Voice creative reference system.
 *
 * Layer 2 — where the visual language comes from (references, brand identity
 * only, a predefined style, or a written description).
 * Layer 3 — the creative style/finish, which guides generation without
 * overriding the brand's own identity.
 */
export function CreativeDirectionPanel({
  clientId,
  workspaceId,
  profile,
  referenceCount,
  disabled,
}: {
  clientId: string;
  workspaceId: string | undefined;
  profile: BrandProfile | null | undefined;
  referenceCount: number;
  disabled?: boolean | undefined;
}) {
  const [direction, setDirection] = useState<CreativeDirection>(() =>
    toCreativeDirection((profile as unknown as Record<string, unknown> | null)?.["creative_direction"]),
  );
  const [dirty, setDirty] = useState(false);
  const hydrated = useRef(false);
  const save = useSaveCreativeDirection(clientId, workspaceId);

  useEffect(() => {
    if (hydrated.current || !profile) return;
    hydrated.current = true;
    setDirection(
      toCreativeDirection((profile as unknown as Record<string, unknown>)["creative_direction"]),
    );
  }, [profile]);

  const configured = isDirectionConfigured(direction, referenceCount);

  function update(patch: Partial<CreativeDirection>) {
    setDirty(true);
    setDirection((prev) => ({ ...prev, ...patch }));
  }

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Compass className="size-4" />
              Visual direction &amp; creative style
              {configured ? (
                <Badge variant="secondary" className="gap-1">
                  <Check className="size-3" />
                  Set
                </Badge>
              ) : (
                <Badge variant="outline">Needs a choice</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Decide where the visual language comes from and what kind of creative you want. The
              brand foundation above always wins — this guides the render, it never replaces the
              brand identity.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDirection(emptyCreativeDirection);
                setDirty(true);
              }}
              disabled={disabled || save.isPending}
            >
              Reset
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                save.mutate(direction, {
                  onSuccess: () => {
                    setDirty(false);
                    toast.success("Creative direction saved");
                  },
                  onError: (error: Error) =>
                    toast.error(error.message || "Couldn't save the creative direction"),
                })
              }
              disabled={disabled || !workspaceId || save.isPending || !dirty}
            >
              {save.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save direction
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-7">
        {/* Layer 2 — visual direction source */}
        <section className="space-y-3">
          <div>
            <p className="text-sm font-medium">Where should the visual style come from?</p>
            <p className="text-xs text-muted-foreground">
              {referenceCount > 0
                ? `${referenceCount} reference creative${referenceCount === 1 ? "" : "s"} uploaded for this client.`
                : "No reference creatives uploaded yet — pick one of the alternatives below."}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {VISUAL_DIRECTION_MODES.map((mode) => {
              const active = direction.visualDirectionMode === mode.id;
              const referencesMissing = mode.id === "references" && referenceCount === 0;
              return (
                <button
                  key={mode.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => update({ visualDirectionMode: mode.id as VisualDirectionMode })}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                    disabled && "opacity-60",
                  )}
                  aria-pressed={active}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {mode.label}
                    {active ? <Check className="size-3.5 text-primary" /> : null}
                    {referencesMissing ? (
                      <Badge variant="outline" className="font-normal">
                        none uploaded
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {mode.description}
                  </span>
                </button>
              );
            })}
          </div>

          {direction.visualDirectionMode === "preset" ? (
            <div className="space-y-2 rounded-xl border p-4">
              <p className="text-sm font-medium">Style directions</p>
              <p className="text-xs text-muted-foreground">
                Pick one or two. They are applied on top of the brand's colours, typography and logo.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {VISUAL_STYLE_PRESETS.map((preset) => {
                  const active = direction.stylePresetIds.includes(preset.id);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        update({ stylePresetIds: toggle(direction.stylePresetIds, preset.id) })
                      }
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                      )}
                      aria-pressed={active}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {preset.label}
                        {active ? <Check className="size-3.5 text-primary" /> : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {preset.summary}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {direction.visualDirectionMode === "description" ? (
            <div className="space-y-2 rounded-xl border p-4">
              <Label htmlFor="direction-description">Describe the visual style you want</Label>
              <Textarea
                id="direction-description"
                rows={4}
                value={direction.styleDescription}
                placeholder="e.g. Warm editorial photography on textured paper backgrounds, one hero product per frame, big lowercase headline in the brand sans, terracotta CTA pill in the lower third."
                onChange={(event) => update({ styleDescription: event.target.value })}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Be concrete: composition, lighting, colour roles, typography and what to avoid.
              </p>
            </div>
          ) : null}
        </section>

        {/* Layer 3 — creative style */}
        <section className="space-y-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4" />
              Creative style
            </p>
            <p className="text-xs text-muted-foreground">
              The finish and energy of the creative. Combine up to three — this guides generation
              without overriding the brand identity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CREATIVE_STYLE_OPTIONS.map((style) => {
              const active = direction.creativeStyleIds.includes(style.id);
              return (
                <button
                  key={style.id}
                  type="button"
                  disabled={disabled}
                  title={style.guidance}
                  onClick={() =>
                    update({ creativeStyleIds: toggle(direction.creativeStyleIds, style.id) })
                  }
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted/60",
                  )}
                  aria-pressed={active}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <Label htmlFor="direction-notes">Art-direction notes (optional)</Label>
          <Textarea
            id="direction-notes"
            rows={3}
            value={direction.notes}
            placeholder="Anything else the designer should know — recurring do's and don'ts for this client."
            onChange={(event) => update({ notes: event.target.value })}
            disabled={disabled}
          />
        </section>
      </CardContent>
    </Card>
  );
}
