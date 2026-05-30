import type { Metadata } from "next";

import { DashboardPage } from "./_components/DashboardPage";

export const metadata: Metadata = {
  title: "Dashboard | Invoice Ledger",
  description: "Invoice Ledger dashboard.",
};

export default function Page() {
  return <DashboardPage />;
}
