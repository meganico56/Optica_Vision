const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

require("./rutas-sistema")(app);
require("./rutas-productos")(app);
require("./rutas-catalogos")(app);
require("./rutas-citas")(app);
require("./rutas-autenticacion")(app);
require("./rutas-usuarios")(app);
require("./rutas-proveedores")(app);
require("./rutas-ventas")(app);
require("./rutas-devoluciones")(app);
require("./rutas-compras")(app);
require("./rutas-recetas")(app);
require("./rutas-promociones")(app);
require("./rutas-reportes")(app);
require("./rutas-complementarias")(app);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
