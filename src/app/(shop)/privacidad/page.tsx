import type { Metadata } from "next";
import { store } from "@/lib/config";
import { getShop } from "@/lib/shop";
import { LegalPage, contactLine, sellerLine } from "@/components/legal";

export const metadata: Metadata = { title: `Privacidad | ${store.name}` };

export default async function PrivacyPage() {
  const { settings: s } = await getShop();
  return (
    <LegalPage title="Privacidad">
      <p>
        El responsable de tus datos es <strong>{sellerLine(s)}</strong>.
        {contactLine(s) && <> Contacto: {contactLine(s)}.</>}
      </p>

      <h2>Qué datos usamos</h2>
      <p>
        Los que nos das al comprar o al escribirnos: nombre, número de WhatsApp, dirección de envío y lo que pediste.
        Si hablás con nuestro asistente de WhatsApp, también guardamos esa conversación para poder atenderte.
      </p>

      <h2>Para qué</h2>
      <p>
        Solo para preparar y enviar tu pedido, avisarte cómo va y responder tus consultas. No mandamos publicidad sin
        que la pidas.
      </p>

      <h2>Con quién los compartimos</h2>
      <p>
        Con Mercado Pago si pagás por ahí, con la empresa de envíos que lleva tu pedido y con los servicios técnicos
        que hacen funcionar la web y el asistente. No vendemos ni cedemos tus datos a nadie más.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedirnos ver, corregir o borrar tus datos escribiéndonos por WhatsApp{s.email ? ` o a ${s.email}` : ""}.
      </p>
      <p className="text-sm">
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
        gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo
        establecido en el artículo 14, inciso 3 de la Ley N.º 25.326. La Agencia de Acceso a la Información Pública, en
        su carácter de Órgano de Control de la Ley N.º 25.326, tiene la atribución de atender las denuncias y reclamos
        que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia
        de protección de datos personales.
      </p>
    </LegalPage>
  );
}
