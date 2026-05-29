"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthForm } from "../_components/AuthForm";
import { AuthShell } from "../_components/AuthShell";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email") ?? undefined;

  return (
    <AuthShell
      eyebrow="Open Ledger"
      title="Create your workspace."
      description="Set up the account your team will use for invoice operations."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login">Login</Link>
        </>
      }
    >
      <AuthForm mode="signUp" prefillEmail={prefillEmail} />
    </AuthShell>
  );
}
