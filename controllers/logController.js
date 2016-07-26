var logger = require('../logger');
var fs = require('fs');

exports.getLogWithId = function(req, res){

  if (req.params.date.length === 0) {
      res.status(400).send("Bad Request");
  }

  var filename = req.params.date + ".log";
  var path = process.env.OPENSHIFT_DATA_DIR + filename;
  console.log(path);


  if (!fs.existsSync(path)) {
      console.log(path);
      res.status(400).send("File Doesnt exists");
  }
  else {

    var pathFile = process.env.OPENSHIFT_DATA_DIR + filename;

    res.download( pathFile , filename, function(err){
        if (err) {
          logger.logThis("Error downloading log file - VALUE :" + filename);
        } else {
          console.log("File Sent!");
        }
    });
  }

};

exports.getLogs = function(req, res){

  var content = fs.readdirSync(process.env.OPENSHIFT_DATA_DIR);
  var logFiles = new Array();

  for (var i = 0; i < content.length; i++) {
    if (content[i].slice(0,2) == 'UN' && content[i].slice(13, 17) == '.log') {
      logFiles.push(content[i].slice(0,13));
    }
  }

  if(logFiles[0] == undefined){
    logFiles.push("empty");
  }
  if(req.accepts('text/plain')){
      res.send(logFiles.toString());
  }
  else if(req.accepts('application/json')){
      res.json({files: logFiles});
  }
  else{
      res.status(406).send('Not Acceptable');
  }

};
