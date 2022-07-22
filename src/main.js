const express = require('express');
const app = express();
const yargs = require("yargs/yargs")(process.argv.slice(2));
const config = require("./options/config");
const cluster = require("cluster");
const numCpu = require("os").cpus().length;
const bcrypt = require("bcrypt");
const authorize = require("./auth/index");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const advancedOptions = { useNewUrlParser: true, useUnifiedTopology: true };
const User = require("./models/Users.js");
const logger = require("./utils/logger");

const passport = require("passport");
const LocalStrategy = require("passport-local");

const controllersdb = require("./controllers/controllerDb.js");

const loginRoute = require("./routes/login");
const infoRoute = require("./routes/info");
// const randomRoute = require("./routes/random");

passport.use(
  "local-login",
  new LocalStrategy((username, password, done) => {
    User.findOne({ username }, (err, user) => {
      if (err) return done(err);
      if (!user) {
        logger.error("Usuario inexistente");
        return done(null, false);
      }
      if (!isValidPassword(user, password)) {
        logger.error("Contraseña incorrecta");
        return done(null, false);
      }
      return done(null, user);
    }).clone();
  })
);

passport.use(
  "local-signup",
  new LocalStrategy(
    {
      passReqToCallback: true,
    },
    async (req, username, password, done) => {
      await User.findOne({ username: username }, (err, user) => {
        if (err) {
          return done(err);
        }
        if (user) {
          logger.error(`El nombre de usuario ${username} ya está tomado`);
          return done(null, false);
        }
        const newUser = {
          username: req.body.username,
          password: createHash(password),
        };
        User.create(newUser, (err, userWithId) => {
          if (err) {
            return done(err);
          }
          return done(null, userWithId);
        });
      }).clone();
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

function isValidPassword(user, password) {
  logger.info(`Comparando tu contraseña: ${password} con: ${user.password}`);

  return bcrypt.compareSync(password, user.password);
}

function createHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
}

app.set("views", "./views");
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(process.cwd() + "/public"));

app.use(
  session({
    store: MongoStore.create({
      mongoUrl:
        'mongodb+srv://aleexz:caca12345@cluster0.wohmi.mongodb.net/process?retryWrites=true&w=majority',
      mongoOptions: advancedOptions,
    }),
    secret: "secreto",
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);

app.use("/", loginRoute);
app.use("/info", infoRoute);
// app.use("/api/random", randomRoute);

app.use(passport.initialize());
app.use(passport.session());


app.get("/home", authorize, (req, res) => {
  if (req.user) {
    res.render("pages/home", {
      nameUser: req.user.username,
    });
  }
});


app.post("/logout", authorize, (req, res) => {
  if (req.user) {
    nameUser = req.user.username;
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
    });
    res.render("pages/logout", { nameUser });
  }
});

app.get("/api/random", (req, res) => {
  res.send(
      `Server abierto en el puerto ${port} - <b>PID ${
          process.pid
      }</b> - ${new Date().toLocaleString()}`
  );
});

app.get("*", (req, res) => {
  logger.warn("Ruta inexistente");
  res.send("Ruta inexistente");
});

const args = yargs
  .default({
      puerto: parseInt(process.argv[2]) || 8080,
      modo: "FORK",
  })
  .alias({ p: "puerto", m: "modo" }).argv;
const port = args.puerto || process.argv[2] || 8080;

controllersdb.connectDb(config.URL_MONGODB, (err) => {
  if (err) return logger.error("db error");
  logger.info("Base de datos conectada");
});

if (cluster.isMaster && args.modo === "CLUSTER") {
  for (let i = 0; i < numCpu; i++) {
      cluster.fork();
      logger.info(
          `El worker ${i + 1} con PID ${process.pid} se ha añadido\n`
      );
  }
  cluster.on("exit", (worker, code) => {
      logger.info(
          `Se ha eliminado el worker ${worker.process.pid}.`
      );
      cluster.fork();
      logger.info(
          `Nuevo worker con PID: ${worker.process.pid}.`
      );
  });
} else {
  app.listen(process.env.PORT || port , (err) => {
      if (err) return logger.error(`Server error: ${err}`);
      logger.info(
          `Server abierto en el puerto ${port} y en modo ${args.modo}\n`
      );
  });
}