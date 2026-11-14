import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";
import { currentDataMode } from "@/lib/connectors";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user} demoMode={currentDataMode() === "DEMO"}>{children}</AppShell>;
}
