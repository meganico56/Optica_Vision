const bcrypt = require('bcrypt');

const hash = '$2b$10$VimUxLrTF27lzO0u1k2qpO2FmSWDfEAZn7ODazomWF7il1qapY3SG';
const plain = 'CamT2026*';

bcrypt.compare(plain, hash).then(result => {
    console.log('CamT2026* coincide:', result);
});
