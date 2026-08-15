import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client, ClientInput } from "@/lib/api/clients";

type ClientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | undefined;
  isSubmitting?: boolean;
  onSubmit: (values: ClientInput) => void;
};

type FormState = {
  name: string;
  company_name: string;
  email: string;
  website: string;
  notes: string;
  status: string;
};

const emptyState: FormState = {
  name: "",
  company_name: "",
  email: "",
  website: "",
  notes: "",
  status: "active",
};

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  isSubmitting,
  onSubmit,
}: ClientFormDialogProps) {
  const isEdit = Boolean(client);
  const [values, setValues] = useState<FormState>(emptyState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setValues(
      client
        ? {
            name: client.name,
            company_name: client.company_name,
            email: client.email ?? "",
            website: client.website ?? "",
            notes: client.notes ?? "",
            status: client.status,
          }
        : emptyState,
    );
  }, [open, client]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!values.name.trim()) nextErrors.name = "Client name is required.";
    if (!values.company_name.trim()) {
      nextErrors.company_name = "Company / brand name is required.";
    }
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: values.name,
      company_name: values.company_name,
      email: values.email,
      website: values.website,
      notes: values.notes,
      status: values.status,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit client" : "Add client"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update this client's details."
                : "Add a client to your workspace to start organizing their brand."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">
                Client name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client-name"
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="Jane Cooper"
              />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-company">
                Company / brand name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client-company"
                value={values.company_name}
                onChange={(event) => set("company_name", event.target.value)}
                placeholder="Northwind Coffee"
              />
              {errors.company_name ? (
                <p className="text-xs text-destructive">{errors.company_name}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={values.email}
                  onChange={(event) => set("email", event.target.value)}
                  placeholder="jane@northwind.com"
                />
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-website">Website</Label>
                <Input
                  id="client-website"
                  value={values.website}
                  onChange={(event) => set("website", event.target.value)}
                  placeholder="northwind.com"
                />
              </div>
            </div>

            {isEdit ? (
              <div className="space-y-2">
                <Label htmlFor="client-status">Status</Label>
                <Select value={values.status} onValueChange={(value) => set("status", value)}>
                  <SelectTrigger id="client-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="client-notes">Notes</Label>
              <Textarea
                id="client-notes"
                value={values.notes}
                rows={3}
                onChange={(event) => set("notes", event.target.value)}
                placeholder="Anything the team should know about this client."
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save changes"
                  : "Create client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
