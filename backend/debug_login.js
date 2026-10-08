const bcrypt = require('bcrypt');
const db = require('./db');

async function main() {
    const correo = 'camila.torres@visionclara.com';
    const contrasena = 'CamT2026*';

    const [rows] = await db.query(
        'SELECT correo, contrasena, LENGTH(contrasena) as len FROM usuario WHERE correo = ?',
        [correo]
    );

    if (rows.length === 0) {
        console.log('❌ Usuario NO encontrado en la BD');
        process.exit();
    }

    const usuario = rows[0];
    console.log('✅ Usuario encontrado:', usuario.correo);
    console.log('📏 Longitud del hash en BD:', usuario.len);
    console.log('🔑 Hash en BD:', usuario.contrasena);

    const match = await bcrypt.compare(contrasena, usuario.contrasena);
    console.log('🔐 bcrypt.compare resultado:', match ? '✅ COINCIDE' : '❌ NO COINCIDE');

    process.exit();
}

main().catch(e => { console.error(e); process.exit(1); });
