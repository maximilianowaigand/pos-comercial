import { POSProvider } from "../context/POSContext";
import POSContent from "./POSContent";

export default function POS() {
  return (
    <POSProvider>
      <POSContent />
    </POSProvider>
  );
}
