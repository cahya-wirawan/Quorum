import type { Metadata } from "next";
import "../styles/tokens.css";

export const metadata: Metadata = {
  title: "Quorum — Autonomous Code Review Pipeline",
  description: "An autonomous code review pipeline that only speaks when it can prove it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
