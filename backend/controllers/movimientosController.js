const { listarMovimientos, crearMovimiento, actualizarEstado, getAlertasCaja, cerrarBalanceMensual, actualizarMontoRecurrente, getCajaDiaria, guardarAperturaCaja, cerrarCajaDiaria } = require("../services/movimientosService");

exports.listar = async (req, res) => {
  try { res.json(await listarMovimientos(req.query.mes)); }
  catch (error) { res.status(500).json({ error: error.message }); }
};

exports.crear = async (req, res) => {
  try { res.status(201).json(await crearMovimiento(req.body)); }
  catch (error) { res.status(400).json({ error: error.message }); }
};

exports.actualizarEstado = async (req, res) => {
  try { res.json(await actualizarEstado(req.params.id, req.body.estado, req.body.pagos)); }
  catch (error) { res.status(400).json({ error: error.message }); }
};

exports.alertas = async (req, res) => {
  try { res.json({ alertas: await getAlertasCaja() }); }
  catch (error) { res.status(500).json({ error: error.message }); }
};

exports.cerrarBalance = async (req, res) => {
  try { res.json(await cerrarBalanceMensual(req.body.mes)); }
  catch (error) { res.status(400).json({ error: error.message }); }
};

exports.actualizarMontoRecurrente = async (req, res) => {
  try { res.json(await actualizarMontoRecurrente(req.params.id, req.body.monto)); }
  catch (error) { res.status(400).json({ error: error.message }); }
};

exports.cajaDiaria = async (req, res) => {
  try { res.json(await getCajaDiaria(req.query.fecha)); }
  catch (error) { res.status(400).json({ error: error.message }); }
};

exports.guardarAperturaCaja = async (req, res) => {
  try { res.json(await guardarAperturaCaja(req.params.fecha, req.body.monto_apertura)); }
  catch (error) { res.status(400).json({ error: error.message }); }
};

exports.cerrarCajaDiaria = async (req, res) => {
  try { res.json(await cerrarCajaDiaria(req.params.fecha, req.body.monto_contado)); }
  catch (error) { res.status(400).json({ error: error.message }); }
};
