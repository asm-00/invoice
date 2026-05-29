import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthShell } from "../_components/AuthShell";

export const metadata: Metadata = {
  title: "Set New Password | Invoice Ledger",
  description: "Set a new Invoice Ledger password.",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="New password"
      title="Set a new password"
      description="Password reset needs an email provider before it can verify codes."
      footer={
        <>
          Back to{" "}
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
