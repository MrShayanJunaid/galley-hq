import { createFileRoute, redirect } from "@tanstack/react-router";

/** Alias kept so `/login` links always land on the GalleyHQ sign-in page. */
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/auth", replace: true });
  },
});
