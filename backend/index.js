const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba para verificar que el backend funciona
app.get('/', (req, res) => {
  res.send('API de Óptica Visión funcionando correctamente');
});

// Ruta para obtener todos los productos de la BD
app.get('/api/productos', async (req, res) => {
  try {
    const [filas] = await db.query('SELECT * FROM producto');
    res.json(filas);
  } catch (error) {
    console.error('Error al consultar MySQL:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});