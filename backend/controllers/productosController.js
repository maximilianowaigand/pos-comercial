
const productosService = require("../services/productosService");

// GET
exports.listar = async (req, res) => {
  try {
    const productos = await productosService.listarProductos();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST
exports.crear = async (req, res) => {
  try {
    const result = await productosService.crearProducto(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.eliminar = async (req, res) => {
  try {
    console.log("Eliminando id:", req.params.id);
    await productosService.eliminarProducto(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error eliminar:", err);
    res.status(500).json({ error: err.message });
  }
};

// PUT
exports.actualizar = async (req, res) => {
  try {
    const result = await productosService.actualizarProducto({
      id: req.params.id,
      ...req.body
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};