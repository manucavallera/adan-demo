# ADAN · Tienda online con asistente de ventas por WhatsApp

Tienda online para una marca de indumentaria masculina, con panel para el dueño y un **asistente de ventas con IA** que atiende por WhatsApp y por el chat de la web. El asistente consulta el catálogo y el stock reales, recomienda talles, arma el pedido y le pasa la charla al dueño cuando hace falta.

> **English summary.** Online store for a menswear brand with an owner dashboard and an AI sales assistant (Claude) that answers customers on WhatsApp and on the website. It reads the live catalog and stock from PostgreSQL, recommends sizes, fills in the order as structured data, and hands the conversation to the owner when needed. Built with Next.js, Prisma, PostgreSQL, Mercado Pago and the WhatsApp Cloud API, deployed with Docker.

**Demo:** _[link a la demo]_ · **Video (1 min):** _[link al video]_

<!-- Captura principal: tienda + chat del asistente -->

---

## Qué hace

### Tienda
- Catálogo con prendas por color y talle, cada combinación con su propio stock.
- Ofertas (precio anterior tachado), prendas nuevas y prendas pausadas.
- Carrito y checkout con **Mercado Pago (Checkout Pro)**, transferencia o efectivo al retirar.
- Envío por zonas (con precio fijo o "a coordinar") y envío gratis desde un monto.
- Botón de arrepentimiento y datos legales al pie (Ley 24.240 y Resolución 424/2020).

### Panel del dueño (`/admin`)
- **Productos:** alta y edición, fotos optimizadas automáticamente y **carga rápida con IA**: a partir de las fotos y una línea de texto, la IA completa el formulario y el dueño revisa antes de guardar.
- **Pedidos:** estados (pendiente, pagado, enviado, entregado, cancelado) con el stock sincronizado.
- **Chats:** las conversaciones del asistente, con la opción de pausarlo o reactivarlo en cada chat.
- **Ajustes:** WhatsApp, dirección, horarios, cuotas, envíos, descuento por transferencia y números que el bot no debe contestar.

### Asistente de ventas (WhatsApp y web)
- Responde en español rioplatense, con mensajes cortos, como un vendedor de local.
- Ofrece solo prendas, colores y talles que existen y tienen stock.
- Recomienda talle a partir de altura y peso.
- Reconoce prendas a partir de una foto que manda el cliente (por ejemplo, una captura de un estado).
- Arma el pedido (prenda, talle, cantidad, entrega, dirección, forma de pago) y calcula el total.
- Le pasa la charla al dueño cuando el cliente pide más descuento del permitido, algo que no está en el catálogo, tiene un problema con un pedido o quiere hablar con una persona.

---

## Cómo funciona el asistente

```text
Cliente (WhatsApp / chat web)
        │
        ▼
Webhook verificado (firma HMAC) ──► junta los mensajes seguidos (4 s)
        │
        ▼
Prompt armado desde la base: catálogo, stock por color y talle,
envíos, pagos y reglas de la tienda   (se cachea mientras no cambie)
        │
        ▼
Claude, con salida estructurada (JSON Schema)
        │
        ▼
{ respuesta, prendas a mostrar, pedido, total, estado de la venta,
  mandar link de pago, pasar al dueño, motivo, aviso al dueño }
        │
        ├──► responde al cliente y manda las fotos de las prendas
        ├──► avisa al dueño (venta lista, pidió rebaja, se agotó algo)
        └──► si pasa al dueño o algo falla: el bot se calla en ese chat
```

Decisiones de diseño:

