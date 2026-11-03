import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/lib/config";
import { getShop } from "@/lib/shop";
import { LegalPage, contactLine, sellerLine } from "@/components/legal";

export const metadata: Metadata = { title: `Términos y condiciones | ${store.name}` };

export default async function TermsPage() {
  const { settings: s } = await getShop();
  return (
    <LegalPage title="Términos y condiciones">
      <p>
        Estas condiciones rigen las compras en esta web. Quien vende es <strong>{sellerLine(s)}</strong>.
        {contactLine(s) && <> Contacto: {contactLine(s)}.</>}
      </p>

      <h2>Precios y stock</h2>
      <p>
        Los precios están en pesos argentinos e incluyen IVA. Pueden cambiar sin aviso, pero se respeta el precio del
        momento en que hacés el pedido. Las prendas se reservan al confirmar el pedido y se entregan según el stock
        disponible. Si algo no está disponible, te avisamos y te devolvemos lo que hayas pagado.
      </p>

      <h2>Pagos</h2>
      <p>
        Podés pagar con Mercado Pago, por transferencia bancaria o en efectivo al retirar en el local. Los pagos con
        Mercado Pago los procesa Mercado Pago; nosotros no vemos ni guardamos los datos de tu tarjeta. Un pedido sin
        pagar puede cancelarse a las 48 horas y las prendas vuelven a estar a la venta.
      </p>

      <h2>Envíos y retiro</h2>
      <p>
        Hacemos envíos a todo el país. El costo y el plazo se informan antes de confirmar el pedido. También podés
        retirar sin costo en el local{s.address ? ` (${[s.address, s.city].filter(Boolean).join(", ")})` : ""}.
      </p>

      <h2>Cambios</h2>
      <p>
        Tenés 30 días desde que recibís la compra para cambiar talle o prenda. La prenda tiene que estar sin uso, con
        etiqueta y en su estado original. Escribinos por WhatsApp para coordinarlo.
      </p>

      <h2>Arrepentimiento de compra</h2>
      <p>
        Por ser una compra a distancia, podés arrepentirte dentro de los 10 días corridos desde que recibís el producto,
        sin dar motivos y sin costo (artículo 34 de la Ley 24.240). Pedilo desde el{" "}
        <Link href="/arrepentimiento" className="underline">botón de arrepentimiento</Link>. Te damos un código de
        trámite, coordinamos la devolución de la prenda y te reintegramos el total por el mismo medio de pago. El envío
        de la devolución corre por nuestra cuenta.
      </p>

      <h2>Garantía</h2>
      <p>
        Si una prenda llega con una falla de fabricación, la cambiamos o te devolvemos el dinero, según la garantía legal
        de la Ley 24.240.
      </p>

      <h2>Reclamos</h2>
      <p>
        Ante cualquier problema, escribinos primero y lo resolvemos. También podés hacer un reclamo ante{" "}
        <a
          href="https://www.argentina.gob.ar/servicio/iniciar-un-reclamo-ante-defensa-del-consumidor"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Defensa de las y los Consumidores
        </a>
        .
      </p>
    </LegalPage>
  );
}
