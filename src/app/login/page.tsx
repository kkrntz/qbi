import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listUsers } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — Quebi",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const needsSetup = (await listUsers()).length === 0;
  return <LoginForm needsSetup={needsSetup} />;
}
