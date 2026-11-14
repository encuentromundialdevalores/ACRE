"use client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function RevokeButton({ id }: { id: string }) {
  const router = useRouter(); const toast = useToast();
  return <button className="btn-danger px-2.5 py-1" onClick={async () => {
    if (!confirm("¿Revocar esta invitación? El enlace dejará de funcionar de inmediato.")) return;
    const res = await fetch(`/api/invitaciones/${id}`, { method: "DELETE" });
    if (res.ok) { toast.push("Invitación revocada", "success"); router.refresh(); } else toast.push("No se pudo revocar", "error");
  }}>Revocar</button>;
}
