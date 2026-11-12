import type { Metadata } from "next";

// El panel se puede instalar en el celular del dueño como una app ("Agregar a pantalla principal").
// El manifiesto vive solo acá, así la web de la tienda no ofrece instalar el panel a los clientes.
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "ADAN Panel", statusBarStyle: "default" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
