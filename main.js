const express = require('express');
const fs = require('fs');

const { Server: HttpServer } = require('http');
const { Server: IOServer } = require('socket.io');

const app = express()
const httpServer = new HttpServer(app)
const io = new IOServer(httpServer)

app.use(express.static('./public'));

app.get('/', (req, res) => {
    res.sendFile('./index.html', { root: __dirname });
});

const config = require("./options/config");

const sqlClient = require("./container/sql");
const firebaseClient = require("./container/firebase")
const mongoClient = require("./container/mongo")

// MENSAJES
// const messagesApi = new sqlClient(config.sqlite3, "messages");
// const messagesApi = new mongoClient(config.mongooseMessages,"messages");
const messagesApi = new firebaseClient(config.firebase,"messages");

// PRODUCTOS
// const productsApi = new sqlClient(config.mariaDB, "products");
// const productsApi = new mongoClient(config.mongooseProducts,"products");
const productsApi = new firebaseClient(config.firebase,"products");

// sqlite

// const messages = require('./api/messages');
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

// mariaDB

// const products = require('./api/productos');
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

// metodos postman

//leer los productos
app.get("/productos", async function (req, res) {
    res.json(await productsApi.readAll());
});

//Añadir producto
app.post("/productos", async function (req, res) {
    res.json(await productsApi.addElements(req.body));
});

//Eliminar un producto
app.delete("/productos/:id", async function (req, res) {
    const id = req.params.id;
    res.json(await productosApi.deleteProduct(id));
});

// io


io.on('connection', async (socket) => {
    console.log('Usuario conectado');

   // productos
   socket.emit('products', products);    

   socket.on('newProduct', product =>{
       products[0].push(product);
       io.sockets.emit('products', products)
       productsApi.addElements(product)
   })
   //Envio de mensaje
   socket.emit('messages', messages[0]);

   socket.on('newMessage', data =>{
       // messages.push({ socketid: socket.id , message: data });
       messages[0].push(data);
       io.sockets.emit('messages', messages[0]);
       messagesApi.addElements(data);
   });
});

// uso de middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

httpServer.listen(8080, () => console.log('SERVER ON'));