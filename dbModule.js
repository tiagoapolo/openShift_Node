var mysql = require('mysql');

exports.connectionDB = mysql.createConnection ({
    host     : process.env.OPENSHIFT_MYSQL_DB_HOST,
    user     : process.env.OPENSHIFT_MYSQL_DB_USERNAME,
    password : process.env.OPENSHIFT_MYSQL_DB_PASSWORD ,
    port     : process.env.OPENSHIFT_MYSQL_DB_PORT,
    database : 'nodejs'
    //socketPath: '/var/lib/openshift/55738d52500446d7d500022b/mysql//socket/mysql.sock'
});
