var dbModule = require('../dbModule');
var request = require('request');
var connectionDB = dbModule.connectionDB;
var regexpUnio = new RegExp("^UN[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$");
var regexpDate = new RegExp("^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$");
var moment = require('moment');
var emergencia = "1";



exports.getDeviceInfo = function(req, res) {

    if(!regexpUnio.test(req.params.device)){
      logger.logThis("Error in id_aparelho - Inferior size or does not start with UN" + " - VALUE: " + req.params.device);
      res.status(400).send("Bad Request");
      return;
    }

    var serialNumber = req.params.device;
    serialNumber = serialNumber.slice(2, serialNumber.length);
    serialNumber = parseInt(serialNumber);

    connectionDB.query('SELECT * FROM devices WHERE id_devices = ?', [serialNumber], function(err, results) {
          if(err){
              logger.logThis(err);
              res.status(500).send("Internal server error");
              return;
          }
          else
          {
              var data = {
                id_branch: results[0].id_branch,
                CNPJ: results[0].CNPJ,
                id_sector: results[0].id_sector,
                name: results[0].name,
                description: results[0].description
              };

              if(req.accepts('application/json'))
              {
                  res.json(data);
              }
              else
              {
                  res.status(200).send(data);
              }
          }
     });
};


exports.postConsumption = function(req,res) {

      if(
         req.body.id_devices == undefined
         || req.body.id_sector == undefined
         || req.body.id_branch == undefined
         || req.body.cnpj == undefined
         || req.body.flow_current == undefined
         || req.body.voltage == undefined
         || req.body.kw == undefined
         || req.body.dia == undefined
         || req.body.hora == undefined
       )
      {
          res.status(406).send('Not Acceptable');
          return;
      }

      if(!regexpUnio.test(req.body.id_devices)){
        logger.logThis("Error in id_aparelho - Inferior size or does not start with UN" + " - VALUE: " + req.body.id_devices);
        res.status(400).send("Bad Request");
        return;
      }

      // serialNumber = UN12345678 - 10 digits
      var serialNumber = req.body.id_devices;
      // 12345678
      serialNumber = serialNumber.slice(2, serialNumber.length);

      var consumo = {
          id_consumption: '',
          id_sector: parseInt(req.body.id_sector),
          CNPJ: req.body.cnpj,
          id_branch: parseInt(req.body.id_branch),
          id_devices: parseInt(serialNumber),
          flow_current: parseFloat(req.body.flow_current),
          voltage: parseFloat(req.body.voltage),
          kw: parseFloat(req.body.kw),
          dia: req.body.dia,
          hora: req.body.hora
      };

      // Code Block for Test on weather req and current measuring - START
      request.get({url:'http://api.openweathermap.org/data/2.5/weather?id=3464975&units=metric&appid=e213cb58d3bdb33b57e2e583a2ec3932'},
                    function(error, response, body){
                        if(error){
                            console.log('erro');
                            return;
                        }
                        else {

                            if(body == null || body.length < 5) return;

                            var text = JSON.parse(body);
                            var time = new Date(consumo.dia + " " + consumo.hora);
                            var miliUTC = (time.getTime()/1000);


                            var consumo_weather = {
                                id_consumption: '',
                                id_sector: consumo.id_sector,
                                CNPJ: consumo.CNPJ,
                                id_branch: consumo.id_branch,
                                id_devices: consumo.id_devices,
                                flow_current: consumo.flow_current,
                                voltage: consumo.voltage,
                                kw: consumo.kw,
                                timestamp: miliUTC,
                                weather: (text.weather)[0].main,
                                clouds: text.clouds.all,
                                temp: text.main.temp,
                                temp_min: text.main.temp_min,
                                temp_max: text.main.temp_max,
                                humidity: text.main.humidity,
                                sunrise: text.sys.sunrise,
                                sunset: text.sys.sunset
                            };

                            var queryInsert = 'INSERT INTO cons_weather SET ?';
                            connectionDB.query(queryInsert, consumo_weather, function(err, results) {
                                if(err){
                                    logger.logThis(err);
                                    console.log(err);
                                    return;
                                }
                            });
                        }
                    });
      // Code Block for Test on weather req and current measuring - END

      var queryInsert = 'INSERT INTO consumption SET ?';
      connectionDB.query(queryInsert, consumo, function(err, results) {
          if(err){
              logger.logThis(err);
              console.log(err);
              res.status(500).send("Internal error");
          }
          else
          {
              if(req.accepts('application/json'))
              {
                  res.json({status: 200, message:"OK"});
              }
              else
              {
                  res.status(200).send("OK");
              }
          }
     });
};

