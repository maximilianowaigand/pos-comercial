import { ProductosProvider } from "../context/ProductosContext";
import POSContent from "./POSContent";

export default function POS() {
  return (
    <ProductosProvider>
      <POSContent />
    </ProductosProvider>
  );
}