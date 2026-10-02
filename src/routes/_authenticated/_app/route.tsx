import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { data: profile, isSuccess } = useProfile();
  const navigate = useNavigate();
  useEffect(() => {
    if (isSuccess && profile && !profile.onboarded) navigate({ to: "/onboarding" });
  }, [isSuccess, profile, navigate]);
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
