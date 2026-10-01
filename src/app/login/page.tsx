import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listUsers } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — In-Que",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "super_admin" ? "/clubs" : `/clubs/${user.clubIds[0] ?? ""}`);

  const needsSetup = (await listUsers()).length === 0;
  return <LoginForm needsSetup={needsSetup} />;
}
