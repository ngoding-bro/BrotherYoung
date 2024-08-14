const mysql = require('mysql');
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'indratech.markaz.my.id',
  user: 'u1659760_indratech',
  password: 'Web_markaz123',
  database: 'u1659760_indratech',
  connectTimeout: 10000,
  insecureAuth: true
});

function getTokenAndOwner(callback) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool:', err.stack);
      return callback(err, null);
    }
    connection.query('SELECT token, id_owner FROM user LIMIT 1', (err, results) => {
      connection.release(); // always release the connection back to the pool

      if (err) {
        console.error('Error fetching bot token from database:', err.stack);
        return callback(err, null);
      }
      if (results.length === 0) {
        console.error('No bot configuration found in the database.');
        return callback(new Error('No bot configuration found'), null);
      }
      const token = results[0].token;
      const idPemilik = results[0].id_owner;
      callback(null, { token, idPemilik });
    });
  });
}

function sendAccGdrive(name, password, email_recovery, remaining_space) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool:', err.stack);
      return;
    }
    const insertQuery = 'INSERT INTO gdrive (name, password, email_recovery, remaining_space) VALUES (?, ?, ?, ?)';
    const insertValues = [name, password, email_recovery, remaining_space];

    connection.query(insertQuery, insertValues, (error, results, fields) => {
      connection.release(); // always release the connection back to the pool

      if (error) {
        console.error('Error inserting data into gdrive table:', error);
      } else {
        console.log('Data successfully inserted into gdrive:', results);
      }
    });
  });
}

function getUser(callback) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection from pool:', err.stack);
      return callback(err, null);
    }
    connection.query('SELECT client_id, client_secret, refresh_token, uri FROM user LIMIT 1', (err, results) => {
      connection.release(); // always release the connection back to the pool

      if (err) {
        console.error('Error fetching bot token from database:', err.stack);
        return callback(err, null);
      }
      if (results.length === 0) {
        console.error('No bot configuration found in the database.');
        return callback(new Error('No bot configuration found'), null);
      }
      const client_id = results[0].client_id;
      const client_secret = results[0].client_secret;
      const refresh_token = results[0].refresh_token;
      const uri = results[0].uri;
      callback(null, { client_id, client_secret, refresh_token, uri });
    });
  });
}

function getDataGdrive() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('Error getting connection from pool:', err.stack);
        reject(err);
        return;
      }
      connection.query('SELECT * FROM gdrive', (err, rows) => {
        connection.release(); // always release the connection back to the pool

        if (err) {
          console.error('Gagal mengambil data: ' + err.stack);
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  });
}

module.exports = { getTokenAndOwner, sendAccGdrive, getUser, getDataGdrive };
