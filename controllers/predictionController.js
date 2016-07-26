var dbModule = require('../dbModule');
var google = require('googleapis');
var key = require('../timeZone-e50f29d2f016.json');
var prediction = google.prediction('v1.6');
var connectionDB = dbModule.connectionDB;
var regexpUnio = new RegExp("^UN[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$");
var regexpDate = new RegExp("^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$");
var moment = require('moment');

var mountPackageHandler = function(results, option, cb) {

  var bodyR = null;

  switch (option) {


    // TRAINING
    // getTrainPredictionByHour
    case 1:
      var trainingInstancesArray = [];

      for (var i = 0; i < results.length; i++) {

        var aux = {csvInstance:[]};

        aux.csvInstance.push(results[i].kw,results[i].flow_current,results[i].voltage,String(results[i].CNPJ),results[i].id_branch,
        results[i].id_sector,results[i].id_devices,results[i].timestamp,results[i].weather,results[i].clouds,results[i].temp_min,
        results[i].temp_max,results[i].sunset,results[i].sunrise);

        trainingInstancesArray.push(aux);

      }

      var queryQ = "UPDATE `cons_weather` SET isTrained = TRUE WHERE `isTrained` IS NULL  AND `timestamp` <= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY)) + 86399";

      connectionDB.query(queryQ, function(err, results) {
          if(err){
              console.log(err);
              cb(bodyR);
              return;
          }
          else{

              var bodyR = {
                id: "modelkw",
                storageDataLocation: "predict2/l56454.txt",
                trainingInstances: trainingInstancesArray
              };
          }
      });

      cb(bodyR);
      break;

    // TRAINING
    // getTrainPredictionByDay
    case 2:

      var trainingInstancesArray = [];

      for (var i = 0; i < results.length; i++) {

        var aux = {csvInstance:[]};

        aux.csvInstance.push(results[i].daytotalkwh,results[i].dayyear,results[i].iyear,results[i].id_devices,String(results[i].CNPJ),results[i].id_branch,results[i].id_sector);

        trainingInstancesArray.push(aux);

      }

      var bodyR = {
        id: "daykwh",
        storageDataLocation: "noweather/kwhbyday.txt",
        trainingInstances: trainingInstancesArray
      };

      cb(bodyR);
      break;

      // PREDICT
      //  getPredictionByHour
      case 3:

        var input = {csvInstance:[]};
        input.csvInstance.push(String(results[0].dayyear),String(results[0].iyear),String(results[0].id_devices),String(results[0].CNPJ),String(results[0].id_branch),String(results[0].id_sector));

        var bodyR = {
          input: input
        };

        cb(bodyR);
        break;

      // PREDICT
      //  postPredictionByDay
      case 4:

        var nDayYear = moment(String(results.date), 'YYYY-MM-DD').dayOfYear();
        var nYear = moment(String(results.date), 'YYYY-MM-DD').year();
        var input = {csvInstance:[]};
        input.csvInstance.push(nDayYear, nYear, String(results.cnpj), results.branch);

        var bodyR = {
          input: input
        };

        cb(bodyR);
        break;


     default:
      cb(bodyR);
  }

};


/**********************************/
/********* TRAINING METHODS *******/
/**********************************/

// getTrainPredictionByHour
exports.getTrainPredictionByHour = function(req, res) {


    var queryStr = "SELECT `kw`, `flow_current`, `voltage`, `CNPJ`, `id_branch`, `id_sector`, `id_devices`,"+
    "`timestamp`, `weather`, `clouds`, `temp_min`, `temp_max`, `sunrise`, `sunset`"+
    " FROM `cons_weather` WHERE `isTrained` IS NULL AND `timestamp` <= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY)) + 86399";

    connectionDB.query(queryStr, function(err, results) {
          if(err){
              console.log(err);
              res.status(500).send("Internal server error");
              return;
          }
          else
          {

              if(results.length == 0){
                console.log('Result:'+results);
                console.log("trained");
                res.status(200).send("trained");
              } else {


                  mountPackageHandler(results, 1, function(bodyR){

                      if(bodyR == null){

                        res.status(500).send("Internal server error");
                        return;
                      }

                        console.log(bodyR);

                        var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, ['https://www.googleapis.com/auth/prediction','https://www.googleapis.com/auth/devstorage.full_control'], null);

                         jwtClient.authorize(function(err, tokens) {
                           if (err) {
                             console.log(err);
                             return;
                           }

                           console.log('Authorization: '+ tokens.token_type+' '+tokens.access_token);

                           prediction.trainedmodels.insert({
                              auth: jwtClient,
                              // Project id used for this sample
                              project: 'timezone-1030',
                              resource: bodyR
                           }, function(err, cb) {
                               if (err) {
                                 console.log(err);
                                 return;
                               }
                               else {
                                 res.send(cb);
                               }

                           });
                       });
                   });
                }
            }
     });

};
// END getTrainPredictionByHour


