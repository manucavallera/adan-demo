import type { Metadata, Viewport } from "next";
import { Anton, Epilogue } from "next/font/google";
import "./globals.css";
import { store } from "@/lib/config";

const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
const epilogue = Epilogue({ variable: "--font-epilogue", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${store.name} | ${store.tagline}`,
  description: "Ropa de hombre formal y urbana en Viale, Entre Ríos. Envíos a todo el país y 3 cuotas sin interés.",
  icons: { icon: "/icons/favicon-48.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1ece6" },
    { media: "(prefers-color-scheme: dark)", color: "#14110f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className={`${anton.variable} ${epilogue.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
