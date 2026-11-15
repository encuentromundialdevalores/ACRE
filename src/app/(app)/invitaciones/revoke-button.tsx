"use client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

export function RevokeButton({ id }: { id: string }) {
  const router = useRouter(); const toast = useToast(); const confirm = useConfirm();
  return <button className="btn-danger px-4 py-2" onClick={async () => {
    if (!(await confirm({ title: "¿Revocar este enlace?", message: "Quien lo tenga dejará de ver el expediente de inmediato. Esta acción no se puede deshacer.", confirmLabel: "Revocar enlace", tone: "danger" }))) return;
    const res = await fetch(`/api/invitaciones/${id}`, { method: "DELETE" });
    if (res.ok) { toast.push("Enlace revocado", "success"); router.refresh(); } else toast.push("No se pudo revocar", "error");
  }}>Revocar enlace</button>;
}
