const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "pos_app",
  password: "UnaClaveSegura123!",
  database: "panaderia",
  port: 3306,
  waitForConnections: true,
  decimalNumbers: true,
  connectionLimit: 10,

});

module.exports = pool;