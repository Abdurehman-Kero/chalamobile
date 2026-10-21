const knex = require('knex');
const { types } = require('pg');

// Return SQL DATE columns (e.g. a repair's promised date) as plain 'YYYY-MM-DD'
// strings, so they never shift a day when the server's timezone differs.
types.setTypeParser(1082, (v) => v);

const config = require('../../knexfile');

const env = process.env.NODE_ENV || 'development';
const db = knex(config[env]);

module.exports = db;
