import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { listUsers } from "@/lib/services/users";
import { PageHero } from "@/components/ui";
import { UserManager } from "@/components/usuarios/user-manager";

export default async function UsersPage() {
  const user = await requireUser();
  if (!can(user, "user.manage")) redirect("/dashboard");
  const rows = await listUsers();
  const n = (r: string) => rows.filter((u) => u.role === r && u.active).length;
  return (
    <div>
      <PageHero title="Usuarios." lead="Crea cuentas para propietarios, compradores y socios. Cambia su rol, restablece su contraseña o desactívalas."
        stats={[{ label: "Socios", value: n("ADMIN"), dot: "bg-ink" }, { label: "Propietarios", value: n("OWNER"), dot: "bg-brand-500" }, { label: "Compradores", value: n("BUYER"), dot: "bg-emerald-500" }, { label: "Desactivadas", value: rows.filter((u) => !u.active).length, dot: "bg-red-500" }]} />
      <UserManager rows={rows} selfId={user.id} />
    </div>
  );
}
