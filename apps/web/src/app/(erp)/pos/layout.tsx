import { CartProvider } from "./_components/cart-context";

/**
 * Layout del POS — envuelve `/pos` (paso 1: carrito) y `/pos/cobrar`
 * (paso 2: cobro/comprobante) con un único `CartProvider`. Esto
 * permite que el carrito persista al navegar entre ambos pasos
 * (además del backup en localStorage del propio provider).
 */
export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
