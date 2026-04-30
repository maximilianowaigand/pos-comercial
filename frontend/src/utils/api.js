import API from "../config/api"


export async function fetchTotales() {
  try {
    const [resDia, resMes] = await Promise.all([
      fetch(`${API}/api/ventas/total-dia`),
      fetch(`${API}/api/ventas/total-mes`)
    ]);

    const diaDatos = await resDia.json();
    const mesDatos = await resMes.json();

    console.log("TOTALES DIA:", diaDatos);
    console.log("TOTALES MES:", mesDatos);

    return {
      efectivo: diaDatos.efectivo || 0,
      transferencia: diaDatos.transferencia || 0,
      tarjeta: diaDatos.tarjeta || 0,
      totalDia: diaDatos.totalDia || 0,
      totalMes: mesDatos.totalMes || 0
    };
  } catch (error) {
    console.error("Error fetchTotales:", error);
    return { efectivo: 0, transferencia: 0, debito: 0, totalDia: 0, totalMes: 0 };
  }
}
