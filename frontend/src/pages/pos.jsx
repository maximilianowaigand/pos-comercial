import { VentasProvider } from "../context/VentasContext";
import { ProductosProvider } from "../context/ProductosContext";
import POSContent from "./POSContent";

export default function POS() {
  return (
    <VentasProvider>
      <ProductosProvider>
        <POSContent />
      </ProductosProvider>
    </VentasProvider>
  );
}
