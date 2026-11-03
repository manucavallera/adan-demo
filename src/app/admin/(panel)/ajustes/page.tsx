import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { revalidateShop } from "@/lib/shop";
import { Field, PageTitle, btnPrimary, input } from "@/components/admin/ui";

const TEXT = ["whatsapp", "address", "city", "hours", "installments", "transferAlias", "transferCbu", "transferHolder", "legalName", "cuit", "email"] as const;
const NUM = ["shippingCost", "freeShippingFrom", "transferDiscount"] as const;

async function save(formData: FormData) {
  "use server";
  await requireAdmin();
  const data: Record<string, string | number> = {};
  for (const k of TEXT) data[k] = String(formData.get(k) ?? "").trim().slice(0, 200);
  for (const k of NUM) data[k] = Math.max(0, Math.round(Number(formData.get(k)) || 0));
  data.whatsapp = String(data.whatsapp).replace(/\D/g, "");
  data.transferDiscount = Math.min(50, Number(data.transferDiscount));
  await prisma.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  revalidateShop();
  revalidatePath("/admin/ajustes");
  redirect("/admin/ajustes?ok=1");
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const s = (await prisma.settings.findUnique({ where: { id: 1 } })) ?? {
    whatsapp: "", address: "", city: "", hours: "", installments: "", shippingCost: 0, freeShippingFrom: 0,
    transferDiscount: 0, transferAlias: "", transferCbu: "", transferHolder: "", legalName: "", cuit: "", email: "",
  };

  return (
    <>
      <PageTitle title="Ajustes" />
      {ok && <p className="mb-4 border border-emerald-600 p-3 text-sm">Guardado. La web y el bot ya usan los datos nuevos.</p>}
      <form action={save} className="grid max-w-3xl gap-10">
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-lg font-semibold">Local y contacto</legend>
          <Field label="WhatsApp de la tienda" htmlFor="whatsapp" hint="Con 549 y característica, sin espacios. Ej: 5493431234567">
            <input id="whatsapp" name="whatsapp" defaultValue={s.whatsapp} inputMode="tel" className={input} />
          </Field>
          <Field label="Horario" htmlFor="hours" hint="Ej: Lunes a sábado de 9 a 13 y de 17 a 21">
            <input id="hours" name="hours" defaultValue={s.hours} className={input} />
          </Field>
          <Field label="Dirección del local" htmlFor="address">
            <input id="address" name="address" defaultValue={s.address} className={input} />
          </Field>
          <Field label="Ciudad" htmlFor="city">
            <input id="city" name="city" defaultValue={s.city} className={input} />
          </Field>
        </fieldset>

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-lg font-semibold">Envíos</legend>
          <Field label="Costo de envío" htmlFor="shippingCost" hint="En pesos.">
            <input id="shippingCost" name="shippingCost" type="number" min={0} defaultValue={s.shippingCost} className={input} />
          </Field>
          <Field label="Envío gratis desde" htmlFor="freeShippingFrom" hint="En pesos. 0 = no hay envío gratis.">
            <input id="freeShippingFrom" name="freeShippingFrom" type="number" min={0} defaultValue={s.freeShippingFrom} className={input} />
          </Field>
        </fieldset>

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-lg font-semibold">Pagos</legend>
          <Field label="Cuotas con Mercado Pago" htmlFor="installments" hint="Ej: 3 cuotas sin interés. Vacío si no hay.">
            <input id="installments" name="installments" defaultValue={s.installments} className={input} />
          </Field>
          <Field label="Descuento por transferencia (%)" htmlFor="transferDiscount" hint="0 = sin descuento. El bot no ofrece más que esto.">
            <input id="transferDiscount" name="transferDiscount" type="number" min={0} max={50} defaultValue={s.transferDiscount} className={input} />
          </Field>
          <Field label="Alias" htmlFor="transferAlias">
            <input id="transferAlias" name="transferAlias" defaultValue={s.transferAlias} className={input} />
          </Field>
          <Field label="CBU o CVU" htmlFor="transferCbu">
            <input id="transferCbu" name="transferCbu" defaultValue={s.transferCbu} inputMode="numeric" className={input} />
          </Field>
          <Field label="Titular de la cuenta" htmlFor="transferHolder">
            <input id="transferHolder" name="transferHolder" defaultValue={s.transferHolder} className={input} />
          </Field>
        </fieldset>

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-lg font-semibold">Datos legales</legend>
          <p className="-mt-2 text-sm text-muted sm:col-span-2">
            La ley pide mostrarlos en la web. Salen al pie de página y en los términos y condiciones.
          </p>
          <Field label="Nombre o razón social" htmlFor="legalName" hint="Como figura en ARCA (AFIP).">
            <input id="legalName" name="legalName" defaultValue={s.legalName} className={input} />
          </Field>
          <Field label="CUIT" htmlFor="cuit" hint="Ej: 20-12345678-9">
            <input id="cuit" name="cuit" defaultValue={s.cuit} className={input} />
          </Field>
          <Field label="Email de contacto" htmlFor="email" hint="Para reclamos y arrepentimientos.">
            <input id="email" name="email" type="email" defaultValue={s.email} className={input} />
          </Field>
        </fieldset>

        <div>
          <button type="submit" className={btnPrimary}>Guardar ajustes</button>
        </div>
      </form>
    </>
  );
}
