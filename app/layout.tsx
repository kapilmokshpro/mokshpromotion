import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moksh Promotion - Strategic Media. Lasting Impact.",
  description: "Empowering brands through innovative OOH campaigns and powerful media solutions across India.",
  icons: {
    icon: "/images/mfavicon.png",
    shortcut: "/images/mfavicon.png",
    apple: "/images/mfavicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
