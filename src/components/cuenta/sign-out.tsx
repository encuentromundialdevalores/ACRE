"use client";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return <button className="btn-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>Cerrar sesión</button>;
}
