import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthShell } from "../_components/AuthShell";

export const metadata: Metadata = {
  title: "Reset Password | Invoice Ledger",
  description: "Request a password reset for Invoice Ledger.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Password reset"
      title="Password reset"
      description="Password reset needs an email provider before it can send links."
      footer={
        <>
          Return to{" "}
          <Link className="underline underline-offset-4" href="/login">
            login
          </Link>
        </>
      }
    >
      <Button asChild className="w-full">
        <Link href="/login">Back to login</Link>
      </Button>
    </AuthShell>
  );
}
