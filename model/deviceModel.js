var logger = require('../logger');

// SELECT cod_aparelho FROM nodejs.aparelhos where aparelhos.num_serie = 'UN00000003';
exports.save = function(post, callback){

    var queryInsert = 'INSERT INTO consumo SET ?';
    self.connectionDB.query(queryInsert, post, function(err, results) {
        if(err){
            logger.logThis(err);
            callback({affectedRows: 0});
        }
        else{
            console.log(results);
            callback(results);
        }
    });
};


exports.getDeviceId = function(post, callback){

    var selectQuery = "SELECT * FROM APARELHO where aparelhos.cod_aparelho = '" + post.cod_aparelho + "'";
    var query = self.connectionDB.query(selectQuery, function(err, results){
        if(err){
            logger.logThis(err);
            callback(null);
        }
        else{
            callback(results[0].cod_aparelho);
        }
    });
};