- **Una sola llamada con salida estructurada, no un agente con herramientas.** El catálogo completo entra en el prompt y la respuesta vuelve como un JSON validado contra un esquema. Es más simple, más rápido y más fácil de auditar que un bucle de herramientas, y alcanza para un catálogo de este tamaño.
- **Los códigos de producto están restringidos al catálogo.** El esquema limita los campos de prendas y de pedido a los códigos que existen en la base, así el sistema no puede mostrar o cargar una prenda inventada.
- **El prompt sale de la misma base que la web**, así el bot nunca ofrece algo agotado o que ya no se vende. Como el texto no cambia entre pedidos mientras el catálogo no cambie, se aprovecha la caché de prompts y baja el costo.
- **Tres canales con el mismo motor:** demo web, chat real de la tienda y WhatsApp. Solo cambian las instrucciones de cierre de venta (por ejemplo, quién manda el link de pago).
- **El dueño siempre puede intervenir:** si escribe a mano en un chat, el bot se calla 12 horas en esa conversación; lo reactiva escribiendo `#bot` o desde el panel.
- **Control de gasto:** límite de mensajes por hora en WhatsApp y por IP en la demo pública, historial recortado a los últimos 20 mensajes y solo las 2 fotos más recientes.
- **Si la IA falla o rechaza la consulta,** el cliente no queda sin respuesta: la charla pasa al dueño y se le avisa.

---

## Otras decisiones técnicas

- **Los precios siempre salen de la base**, nunca de lo que manda el navegador.
- **El stock se reserva dentro de una transacción** al crear el pedido, solo si alcanza (evita vender dos veces la última unidad), y se devuelve si el pedido se cancela.
- **Los pagos de Mercado Pago se confirman consultando a Mercado Pago**, no confiando en el aviso, y se verifica la firma del webhook. Los links de pago vencen a las 48 horas.
- **Los webhooks de WhatsApp se verifican con HMAC** y comparación en tiempo constante.
- **El panel usa una cookie firmada y `httpOnly`**; si cambia la contraseña o el secreto, se cierran todas las sesiones.
- **Las fotos se achican a 1600 px y se pasan a WebP** al subirlas.

---

## Arquitectura

```text
Navegador (tienda y panel)        WhatsApp (Meta Cloud API / Evolution)
            │                                   │
            ▼                                   ▼
        Next.js (App Router, server actions, rutas API)
            │              │              │
            ▼              ▼              ▼
  PostgreSQL + Prisma   Claude API   Mercado Pago
```

## Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Motion.
- **Backend:** rutas API y server actions de Next.js, Prisma, PostgreSQL.
- **IA:** Claude (Anthropic SDK) con salida estructurada, visión y caché de prompts.
- **Integraciones:** WhatsApp Cloud API (o Evolution API), Mercado Pago Checkout Pro.
- **Infraestructura:** Docker (build standalone de Next.js), despliegue en Easypanel, migraciones automáticas al arrancar.

---

## Correrlo en local

Requisitos: Node.js 20 o superior y una base PostgreSQL.

```bash
npm install
cp .env.example .env        # completar DATABASE_URL, ANTHROPIC_API_KEY, ADMIN_PASSWORD y ADMIN_SECRET
npx prisma migrate deploy
node prisma/seed.mjs        # carga el catálogo de ejemplo si la base está vacía
npm run dev
```

- Tienda: http://localhost:3000
- Panel: http://localhost:3000/admin
- Con `NEXT_PUBLIC_DEMO_BOT=1`, los botones de WhatsApp abren el asistente de prueba en la web.

WhatsApp y Mercado Pago son opcionales: si sus variables están vacías, la tienda funciona igual y el dueño manda los links a mano. Todas las variables están explicadas en `.env.example`.

## Despliegue

El `Dockerfile` compila la app en modo standalone. Al arrancar, el contenedor aplica las migraciones, carga el catálogo inicial si la base está vacía y levanta el servidor. Las fotos subidas se guardan en `/app/data`, que tiene que ser un volumen persistente.

---

## Estado y próximos pasos

- [ ] Evals del asistente: un set de conversaciones de prueba para medir si recomienda bien, no inventa y pasa al dueño cuando corresponde.
- [ ] Tests de lo crítico: creación de pedidos, reserva de stock y confirmación de pagos.
- [ ] Comparar el modelo actual con uno más chico usando esos evals, para bajar el costo por conversación.

---

Hecho por **Manuel Cavallera** · [LinkedIn](https://linkedin.com/in/manuel-cavallera-331025245) · [GitHub](https://github.com/manucavallera)
