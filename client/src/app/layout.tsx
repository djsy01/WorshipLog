import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServerWakeup from "@/components/ServerWakeup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WorshipLog",
  description: "찬양팀을 위한 콘티 & 예배 기록 서비스",
};

// 페이지 렌더 전에 테마 클래스를 설정해 깜빡임(FOUC) 방지
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (t === 'dark' || (!t && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
  // Fast Refresh 콘솔 로그 억제 (개발 환경)
  if (typeof console !== 'undefined') {
    var _origLog = console.log;
    console.log = function() {
      var msg = arguments[0];
      if (typeof msg === 'string' && msg.indexOf('[Fast Refresh]') === 0) return;
      _origLog.apply(console, arguments);
    };
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <ServerWakeup>{children}</ServerWakeup>
      </body>
    </html>
  );
}
