/**
 * update_passwords.js
 * Actualiza las contraseñas en texto plano de la BD con hashes bcrypt.
 * Ejecutar UNA sola vez: node update_passwords.js
 */
const bcrypt = require('bcrypt');
const db = require('./db');

const usuarios = [
    { correo: 'camila.torres@visionclara.com',  plain: 'CamT2026*' },
    { correo: 'andres.ramirez@visionclara.com', plain: 'AndR890!'  },
    { correo: 'diana.castillo@visionclara.com', plain: 'DiaC451$'  },
    { correo: 'sofia.herrera@gmail.com',         plain: 'SofH2026*' },
];

async function main() {
    console.log('🔐 Actualizando contraseñas con bcrypt...\n');

    for (const u of usuarios) {
        const hash = await bcrypt.hash(u.plain, 10);
        const [result] = await db.query(
            'UPDATE usuario SET contrasena = ? WHERE correo = ?',
            [hash, u.correo]
        );
        if (result.affectedRows > 0) {
            console.log(`✅ ${u.correo} → actualizada`);
        } else {
            console.log(`⚠️  ${u.correo} → no encontrada en BD`);
        }
    }

    console.log('\n✅ Listo. Todas las contraseñas fueron hasheadas con bcrypt.');
    process.exit();
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
