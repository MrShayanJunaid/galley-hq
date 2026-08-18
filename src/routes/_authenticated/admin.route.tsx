import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { checkAdminAccess } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { isAdmin } = await checkAdminAccess();
    if (!isAdmin) throw redirect({ to: "/dashboard" });
    return { isAdmin };
  },
  component: () => <Outlet />,
});
