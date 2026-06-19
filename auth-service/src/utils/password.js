const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const hash = (plainText) => bcrypt.hash(plainText, SALT_ROUNDS);
const compare = (plainText, hashed) => bcrypt.compare(plainText, hashed);

module.exports = { hash, compare };
