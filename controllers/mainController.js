var logger = require('../logger');
var dbModule = require('../dbModule');
var request = require('request');
var connectionDB = dbModule.connectionDB;
var regexpDate = new RegExp("^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$");
var moment = require('moment');


var sqlDateTimeFormatter = function(raw){
    if(parseInt(raw) < 10){
        return '0'+raw;
    }
    else
    {
        return raw.toString();
    }
};


exports.getTimeAndDateUTC = function(req, res) {

  var cDate = new Date();
  var mili  = parseInt(cDate.getTime()/1000);

  var timeNow = {
      timestamp  : mili
  };

  if(req.accepts('text/plain')){

    res.send(mili.toString());
  }
  else if(req.accepts('application/json')){
      res.json(timeNow);
  }
  else{
      res.sendStatus(406).send('Not Acceptable');
  }

};

exports.getTimeAndDate = function(req, res){

  var cDate = new Date();
  var year    = sqlDateTimeFormatter(cDate.getFullYear());
  var month   = sqlDateTimeFormatter(cDate.getUTCMonth() + 1);
  var day     = sqlDateTimeFormatter(cDate.getUTCDate());
  var hours   = sqlDateTimeFormatter(cDate.getUTCHours());
  var minutes = sqlDateTimeFormatter(cDate.getUTCMinutes());
  var seconds = sqlDateTimeFormatter(cDate.getUTCSeconds());

  var timeNow = {
      date   : year + '-' + month +'-'+ day,
      time   : hours +':'+ minutes + ':'+ seconds
  };

  if(req.accepts('text/plain')){
    var timeNowTxt = '';
    timeNowTxt =  timeNow.date +' '+ timeNow.time;

    res.send(timeNowTxt);
  }
  else if(req.accepts('application/json')){
      res.json(timeNow);
  }
  else{
      res.status(406).send('Not Acceptable');
  }

};

// getDayOfYear
// function: Returns in date YYYY-MM-DD,
// the equivalent day of year in 365 range.
exports.getDayOfYear = function(req,res){

    var dateD = String(req.params.date);

    if( !regexpDate.test(dateD) ){
        res.status(400).send({error:"Date Formating",usage:"YYYY-MM-DD"});
        return;
    }

    var nDayYear = moment(dateD, 'YYYY-MM-DD').dayOfYear();
    res.send(String(nDayYear));

};
