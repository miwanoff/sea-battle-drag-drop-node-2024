const gameOptionContainer = document.querySelector("#game-option");
const rotateButton = document.querySelector("#rotate");
const gameBoardsContainer = document.querySelector("#game-boards");
const startButton = document.querySelector("#start");
const turn = document.querySelector("#turn");
const info = document.querySelector("#info");

const singlePlayerButton = document.querySelector("#singlePlayerButton");
const multiPlayerButton = document.querySelector("#multiPlayerButton");

singlePlayerButton.addEventListener("click", startSinglePlayer);
multiPlayerButton.addEventListener("click", startMultiPlayer);

let currentPlayer = "user";
let gameMode = "";
let playerNum = 0;
let ready = false;
let enemyReady = false;
let allShipsPlaced = false;
let shotFired = -1;

let angle = 0;
let width = 10;
let gameOver = false;
let humanTurn = true;

let humanHits = [];
let enemyHits = [];

let enemySunkShips = [];
let humanSunkShips = [];

function startSinglePlayer() {
  gameMode = "singlePlayer";
  ships.forEach((ship) => generate("enemy", ship));
  startButton.addEventListener("click", startGameSingle);
}

function startMultiPlayer() {
  gameMode = "multiPlayer";
  const socket = io();

  // Отримати номер гравця
  socket.on("player-number", (num) => {
    if (num === -1) {
      info.innerHTML = "Sorry, the server is full";
      console.log("playerNum:" + playerNum);
    } else {
      playerNum = parseInt(num);
      if (playerNum === 1) currentPlayer = "enemy";

      console.log("playerNum:" + playerNum);
      // Отримати статус іншого гравця
      socket.emit("check-players");
    }
  });

  // Інший гравець приєднався або від'єднався
  socket.on("player-connection", (num) => {
    console.log(`Player number ${num} has connected or disconnected`);
    playerConnectedOrDisconnected(num);
  });

  // Готовність противника
  socket.on("enemy-ready", (num) => {
    enemyReady = true;
    playerReady(num);
    if (ready) playGameMulti(socket);
  });

  // Перевірка статусу гравця
  socket.on("check-players", (players) => {
    players.forEach((p, i) => {
      if (p.connected) playerConnectedOrDisconnected(i);
      if (p.ready) {
        playerReady(i);
        if (i !== playerNum) enemyReady = true;
      }
    });
  });

  // Отримано сповіщення про постріл
  socket.on("fire", (id) => {
    enemyGo(id);
    const square = document.querySelectorAll("#human div")[id];
    socket.emit("fire-reply", square.classList);
    playGameMulti(socket);
  });

    // Відповідь на отримане сповіщення про постріл
    socket.on("fire-reply", (classList) => {
      revealSquare(classList);
      playGameMulti(socket);
    });
  

  // Логіка для гри на двох гравців
  function playGameMulti(socket) {
    // if (isGameOver) return;
    if (!ready) {
      ready = true;
      socket.emit("player-ready");
      playerReady(playerNum);
      info.innerHTML = "Game started";
    }
  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`;
    document.querySelector(`${player} .ready span`).classList.toggle("green");
    if (enemyReady) {
      if (currentPlayer === "user") {
        turn.innerHTML = "Your Go";
      }
      if (currentPlayer === "enemy") {
        turn.innerHTML = "Enemy's Go";
      }
    }
  }

  // Кнопка Start Game для Multi Player
  startButton.addEventListener("click", () => {
    if (allShipsPlaced) playGameMulti(socket);
    else info.innerHTML = "Please place all ships";
  });

  // Прослуховування події пострілу
  document.querySelectorAll("#enemy div").forEach((block) => {
    block.addEventListener("click", () => {
      if (ready && enemyReady) {
        shotFired = parseInt(block.id.substring(6));
        console.log("shotFired" + shotFired);
        socket.emit("fire", shotFired);
      }
    });
  });
}

function playerConnectedOrDisconnected(num) {
  let player = `.p${parseInt(num) + 1}`;
  document.querySelector(`${player} .connected span`).classList.toggle("green");
  if (parseInt(num) === playerNum)
    document.querySelector(player).style.fontWeight = "bold";
}

function rotate() {
  const optionShips = Array.from(gameOptionContainer.children);
  angle = angle === 0 ? 90 : 0;
  optionShips.forEach(
    (optionShip) => (optionShip.style.transform = `rotate(${angle}deg)`)
  );
}

rotateButton.addEventListener("click", rotate);

function createBoard(color, user) {
  const gameBoard = document.createElement("div");
  gameBoard.classList.add("game-board");
  gameBoard.style.background = color;
  gameBoard.id = user;
  gameBoardsContainer.append(gameBoard);
  for (let i = 0; i < width * width; i++) {
    const block = document.createElement("div");
    block.classList.add("block");
    block.id = `block-${i}`;
    gameBoard.append(block);
  }
}

createBoard("tan", "human");
createBoard("pink", "enemy");

class Ship {
  constructor(name, length) {
    this.name = name;
    this.length = length;
  }
}

const ship1 = new Ship("deck-one", 1);
const ship2 = new Ship("deck-one", 1);
const ship3 = new Ship("deck-three", 3);
const ship4 = new Ship("deck-three", 3);

const ships = [ship1, ship2, ship3, ship4];

let isHorisontal = true;

let notDropped;

function getValidity(allBoardBlocks, isHorisontal, startIndex, ship) {
  let validStart = isHorisontal
    ? startIndex <= width * width - ship.length
      ? startIndex
      : width * width - ship.length
    : startIndex <= width * width - width * ship.length
    ? startIndex
    : width * width - width * ship.length;
  console.log(validStart, isHorisontal);
  let shipBlocks = [];

  for (let i = 0; i < ship.length; i++) {
    if (isHorisontal) {
      shipBlocks.push(allBoardBlocks[Number(validStart) + i]);
    } else {
      shipBlocks.push(allBoardBlocks[Number(validStart) + i * width]);
    }
  }

  const notTaken = shipBlocks.every(
    (shipBlocks) => !shipBlocks.classList.contains("taken")
  );

  return { shipBlocks, notTaken };
}

function generate(user, ship, startId) {
  const allBoardBlocks = document.querySelectorAll(`#${user} div`);
  let randomBoolean = Math.random() < 0.5;
  isHorisontal = user === "human" ? angle === 0 : randomBoolean;
  let randomStartIndex = Math.floor(Math.random() * width * width);
  let startIndex = startId ? startId.substr(6) : randomStartIndex;

  const { shipBlocks, notTaken } = getValidity(
    allBoardBlocks,
    isHorisontal,
    startIndex,
    ship
  );

  if (notTaken) {
    shipBlocks.forEach((shipBlock) => {
      shipBlock.classList.add(ship.name);
      shipBlock.classList.add("taken");
    });
  } else {
    if (user === "enemy") generate(user, ship);
    if (user === "human") notDropped = true;
  }

  console.log(shipBlocks);
}

let draggedShip;

const optionShips = Array.from(gameOptionContainer.children);

optionShips.forEach((optionShip) =>
  optionShip.addEventListener("dragstart", dragStart)
);

const allUserBlocks = document.querySelectorAll("#human div");
allUserBlocks.forEach((userBlock) => {
  userBlock.addEventListener("dragover", dragOver);
  userBlock.addEventListener("drop", dropShip);
});

function dragStart(event) {
  draggedShip = event.target;
  notDropped = false;
}

function dragOver(event) {
  event.preventDefault();
  const ship = ships[draggedShip.id.substr(5)];
  highlight(event.target.id.substr(6), ship);
}

function dropShip(event) {
  const startID = event.target.id;
  const ship = ships[draggedShip.id.substr(5)];
  generate("human", ship, startID);
  if (!notDropped) {
    draggedShip.remove();
    if (!gameOptionContainer.querySelector(".ship")) allShipsPlaced = true;
  }
}

function highlight(startIndex, ship) {
  const allBoardBlocks = document.querySelectorAll("#human div");
  let isHorisontal = angle === 0;
  const { shipBlocks, notTaken } = getValidity(
    allBoardBlocks,
    isHorisontal,
    startIndex,
    ship
  );
  if (notTaken) {
    shipBlocks.forEach((shipBlock) => {
      shipBlock.classList.add("hover");
      setTimeout(() => shipBlock.classList.remove("hover"), 500);
    });
  }
}

function enemyGo() {
  if (!gameOver) {
    turn.textContent = "enemys Go!";
    info.textContent = "enemys is thinking...";

    setTimeout(() => {
      let rand = Math.floor(Math.random() * width * width);
      const allBoardsBlocks = document.querySelectorAll("#human div");

      if (
        allBoardsBlocks[rand].classList.contains("taken") &&
        allBoardsBlocks[rand].classList.contains("boom")
      ) {
        enemyGo();
        return;
      } else if (
        allBoardsBlocks[rand].classList.contains("taken") &&
        !allBoardsBlocks[rand].classList.contains("boom")
      ) {
        allBoardsBlocks[rand].classList.add("boom");
        info.textContent = "enemy hit your ship!";
        let classes = Array.from(allBoardsBlocks[rand].classList);
        classes = classes.filter(
          (className) =>
            className !== "block" &&
            className !== "boom" &&
            className !== "taken"
        );
        enemyHits.push(...classes);
        console.log(enemyHits);
        checkScore("enemy", enemyHits, enemySunkShips);
      } else {
        info.textContent = "Nothing hit";
        allBoardsBlocks[rand].classList.add("empty");
      }
    }, 3000);
    setTimeout(() => {
      humanTurn = true;
      turn.textContent = "Your Go!";
      info.textContent = "Your turn!";
      const allBoardBlocks = document.querySelectorAll("#enemy div");
      allBoardBlocks.forEach((block) =>
        block.addEventListener("click", handleClick)
      );
    }, 6000);
  }
}

function handleClick(event) {
  if (!gameOver)
    if (event.target.classList.contains("taken")) {
      event.target.classList.add("boom");
      info.innerHTML = "You hit enemys ship!";
      let classes = Array.from(event.target.classList);
      classes = classes.filter(
        (className) =>
          className !== "block" && className !== "boom" && className !== "taken"
      );
      humanHits.push(...classes);
      console.log(humanHits);
      checkScore("human", humanHits, humanSunkShips);
    } else {
      info.textContent = "You missed it";
      event.target.classList.add("empty");
    }
  humanTurn = false;
  const allBoardBlocks = document.querySelectorAll("#enemy div");
  allBoardBlocks.forEach((block) => block.replaceWith(block.cloneNode(true)));
  setTimeout(enemyGo, 2000);
}

function startGameSingle() {
  if (gameOptionContainer.children.length != 0) {
    info.innerHTML = "Place all your ships!";
  } else {
    info.innerHTML = "Congrat!";

    const allBoardBlocks = document.querySelectorAll("#enemy div");
    allBoardBlocks.forEach((block) =>
      block.addEventListener("click", handleClick)
    );
  }
  humanTurn = true;
  turn.textContent = "You Go!";
  info.textContent = "The game has started!";
}

function checkScore(user, userHits, userSunkShips) {
  function checkShip(shipName, shipLength) {
    if (
      userHits.filter((storedShipName) => storedShipName === shipName)
        .length === shipLength
    ) {
      if (user === "human") {
        info.textContent = `You sunk the enemy's ${shipName}`;
        humanHits = userHits.filter(
          (storedShipName) => storedShipName != shipName
        );
      }
      if (user === "enemy") {
        info.textContent = `enemy sunk your ${shipName}`;
        enemyHits = userHits.filter(
          (storedShipName) => storedShipName != shipName
        );
      }
      userSunkShips.push(shipName);
    }
  }
  checkShip("deck-one", 1);
  checkShip("deck-three", 3);

  console.log("userHits", user, userHits);
  console.log("userSunkShips", user, userSunkShips);
  if (humanSunkShips.length === 4) {
    info.textContent = "You won!";
    gameOver = true;
  }
  if (enemySunkShips.length === 4) {
    info.textContent = "Enemy won!";
    gameOver = true;
  }
}
