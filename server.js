const express = require("express");
const path = require("path");
const http = require("http");
const PORT = process.env.PORT || 3000;
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, "public")));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

let connections = [null, null];

//Обробка запиту на підключення до сокета від веб-клієнта
io.on("connection", (socket) => {
  console.log("New WS Connection");
  // Знайдемо  номер для гравця
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] == null) {
      playerIndex = i;
      break;
    }
  }



  // Сповіщаємо гравця, що приєднався, про його номер
  socket.emit("player-number", playerIndex);
 
 // Ігноруємо третього гравця
  if (playerIndex === -1) return;
  
  console.log(`player ${playerIndex} has connected`);

  connections[playerIndex] = false;

  // Оповістити всіх, який номер гравця щойно підключився
  socket.broadcast.emit("player-connection", playerIndex);

});
