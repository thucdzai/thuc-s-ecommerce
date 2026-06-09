const db = require('../../config/db');

async function listAll() {
    const [rows] = await db.execute('SELECT id, parent_id, name, slug FROM categories ORDER BY name ASC');
    return rows;
}

module.exports = { listAll };
