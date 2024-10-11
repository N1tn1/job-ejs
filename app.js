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

const url = process.env.MONGO_URI;
const store = new MongoDBStore({
    uri: url,
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

app.use((req, res) => {
    res.status(404).send(`That page (${req.url}) was not found.`);
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send(err.message);
});

const port = process.env.PORT || 3000;

const start = async () => {
    try {
        await require("./db/connect")(process.env.MONGO_URI);
        app.listen(port, () =>
            console.log(`Server is listening on port ${port}...`)
        );
    } catch (error) {
        console.error(error);
    }
};

start();