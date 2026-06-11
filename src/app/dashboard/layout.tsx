import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GridIntel",
  description:
    "Advanced transmission line voltage regulation analyzer with STATCOM simulation, OLTC control, transformer thermal analysis, and AI-powered grid optimization.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
