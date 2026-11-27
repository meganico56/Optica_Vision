module.exports = function registrarRutas(app) {
  const { db } = require("./contexto-rutas");

  app.get("/", (req, res) => {
    res.send("API de Óptica Visión funcionando correctamente");
  });

  app.get("/api/health", async (req, res) => {
    try {
      await db.query("SELECT 1");
      res.json({ api: "ok", database: "ok" });
    } catch (error) {
      console.error("La base de datos no está disponible:", error);
      res.status(503).json({ api: "ok", database: "unavailable" });
    }
  });
};
