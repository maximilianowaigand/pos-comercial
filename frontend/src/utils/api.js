export async function fetchTotales() {
  try {
    const res = await fetch("/api/ventas/total-dia");
    const data = await res.json();

    console.log("TOTALES DESDE BACKEND:", data);

    return {
      efectivo: data.efectivo || 0,
      transferencia: data.transferencia || 0,
      debito: data.debito || 0,
      totalDia: data.totalDia || 0,
      totalMes: data.totalMes || 0
    };
  } catch (error) {
    console.error("Error fetchTotales:", error);
    return {
      efectivo: 0,
      transferencia: 0,
      debito: 0,
      totalDia: 0,
      totalMes: 0
    };
  }
}