// getTrainPredictionByDay
exports.getTrainPredictionByDay = function(req, res){

      // if(!regexpUnio.test(req.params.device) || !regexpDate.test(req.params.date)){
      //   res.status(400).send({error:req.params});
      //   return;
      // }
      //
      // var serialNumber = req.params.device;
      // serialNumber = serialNumber.slice(2, serialNumber.length);
      // serialNumber = parseInt(serialNumber);

      var queryQ = "SELECT ROUND((SUM(q.KWH) / 1000),4) as daytotalkwh, DAYOFYEAR(q.dia) as dayyear, DATE_FORMAT(q.dia, '%Y') as iyear, q.id_devices, q.CNPJ, q.id_branch, q.id_sector FROM (" +
                      " SELECT `CNPJ`, `id_branch`, `id_sector`, `dia`, LEFT(`hora`,2) as horaH, `id_devices`, AVG(`kw`) as KWH" +
    	                      " FROM `consumption` WHERE `isTrained` IS NULL AND `dia` <= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND `hora` <= '23:59:59' GROUP BY `dia`, horaH , `id_devices`" +
                            " ) as q GROUP BY dia,id_devices";

      connectionDB.query(queryQ, function(err, results) {
            if(err){
                console.log(err);
                res.status(500).send("Internal server error");
                return;
            }
            else
            {

                if(results.length == 0){
                  console.log(results);
                  console.log("trained");
                  res.status(200).send("trained");
                }
                else {

                    mountPackageHandler(results, 2, function(bodyR){

                        if(bodyR == null){
                          res.status(500).send("Internal server error");
                          return;
                        }

                        console.log(bodyR);

                        var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, ['https://www.googleapis.com/auth/prediction','https://www.googleapis.com/auth/devstorage.full_control'], null);

                        jwtClient.authorize(function(err, tokens) {
                           if (err) {
                             console.log(err);
                             return;
                           }

                           console.log(tokens);
                           console.log('Authorization: '+ tokens.token_type+' '+tokens.access_token);

                           prediction.trainedmodels.insert({
                              auth: jwtClient,
                              // Project id used for this sample
                              project: 'timezone-1030',
                              resource: bodyR
                           }, function(err, cb) {
                               if (err) {
                                 console.log(err);
                                 res.status(500).send("Internal server error");
                                 return;
                               }
                               else {

                                 var queryQ = "UPDATE `consumption` SET isTrained = TRUE WHERE `isTrained` IS NULL AND `dia` <= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND `hora` <= '23:59:59'";
                                 connectionDB.query(queryQ, function(err, results) {
                                     if(err){
                                         console.log(err);
                                         res.send({data:cb, error:true, reason:"Did not update", date:Date()});
                                     }
                                     else{
                                         res.send({data:cb, error:false,reason:null,date:Date()});
                                     }
                                 });

                               }

                           });
                        });
                   });
                }
            }
       });

};
// END getTrainPredictionByDay


/**********************************/
/******** PREDICTION METHODS ******/
/**********************************/


// postPredictionByDay
// function: Request total daily consumption Prediction per Company and Branch
exports.postPredictionByDay = function(req,res){
      if(
         req.body.cnpj == undefined
         || req.body.branch == undefined
         || req.body.date == undefined
       )
      {
          res.status(400).send({error:"Missing parameter",usage:"cnpj, branch, date"});
          return;
      }

      if( !regexpDate.test(req.body.date) ){
        res.status(400).send({error:"Date Formating",usage:"YYYY-MM-DD"});
        return;
      }

      mountPackageHandler(req.body, 4, function(bodyR){

          var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, ['https://www.googleapis.com/auth/prediction','https://www.googleapis.com/auth/devstorage.full_control'], null);

          jwtClient.authorize(function(err, tokens) {
             if (err) {
               console.log(err);
               return;
             }

             prediction.trainedmodels.predict({
                auth: jwtClient,
                // Project id used for this sample
                id: "c"+req.body.cnpj+"_branch_"+req.body.branch+"_total",
                project: 'timezone-1030',
                resource: bodyR

             }, function(err, cb) {

                 if (err) {
                  //  if(err.code == 404){
                    //  res.status(err.code).send("500 - Internal server error");
                  //  }
                   console.log(err);
                   res.status(err.code).send(err.errors[0].message);
                 }
                 else {
                   res.send(cb);
                 }

             });
          });

      });

};
// END postPredictionByDay


// getPredictionStatus
// Function: Request Prediction Model Status
exports.getPredictionStatus = function(req, res) {


  var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, [ 'https://www.googleapis.com/auth/prediction' ], null);

  if(req.params.model == 0){
      res.status(400).send({error:req.params});
      return;
  }

  jwtClient.authorize(function(err, tokens) {
     if (err) {
       console.log(err);
       return;
     }
     else {

       prediction.trainedmodels.get({
          auth: jwtClient,
          project: 'timezone-1030',
          id: req.params.model

       }, function(err, cb) {

           if (err) {
             console.log(err);
             res.status(500).send("Internal server error");
           }
           else {
             res.send(cb);
           }

       });
     }
  });
};
// END getPredictionStatus
