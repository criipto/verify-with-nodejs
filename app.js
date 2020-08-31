const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const logger = require('morgan');
const debug = require('debug');
const path = require('path');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const successRouter = require('./routes/loginSuccess');
const expressSesssion = require('express-session');
const passport = require('passport');
const { Issuer, Strategy, custom  } = require('openid-client');


// setting up debugger
const log = debug('app:log');
log.log = console.log.bind(console);
const logOpenidClient = debug('openid-client:log');
logOpenidClient.log = console.log.bind(console);

const port = 3000;

const app = express();
app.use(logger('dev'));

app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use('/', indexRouter);


// set up custom openid-client hook to print out all of the http requests
custom.setHttpOptionsDefaults({
  hooks: {
    beforeRequest: [
      (options) => {
        logOpenidClient('Request details below:');
        logOpenidClient('--> %s %s', options.method.toUpperCase(), options.href);
        logOpenidClient('--> HEADERS %o', options.headers);
        if (options.body) {
          logOpenidClient('--> BODY %s', options.body);
        }
      },
    ],
    afterResponse: [
      (response) => {
        logOpenidClient('Response details below:');
        logOpenidClient('<-- %i FROM %s %s', response.statusCode, response.request.gotOptions.method.toUpperCase(), response.request.gotOptions.href);
        logOpenidClient('<-- HEADERS %o', response.headers);
        if (response.body) {
          logOpenidClient('<-- BODY %s', response.body);
        }
        return response;
      },
    ],
  },
});

// setup openid-client
Issuer.discover('https://nodejs-sample.criipto.id/.well-known/openid-configuration')
  .then(criiptoIssuer => {
    const client = new criiptoIssuer.Client({
      client_id: 'urn:criipto:nodejs:demo:1010',
      client_secret: 'j9wYVyD3zXZPMo3LTq/xSU/sMu9/shiFKpTHKfqAutM=',
      redirect_uris: [ 'http://localhost:3000/auth/callback' ],
      post_logout_redirect_uris: [ 'http://localhost:3000/logout/callback' ],
      token_endpoint_auth_method: 'client_secret_post'
    });

    // you can optionally set clock_tolerance to allow JWT to be valid
    // even if your system is not in sync with the server time
    client[custom.clock_tolerance] = 300 // seconds

    log('Criipto issuer successfully discovered.');

    app.use(
      expressSesssion({
        secret: 'Some secret you say?',
        resave: false,
        saveUninitialized: true
      })
    );
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
      'oidc',
      new Strategy({ client }, (tokenSet, userinfo, done) => {
        log('Token successfully retreived.');
        log(tokenSet);

        return done(null, tokenSet.claims());
      })
    );

    // handles serialization and deserialization of authenticated user
    passport.serializeUser(function(user, done) {
      log('Serializeing a user.');

      done(null, user);
    });
    passport.deserializeUser(function(user, done) {
      log('Deserializeing a user.');

      done(null, user);
    });

    // start authentication request
    app.get('/auth', (req, res, next) => {
      let loginMethod = req.query.loginmethod;

      log('Starting authentication.');
      log('Chosen method: ' + loginMethod);

      passport.authenticate('oidc', { acr_values: loginMethod })(req, res, next);
    });

    // authentication callback
    app.get('/auth/callback', (req, res, next) => {
      log('Callback received: ' + JSON.stringify(req.query));

      passport.authenticate('oidc', (err, user, info) => {
        if (err) {
          log(err);
          log(info);

          return next(err);
        }

        if (!user) {
          log('User was not authenticated.');
          log(info);

          return res.redirect('/');
        }
        
        req.logIn(user, err => {
          if (err) {
            log(err);
            // handle error
          } else {
            res.redirect('/success');
          }
        });
      })(req, res, next);
    });

    // error redirect
    app.get('/error', (req, res) => {
      //handle the error
      log('There was an error while processing the request.');
      res.redirect('/');
    });

    // handles what happens after successful login
    app.use('/success', successRouter);
    // user details protected route
    app.use('/users', usersRouter);

    // start logout request
    app.get('/logout', (req, res) => {
      log('Starting the logout request.');
      res.redirect(client.endSessionUrl());
    });

    // logout callback
    app.get('/logout/callback', (req, res) => {
      log('Log out successful.');
      // clears the persisted user from the local storage
      req.logout();
      // redirects the user to a public route
      res.redirect('/');
    });

    app.listen(port, () => console.log(`The app is listening on port ${port}!`));
  });