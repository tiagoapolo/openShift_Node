#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var bodyParser= require('body-parser')
var fs      = require('fs');
var mysql = require('mysql');
var passport = require('passport');
var bcrypt = require('bcrypt-nodejs');
var logger = require('./logger');
//************
// controllers
var dbModule = require('./dbModule');
var mainController = require('./controllers/mainController');
var deviceController = require('./controllers/deviceController');
var predictionController = require('./controllers/predictionController');
var logController = require('./controllers/logController');
var authDevicesController = require('./controllers/authDevices');
//************

var json = "";

/**
 *  Define the sample application.
 */
var boltApp = function() {

    //  Scope.
    var self = this;

    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        self.regexpUnio = new RegExp("UN[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]");

        self.connectionDB = dbModule.connectionDB;

        // self.connectionDB = mysql.createConnection ({
        //     host     : process.env.OPENSHIFT_MYSQL_DB_HOST,
        //     user     : process.env.OPENSHIFT_MYSQL_DB_USERNAME,
        //     password : process.env.OPENSHIFT_MYSQL_DB_PASSWORD ,
        //     port     : process.env.OPENSHIFT_MYSQL_DB_PORT,
        //     database : 'nodejs'
        //     //socketPath: '/var/lib/openshift/55738d52500446d7d500022b/mysql//socket/mysql.sock'
        // });

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };

    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send("<html><body><p>&copy;2015 uniosmart.com by UNiO Team</p></body></html>");
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {

        self.createRoutes();
        self.app = express();

        self.app.use(bodyParser.urlencoded({ extended: true }));
        self.app.use(bodyParser.json());
        self.app.use(passport.initialize());
        self.router = express.Router();

        self.app.get('/', self.routes['/']);

        self.router.route('/consumption')
                .post(authDevicesController.isAuthenticated, deviceController.postConsumption);

        self.router.route('/teste/consumption')
                .post(deviceController.postConsumptionTst);
		self.router.route('/teste/controle')
                .get(deviceController.postConsumptionTst2);
		self.router.route('/teste/controle/:status')
                .get(deviceController.setEmergencia);
        self.router.route('/datetime')
               .get(mainController.getTimeAndDate);

        self.router.route('/datetime/utc')
               .get(mainController.getTimeAndDateUTC);

        self.router.route('/dayofyear/:date')
               .get(mainController.getDayOfYear);

        self.router.route('/log/:date')
               .get(authDevicesController.isAuthenticated, logController.getLogWithId);

        self.router.route('/log')
               .get(authDevicesController.isAuthenticated, logController.getLogs);

        self.router.route('/thunder/:device')
               .get(authDevicesController.isAuthenticated, deviceController.getDeviceInfo);

        self.router.route('/thunder/ouimeteo/predictionbyhour/train')
               .get(authDevicesController.isAuthenticated, predictionController.getTrainPredictionByHour);

        self.router.route('/thunder/nonmeteo/predictionbyday/train')
               .get(authDevicesController.isAuthenticated, predictionController.getTrainPredictionByDay);


        /**
         * @api {post} /bolt/v001/thunder/kw/predict/total Request total daily consumption Prediction per Company and Branch
         * @apiName TotalDailyConsumption
         * @apiGroup Prediction
         * @apiPermission Registered User.
         * @apiParam {String} cnpj.
         * @apiParam {Number} branch.
         * @apiParam {String} date.
         *
         * @apiSuccess (200) {String} firstname Firstname of the User.
        */
        // Function: Gets result from branch's whole daily consumpt prediction
        // POST for encrypting sensitive data.
        self.router.route('/thunder/kw/predict/total')
               .post(authDevicesController.isAuthenticated, predictionController.postPredictionByDay);

        // self.router.route('/thunder/kw/predict/:device/:date/:hour')
              //  .get(authDevicesController.isAuthenticated, predictionController.getPredictionByHour);

        /**
         * @api {get} /bolt/v001/thunder/predict/status/:model Check Model Status
         * @apiName ModelStatus
         * @apiGroup Prediction
         * @apiPermission Registered User.
         * @apiParam {String} modelName.
         *
         * @apiSuccess (200) {String} Model Status.
        */
        self.router.route('/thunder/predict/status/:model')
               .get(predictionController.getPredictionStatus);


    };

    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {

        self.setupVariables();
        self.setupTerminationHandlers();

        self.connectionDB.connect(function(err){
          if(!err) {
            console.log("Database is connected ... nn");
          } else {
            console.log("Error connecting database ... nn");
          }
        });

        self.initializeServer();

    };

    /**
     *  Start the server (starts up the sample application).
     */

    self.start = function() {

        self.app.use('/bolt/v001', self.router);
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */


/**
 *  main():  Main code.
 */
var thor = new boltApp();
thor.initialize();
thor.start();
