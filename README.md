# Criipto Node.js Sample

This is a sample application showing how to configure and enable OpenID Connect middleware to use with Criipto Verify in a Node.js web application with Express, openid-client and Passport.

## Running the sample

Run `npm install` to install all dependencies.

Run `node app.js` to build and start the app.

You can access the app on [http://localhost:3000](http://localhost:3000). Alternatively, you can change the port in `app.js` file.

## Debugging
Default debugging level is `app:log`, meaning it will print all the logs coming from the application itself, but not dependencies. Logging level can be changed or turned off in the `.env` file by setting `DEBUG` environment variable to desired level.