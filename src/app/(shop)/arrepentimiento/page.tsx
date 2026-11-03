import type { Metadata } from "next";
import { store } from "@/lib/config";
import { LegalPage } from "@/components/legal";
import { WithdrawalForm } from "./form";

export const metadata: Metadata = { title: `Botón de arrepentimiento | ${store.name}` };

export default function WithdrawalPage() {
  return (
    <LegalPage title="Botón de arrepentimiento">
      <p>
        Si compraste online, tenés 10 días corridos desde que recibiste la compra para arrepentirte, sin dar motivos y
        sin costo. Completá el formulario y te damos un código de trámite. Después te escribimos por WhatsApp para
        coordinar la devolución y el reintegro.
      </p>
      <WithdrawalForm />
    </LegalPage>
  );
}
