import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roof Flow",
  description: "Run weekly execution with clarity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("roofflow-theme");if(t==="dawn"||t==="slate"||t==="onyx")document.documentElement.setAttribute("data-theme",t);else document.documentElement.setAttribute("data-theme","slate");})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}
