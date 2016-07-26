// Load required packages
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var bcrypt = require('bcrypt-nodejs');
var logger = require('../logger');
var dbModule = require('../dbModule');
var connectionDB = dbModule.connectionDB;
var regexpUnio = new RegExp("UN[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]");

var verifyToken = function (password, token, cb){
   bcrypt.compare(password, token, function(err, isMatch) {
     if (err){
       logger.logThis(err);
       return cb(err,false);
     }
     cb(null, isMatch);
  });
};


passport.use(new BasicStrategy(

  function(username, password, callback) {

    if(!regexpUnio.test(username)){
      return callback(null, false);
    }

    var sn = parseInt(username.slice(2, username.length)).toString();

    connectionDB.query('SELECT id_devices FROM devices WHERE id_devices = ?', [sn], function(err, user) {

      // No user found with that username
      if (user[0] == null) {
        logger.logThis("No user found on DB");
        return callback(null, false);
      }

      // Make sure the password is correct
      connectionDB.query('SELECT token_devices FROM devices WHERE id_devices = ?', [sn], function(err, token) {
        if (err) {
          logger.logThis(err);
          return callback(null, false);
         }

         if(token[0].token_devices == null) {
           return callback(null, false);
         } else {
           //Password did not match
           verifyToken(password, token[0].token_devices, function (err, isMatch){
              if(!isMatch){
                logger.logThis("No access permission for user ");
                return callback(null, false);
              }
              else {
                return callback(null, user[0]);
              }
           });
         }
      });
    });
  }
));

exports.isAuthenticated = passport.authenticate('basic', { session : false });
