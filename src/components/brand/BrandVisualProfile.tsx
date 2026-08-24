import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Palette, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CompletionMeter } from "@/components/brand/brand-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brandProfileKeys, type BrandProfile } from "@/lib/api/brand-profile";
import { saveVisualProfile } from "@/lib/api/brand-visual";
import {
  VISUAL_FIELDS,
  toVisualConfig,
  visualCompletion,
  type BrandVisualConfig,
} from "@/lib/brand/visual-schema";

/**
 * Visual half of brand intelligence. The creative prompt engine reads these
 * fields directly, so they are deliberately concrete and free-text.
 */
export function BrandVisualProfile({
  clientId,
  workspaceId,
  profile,
  disabled,
}: {
  clientId: string;
  workspaceId: string | undefined;
  profile: BrandProfile | null | undefined;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<BrandVisualConfig>(() => toVisualConfig(profile?.visual_config));
  const [dirty, setDirty] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || !profile) return;
    hydrated.current = true;
    setValues(toVisualConfig(profile.visual_config));
  }, [profile]);

  const completion = visualCompletion(values);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Workspace not ready");
      return saveVisualProfile({ clientId, workspaceId, visual: values });
    },
    onSuccess: (saved) => {
      setDirty(false);
      queryClient.setQueryData(brandProfileKeys.detail(clientId), saved);
      toast.success("Visual brand profile saved");
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't save the visual profile"),
  });

  function setField(key: keyof BrandVisualConfig, value: string) {
    setDirty(true);
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="size-4" />
              Visual brand profile
              {completion.isComplete ? (
                <Badge variant="secondary" className="gap-1">
                  <Check className="size-3" />
                  Ready for creatives
                </Badge>
              ) : (
                <Badge variant="outline">Incomplete</Badge>
              )}
            </CardTitle>
            <CardDescription>
              How this brand should look. Creative generation reads these rules for every visual, so
              be specific — vague input is what produces generic AI imagery.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={disabled || !workspaceId || saveMutation.isPending || !dirty}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save visual profile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <CompletionMeter percent={completion.percent} missing={completion.missing} />
        <div className="grid gap-4 md:grid-cols-2">
          {VISUAL_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`visual-${field.key}`}>{field.label}</Label>
              <Textarea
                id={`visual-${field.key}`}
                rows={3}
                value={values[field.key]}
                placeholder={field.placeholder}
                onChange={(event) => setField(field.key, event.target.value)}
                disabled={disabled}
              />
              {field.hint ? (
                <p className="text-xs text-muted-foreground">{field.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
