import { CartProvider } from "@/components/cart";
import { Header } from "@/components/header";
import { CartDrawer } from "@/components/cart-drawer";
import { Footer } from "@/components/footer";
import { BotDemo } from "@/components/bot-demo";
import { ShopProvider } from "@/components/shop";
import { store } from "@/lib/config";
import { getShop } from "@/lib/shop";

// Layout de la tienda (todo menos el panel del dueño). Se arma en cada pedido (no en el build)
// porque lee la base; los datos igual quedan en caché hasta que el dueño cambia algo.
export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const shop = await getShop();
  return (
    <ShopProvider value={shop}>
      <CartProvider>
        <Header />
        {children}
        <Footer settings={shop.settings} />
        <CartDrawer />
        {store.demoBot && <BotDemo />}
      </CartProvider>
    </ShopProvider>
  );
}
