const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',        // Usuario por defecto de MySQL (cambia si usas otro)
  password: 'Admin123456', // Pon aquí la contraseña de tu base de datos
  database: 'optica_vision',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();