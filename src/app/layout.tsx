import type { Metadata, Viewport } from "next";
import { Anton, Epilogue } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { Footer } from "@/components/footer";
import { BotDemo } from "@/components/bot-demo";
import { store } from "@/lib/config";

const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
const epilogue = Epilogue({ variable: "--font-epilogue", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${store.name} | ${store.tagline}`,
  description: "Ropa de hombre formal y urbana en Viale, Entre Ríos. Envíos a todo el país y 3 cuotas sin interés.",
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
      <body className={`${anton.variable} ${epilogue.variable} font-sans antialiased`}>
        <CartProvider>
          <Header />
          {children}
          <Footer />
          <CartDrawer />
          <BotDemo />
        </CartProvider>
      </body>
    </html>
  );
}
