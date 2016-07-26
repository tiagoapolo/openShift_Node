var fs = require('fs');

exports.logThis = function(Error){

    if(typeof Error != String){
        Error = Error.toString();
    }

    var date = new Date();
    var filename = 'UN' + '-' + date.getFullYear() + '-' + (date.getUTCMonth() + 1) + '-' + date.getUTCDate() + '.log';

    fs.open( process.env.OPENSHIFT_DATA_DIR + filename, 'a', function(err, fd) {
       if (err) {
           return console.error(err);
       }

       var hour = date.getUTCHours() + '-' + date.getUTCMinutes() + '-' + date.getUTCSeconds();
       var errInJson =  '==Hour-'+ hour + '== - Log: ' +Error+ '\n';

       fs.appendFile(process.env.OPENSHIFT_DATA_DIR + filename, errInJson, 'utf8',function(err) {
           if (err) {
               return console.error(err);
           }
       });

       fs.close(fd, function(err){
           if (err){
               console.log(err);
           }
       });
    });

};
