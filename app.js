const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const successRouter = require('./routes/loginSuccess');
const expressSesssion = require('express-session');
const passport = require('passport');
const { Issuer, Strategy } = require('openid-client');

const port = 3000;
const app = express();

let id_token;

app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use('/', indexRouter);

// setup openid-client
Issuer.discover('https://nodejs-sample.criipto.id')
  .then(criiptoIssuer => {
    const client = new criiptoIssuer.Client({
      client_id: 'urn:criipto:nodejs:demo:1010',
      client_secret: 'j9wYVyD3zXZPMo3LTq/xSU/sMu9/shiFKpTHKfqAutM=',
      redirect_uris: [ 'http://localhost:3000/auth/callback' ],
      post_logout_redirect_uris: [ 'http://localhost:3000/logout/callback' ],
      token_endpoint_auth_method: 'client_secret_post'
    });

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
        id_token = tokenSet.id_token;
        return done(null, tokenSet.claims());
      })
    );

    // handles serialization and deserialization of authenticated user
    passport.serializeUser(function(user, done) {
      done(null, user);
    });
    passport.deserializeUser(function(user, done) {
      done(null, user);
    });

    // start authentication request
    app.get('/auth', (req, res, next) => {
      let loginMethod = req.query.loginmethod;
      passport.authenticate('oidc', { acr_values: loginMethod })(req, res, next);
    });

    // authentication callback
    app.get('/auth/callback', (req, res, next) => {
      passport.authenticate('oidc', {
        successRedirect: '/success',
        failureRedirect: '/error'
      })(req, res, next);
    });

    // error redirect
    app.get('/error', (req, res) => {
      //handle the error
      console.log('There was an error while processing the request.');
      res.redirect('/');
    });

    // handles what happens after successful login
    app.use('/success', successRouter);
    // user details protected route
    app.use('/users', usersRouter);

    // start logout request
    app.get('/logout', (req, res) => {
      res.redirect(client.endSessionUrl({ id_token_hint: id_token }));
    });

    // logout callback
    app.get('/logout/callback', (req, res) => {
      // clears the persisted user from the local storage
      req.logout();
      // redirects the user to a public route
      res.redirect('/');
    });

    app.listen(port, () => console.log(`The app is listening on port ${port}!`));
  });