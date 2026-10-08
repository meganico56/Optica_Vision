/**
 * reset_users.js
 * Borra todos los usuarios y crea 3 usuarios de prueba con bcrypt.
 * Ejecutar: node reset_users.js
 */
const bcrypt = require('bcrypt');
const db = require('./db');

const nuevosUsuarios = [
    {
        nombre: 'Admin', apellido: 'Principal',
        tipo_documento: 'C.C.', num_documento: '1000000001',
        telefono: '3000000001', correo: 'admin@admin.com',
        direccion: null, fecha_nacimiento: null,
        contrasena: 'admin', estado: 'Activo', id_rol: 1
    },
    {
        nombre: 'Empleado', apellido: 'Principal',
        tipo_documento: 'C.C.', num_documento: '1000000002',
        telefono: '3000000002', correo: 'empleado@admin.com',
        direccion: null, fecha_nacimiento: null,
        contrasena: 'admin', estado: 'Activo', id_rol: 2
    },
    {
        nombre: 'Cliente', apellido: 'Principal',
        tipo_documento: 'C.C.', num_documento: '1000000003',
        telefono: '3000000003', correo: 'cliente@admin.com',
        direccion: 'Calle 1 #1-1, Bogotá', fecha_nacimiento: '1990-01-01',
        contrasena: 'admin', estado: 'Activo', id_rol: 3
    },
];

async function main() {
    // Deshabilitar foreign keys temporalmente para poder borrar usuarios
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('DELETE FROM usuario');
    await db.query('ALTER TABLE usuario AUTO_INCREMENT = 1');
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🗑️  Todos los usuarios eliminados.\n');

    for (const u of nuevosUsuarios) {
        const hash = await bcrypt.hash(u.contrasena, 10);
        await db.query(
            `INSERT INTO usuario (nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, fecha_nacimiento, contrasena, estado, id_rol)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [u.nombre, u.apellido, u.tipo_documento, u.num_documento,
             u.telefono, u.correo, u.direccion, u.fecha_nacimiento, hash, u.estado, u.id_rol]
        );
        console.log(`✅ Creado: ${u.correo} | Contraseña: ${u.contrasena} | id_rol: ${u.id_rol}`);
    }

    console.log('\n✅ Usuarios de prueba listos.');
    process.exit();
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
