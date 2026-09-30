import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "시티트리클럽 주니어 — 팀 나무늘보",
  description:
    "서울환경연합과 함께하는 팀 나무늘보의 시티트리클럽 주니어. 나무를 만나고, 돌보고, 함께 자라요.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