exports.postConsumptionTst2 = function(req,res){
		res.send("RELAY="+emergencia);
};
exports.setEmergencia = function(req,res){
	emergencia = req.params.status;
	res.send(emergencia);
};
exports.postConsumptionTst = function(req,res) {

      if(
         req.body.id_devices == undefined
         || req.body.id_branch == undefined
         || req.body.cnpj == undefined
         || req.body.flow_current == undefined
         || req.body.voltage == undefined
         || req.body.kw == undefined
        //  || req.body.dia == undefined
        //  || req.body.hora == undefined
       )
      {
          res.status(406).send('Not Acceptable');
          return;
      }

      if(!regexpUnio.test(req.body.id_devices)){
        // logger.logThis("Error in id_aparelho - Inferior size or does not start with UN" + " - VALUE: " + req.body.id_devices);
        res.status(400).send("Bad Request");
        return;
      }
      console.log(req.body);
      // serialNumber = UN12345678 - 10 digits
      var serialNumber = req.body.id_devices;
      // 12345678
      serialNumber = serialNumber.slice(2, serialNumber.length);

      var consumo = {
          id_consumption: '',
          id_sector: 1,//parseInt(req.body.id_sector),
          CNPJ: "99999999999998",//req.body.cnpj,
          id_branch: parseInt(req.body.id_branch),
          id_devices: parseInt(serialNumber),
          flow_current: parseFloat(req.body.flow_current),
          voltage: parseFloat(req.body.voltage),
          kw: parseFloat(req.body.kw),
          dia: moment().utcOffset("-03:00").format("YYYY-MM-DD"),//req.body.dia,
          hora: moment().utcOffset("-03:00").format("HH:mm:ss")
      };

      // Code Block for Test on weather req and current measuring - START
      // request.get({url:'http://api.openweathermap.org/data/2.5/weather?id=3464975&units=metric&appid=e213cb58d3bdb33b57e2e583a2ec3932'},
      //               function(error, response, body){
      //                   if(error){
      //                       console.log('erro');
      //                       return;
      //                   }
      //                   else {
      //
      //                       if(body == null || body.length < 5) return;
      //
      //                       var text = JSON.parse(body);
      //                       var time = new Date(consumo.dia + " " + consumo.hora);
      //                       var miliUTC = (time.getTime()/1000);
      //
      //
      //                       var consumo_weather = {
      //                           id_consumption: '',
      //                           id_sector: consumo.id_sector,
      //                           CNPJ: consumo.CNPJ,
      //                           id_branch: consumo.id_branch,
      //                           id_devices: consumo.id_devices,
      //                           flow_current: consumo.flow_current,
      //                           voltage: consumo.voltage,
      //                           kw: consumo.kw,
      //                           timestamp: miliUTC,
      //                           weather: (text.weather)[0].main,
      //                           clouds: text.clouds.all,
      //                           temp: text.main.temp,
      //                           temp_min: text.main.temp_min,
      //                           temp_max: text.main.temp_max,
      //                           humidity: text.main.humidity,
      //                           sunrise: text.sys.sunrise,
      //                           sunset: text.sys.sunset
      //                       };
      //
      //                       var queryInsert = 'INSERT INTO cons_weather SET ?';
      //                       connectionDB.query(queryInsert, consumo_weather, function(err, results) {
      //                           if(err){
      //                               logger.logThis(err);
      //                               console.log(err);
      //                               return;
      //                           }
      //                       });
      //                   }
      //               });
      // Code Block for Test on weather req and current measuring - END

      var queryInsert = 'INSERT INTO consumption SET ?';
      connectionDB.query(queryInsert, consumo, function(err, results) {
          if(err){
              // logger.logThis(err);
              console.log(err);
              res.status(500).send("Internal error");
          }
          else
          {
                  res.status(200).send("OK");
          }
     });
};



// getDevicePowerOnHours
// exports.getDevicePowerOnHours = function(req, res){

  // if(!regexpUnio.test(req.params.device) || !regexpDate.test(req.params.date)){
  //   res.status(400).send({error:req.params});
  //   return;
  // }
  //
  // var serialNumber = req.params.device;
  // serialNumber = serialNumber.slice(2, serialNumber.length);
  // serialNumber = parseInt(serialNumber);
  //
  // var queryQ = "SELECT 'ON' AS device_status, q.dia as period, q.horaH as hours, ROUND(q.KWH, 4) as kiloWattHour, q.id_devices"
  //                 "FROM ( SELECT `dia`, LEFT(`hora`,2) AS horaH, `id_devices`, AVG(`kw`) as KWH" +
	// 	                      "FROM consumption WHERE `id_devices` = " + serialNumber + " GROUP BY `dia`, horaH" +
  //                       ") as q WHERE q.kwh > 0 GROUP BY q.horaH, `dia`";
  //
  // connectionDB.query('SELECT * FROM devices WHERE id_devices = ?', [serialNumber], function(err, results) {
  //       if(err){
  //           res.status(500).send("Internal server error");
  //           return;
  //       }
  //       else
  //       {
  //           var data = {
  //             id_branch: results[0].id_branch,
  //             CNPJ: results[0].CNPJ,
  //             id_sector: results[0].id_sector,
  //             name: results[0].name,
  //             description: results[0].description
  //           };
  //
  //           if(req.accepts('application/json'))
  //           {
  //               res.json(data);
  //           }
  //           else
  //           {
  //               res.status(200).send(data);
  //           }
  //       }
  //  });

// };
// END getDevicePowerOnHours
