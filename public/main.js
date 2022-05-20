const socket = io.connect();

// agregar producto
function addProduct(e) {
  event.preventDefault();
  const product = {
    title: document.getElementById('title').value,
    price: document.getElementById('price').value,
    thumbnail: document.getElementById('thumbnail').value,
  };
  socket.emit('newProduct', product);
  alert("Has agregado un producto al carrito");
  return false;
}

// tabla de productos
function tableProducts(products) {
  return fetch('./partials/productsTable.hbs')
    .then(ans => ans.text())
    .then(plantilla => {
      const temp = Handlebars.compile(plantilla);
      const htmlTable = temp({ products });
      document.getElementById('products').innerHTML = htmlTable;
      return htmlTable;
    })
}

socket.on('products', products => {
  tableProducts(products[0]);
  console.log(products[0])
});

// render de mensajes
function render(messages) {
  const messagesHtml = messages.map((message, index) => {
    return (`<div>
      <p class="author">${message.author} <span class="date">[${message.date}]</span>: <span class="text">${message.text}</span> </p>
              </div>`)
  }).join(" ");
  document.getElementById('messages').innerHTML = messagesHtml;
}

function addMessage(e) {
  event.preventDefault();
  const message = {
    author: document.getElementById('username').value,
    text: document.getElementById('text').value,
    date: new Date().toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short"
    })
  };
  socket.emit('newMessage', message);
  return false;
}

socket.on('messages', data => {
  render(data);
});