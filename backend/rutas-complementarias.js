const { verificarSesion, rutasSuspension, rutasCalendario } = require("./contexto-rutas");

module.exports = function registrarRutasComplementarias(app) {
  app.use("/api", require("./rutas-panel"));
  app.use(
    "/api",
    (req, res, next) => {
      const ruta = req.originalUrl
        .split("?")[0]
        .replace(/\/+$/, "")
        .toLowerCase();
      const tipo = req.body && req.body.tipo;
      const esCambioProtegido =
        req.method === "PUT" &&
        ruta === "/api/suspensiones" &&
        (tipo === "producto" || tipo === "usuario");
      const esConsultaProtegida =
        (req.method === "GET" || req.method === "HEAD") &&
        ruta === "/api/suspensiones/reportes";
      if (!esCambioProtegido && !esConsultaProtegida) {
        return next();
      }

      verificarSesion(req, res, () => {
        if (req.usuario.rol !== "Administrador") {
          return res.status(403).json({
            mensaje:
              "Solo un administrador puede gestionar las suspensiones de productos o usuarios.",
          });
        }
        next();
      });
    },
    rutasSuspension,
  );
  app.use("/api", rutasCalendario);
};
