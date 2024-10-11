const express = require("express");
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const passport = require("passport");
const flash = require("connect-flash");
require("express-async-errors");
require("dotenv").config();

const app = express();

app.use(helmet());
app.use(xss());

const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 100,
    message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

let mongoURL = process.env.MONGO_URI;
if (process.env.NODE_ENV == "test") {
  mongoURL = process.env.MONGO_URI_TEST;
}
const store = new MongoDBStore({
    uri: mongoURL,
    collection: "mySessions",
});

store.on("error", (error) => {
    console.error(error);
});

const sessionParams = {
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    store: store,
    cookie: { secure: false, sameSite: "strict" },
};

const passportInit = require("./passport/passportInit");
passportInit();
app.use(session(sessionParams));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

const csrf = require('csrf');
const csrfProtection = new csrf();

app.use((req, res, next) => {
    res.locals.csrfToken = csrfProtection.create(req.session.id);
    next();
});

app.use((req, res, next) => {
    if (req.path == "/multiply") {
      res.set("Content-Type", "application/json");
    } else {
      res.set("Content-Type", "text/html");
    }
    next();
  });

app.use((req, res, next) => {
    if (req.method === 'POST') {
        const token = req.body._csrf;
        if (!csrfProtection.verify(req.session.id, token)) {
            return res.status(403).send('Invalid CSRF token');
        }
    }
    next();
});

if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionParams.cookie.secure = true;
}

app.use(require("./middleware/storeLocals"));
app.get("/", (req, res) => {
  res.render("index");
});

app.use((req, res, next) => {
    res.locals.info = req.flash("info");
    res.locals.errors = req.flash("error");
    next();
});

app.get("/", (req, res) => {
    res.render("index");
});

app.use("/sessions", require("./routes/sessionRoutes"));

const secretWordRouter = require("./routes/secretWord");
const jobsRouter = require("./routes/jobs");
const auth = require("./middleware/auth");
app.use("/secretWord", auth, secretWordRouter);
app.use("/jobs", auth, jobsRouter);

app.get("/multiply", (req, res) => {
    const result = req.query.first * req.query.second;
    if (result.isNaN) {
      result = "NaN";
    } else if (result == null) {
      result = "null";
    }
    res.json({ result: result });
  });

app.use((req, res) => {
    res.status(404).send(`That page (${req.url}) was not found.`);
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send(err.message);
});

const port = process.env.PORT || 3000;
const start = () => {
  try {
    require("./db/connect")(mongoURL);
    return app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`),
    );
  } catch (error) {
    console.log(error);
  }
};

start();

module.exports = { app };