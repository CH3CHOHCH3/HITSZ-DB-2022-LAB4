/* 用于后端和数据库之间的交互 */
var mysql = require('mysql');

var conn = mysql.createConnection({
  host:'localhost',
  user:'test',
  password:'test',
  database:'volunteer'
});

conn.connect();

module.exports = conn;
