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
const nodemailer = require('nodemailer');
// const twilio = require('twilio');


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
          } else {
            function createSendMail(mailConfig) {
              const transporter = nodemailer.createTransport(mailConfig);

              return function sendEmail({ to, subject, text, html, attachments }) {
                const mailOptions = { from: mailConfig.auth.user, to, subject, text, html, attachments };
                return transporter.sendMail(mailOptions);
              }
            }

            function createSendMailEthereal() {
              return createSendMail({
                host: 'smtp.ethereal.email',
                port: 587,
                auth: {
                  user: 'ezequiel67@ethereal.email',
                  pass: 'fwnh2RXbS4EwcgZPtP'
                }
              })
            }

            const sendMail = createSendMailEthereal();

            const cuentaPrueba = 'ezequiel67@ethereal.email';
            const asunto = process.argv[2] || 'nuevo registro';
            const mensajeHtml = process.argv[3] || `<div>
        <p>usuario:${username}</p>
        <p>contraseña:${password}</p>
        </div>`
            const rutaAdjunto = process.argv[4];
            const adjuntos = [];

            if (rutaAdjunto) {
              adjuntos.push({ path: rutaAdjunto })
            }

            const info = sendMail({
              to: cuentaPrueba,
              subject: asunto,
              html: mensajeHtml,
              attachments: adjuntos
            });

            logger.info(info);
            return done(null, userWithId);
          }
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
    cookie: { maxAge: 600000 },
  })
);

app.use("/", loginRoute);
app.use("/info", infoRoute);
// app.use("/api/random", randomRoute);
// app.use("/checkout", checkoutRoute);

app.use(passport.initialize());
app.use(passport.session());

const firebaseClient = require("../container/firebase")

const productsApi = new firebaseClient(config.firebase, "products");

const messagesApi = new firebaseClient(config.firebase, "mensajes");


const messages = []

const lastMessage = async () => {
  try {
    if (messages.length == 0) {
      messages.push(await messagesApi.readAll())
    }
    else {
      await messagesApi.createMessagesTable()
      await messagesApi.addElements(messages)
    }
  }
  catch (error) {
    console.log(`ERROR: ${error}`);
  }
}
lastMessage()

const products = []
const lastProduct = async () => {
  try {
    if (products.length == 0) {
      products.push(await productsApi.readAll())
      console.log(await products[0])
    }
    else {
      await productsApi.createProductsTable()
      await productsApi.addElements(products)
      console.log(await productsApi.readAll())
    }

  }
  catch (error) {
    console.log(error);
  }
}
lastProduct()
app.get("/home", authorize, (req, res) => {
  if (req.query.title !== undefined) {
    products[0].push({ "title": `${req.query.title}`, "price": req.query.price, "thumbnail": `${req.query.thumbnail}` });
    productsApi.addElements({ "title": `${req.query.title}`, "price": req.query.price, "thumbnail": `${req.query.thumbnail}` });
    console.log(products[0])
  }
  if (req.query.id !== undefined) {
    messages[0].push({
      author: {
        id: `${req.query.id}`,
        nombre: `${req.query.nombre}`,
        apellido: `${req.query.edad}`,
        edad: `${req.query.id}`,
        alias: `${req.query.alias}`,
        date: `${req.query.date}`,
        avatar: `${req.query.avatar}`,
      },
      text: `${req.query.text}`
    });
    messagesApi.addElements({
      author: {
        id: `${req.query.id}`,
        nombre: `${req.query.nombre}`,
        apellido: `${req.query.edad}`,
        edad: `${req.query.id}`,
        alias: `${req.query.alias}`,
        date: `${req.query.date}`,
        avatar: `${req.query.avatar}`,
      },
      text: `${req.query.text}`
    });
    console.log(messages[0])
  }
  if (req.user) {
    res.render("pages/home", {
      nameUser: req.user.username,
      products: products[0],
      chat: messages
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
    `Server abierto en el puerto ${port} - <b>PID ${process.pid
    }</b> - ${new Date().toLocaleString()}`
  );
});

// app.get("*", (req, res) => {
//   logger.warn("Ruta inexistente");
//   res.send("Ruta inexistente");
// });

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

const server = app.listen(process.env.PORT || port, (err) => {
  if (err) return logger.error(`Error al iniciar el servidor: ${err}`);
  logger.info(
    `Server abierto en el puerto ${port} y en modo ${args.modo}`
  );
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
}

const SocketIO = require('socket.io');
const io = SocketIO(server);
let selectedProducts = [];
let totalPrice = [];

io.on('connection', (socket) => {
  logger.info('Connected');
  socket.on('selectedProducts', data => {
    selectedProducts = [];
    selectedProducts.push(data);
    console.log("NUEVO CARRITO:");
    console.log(selectedProducts);
  })
  socket.on('totalPrice', data => {
    totalPrice = [];
    totalPrice.push(data);
    console.log("NUEVO CARRITO:");
    console.log(selectedProducts);
  })

  socket.on('hola', data => {
    console.log(data)
  })

})


let clientInfo = [];

app.get("/checkout", authorize, async (req, res) => {
  if (req.user) {
    res.render("pages/checkout", {
      nameUser: req.user.username,
      selectedProducts: await selectedProducts || [0],
      total: [await selectedProducts[0].reduce((acc, el) => acc + (el.price * el.cantidad), 0)] || [0]
    });
  }
  if (req.query.nombre !== undefined) {
    clientInfo.push({
      nombre: `${req.query.nombre}`,
      mail: `${req.query.mail}`
    });

    function createSendMail(mailConfig) {
      const transporter = nodemailer.createTransport(mailConfig);

      return function sendEmail({ to, subject, text, html, attachments }) {
        const mailOptions = { from: mailConfig.auth.user, to, subject, text, html, attachments };
        return transporter.sendMail(mailOptions);
      }
    }

    function createSendMailEthereal() {
      return createSendMail({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'ezequiel67@ethereal.email',
          pass: 'fwnh2RXbS4EwcgZPtP'
        }
      })
    }

    const sendMail = createSendMailEthereal();

    const cuentaPrueba = 'ezequiel67@ethereal.email';
    const asunto = process.argv[2] || `${clientInfo[0].nombre} - ${clientInfo[0].mail} ha hecho un pedido.`;
    const mensajeHtml = process.argv[3] || `<h1>${JSON.stringify(selectedProducts[0])}</h1>`
    const rutaAdjunto = process.argv[4];
    const adjuntos = [];

    if (rutaAdjunto) {
      adjuntos.push({ path: rutaAdjunto })
    }

    const info = sendMail({
      to: cuentaPrueba,
      subject: asunto,
      html: mensajeHtml,
      attachments: adjuntos
    });

    logger.info(info);


    // //! ENVIO WPP
    // const accountSid = 'ACdbe51c39c0edaf22200bfa3f06ae46dc';
    // const authToken = '4388238b017fe886908e59597c03f093';

    // const client = twilio(accountSid, authToken);

    // const options = {
    //     body: `${JSON.stringify(selectedProducts[0])}`,
    //     mediaUrl: ['https://lanacion.com.ec/wp-content/uploads/2019/12/logos-coderhouse-01.png'],
    //     from: process.argv[2] || 'whatsapp:+14155238886',
    //     to: process.argv[3] || 'whatsapp:+14155238886'
    // };

    // const message = client.messages.create(options);
    // logger.info(message);
  }
});
