const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const passport = require("passport");
const flash = require("connect-flash");
require("express-async-errors");
require("dotenv").config();

const app = express();

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

if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionParams.cookie.secure = true;
}

const passportInit = require("./passport/passportInit");
passportInit();
app.use(session(sessionParams));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(require("./middleware/storeLocals"));
app.get("/", (req, res) => {
  res.render("index");
});
//app.use("/sessions", require("./routes/sessionRoutes"));

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
const auth = require("./middleware/auth");
app.use("/secretWord", auth, secretWordRouter);

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