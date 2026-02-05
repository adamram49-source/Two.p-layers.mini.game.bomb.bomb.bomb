import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDbVZzj32b-M4MYHxSfs778kdAoFIHH36Q",
  authDomain: "players-bomb-game.firebaseapp.com",
  projectId: "players-bomb-game",
  storageBucket: "players-bomb-game.firebasestorage.app",
  messagingSenderId: "333406815581",
  appId: "1:333406815581:web:999afa655a8752c2de54b4",
  measurementId: "G-XEX1YF9D2W"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let gameCode = null;
let playerId = Math.random().toString(36).substring(2, 9);
let playerSide = null;
let bombs = [];
let hearts = 3;

/* ---------- יצירת משחק ---------- */
createGame.onclick = () => {
  gameCode = Math.random().toString(36).substring(2, 6);
  set(ref(db, "games/" + gameCode), {
    players: {},
    state: "waiting"
  });

  home.classList.add("hidden");
  waiting.classList.remove("hidden");
  gameCodeText.innerText = gameCode;

  listenGame();
};

/* ---------- הצטרפות ---------- */
joinGame.onclick = () => {
  gameCode = joinCode.value;
  listenGame();
};

/* ---------- האזנה ---------- */
function listenGame() {
  onValue(ref(db, "games/" + gameCode), snap => {
    const game = snap.val();
    if (!game) return;

    const players = game.players || {};
    const ids = Object.keys(players);

    if (!ids.includes(playerId) && ids.length < 2) {
      playerSide = ids.length === 0 ? "p1" : "p2";
      set(ref(db, `games/${gameCode}/players/${playerId}`), {
        side: playerSide,
        name: "",
        hearts: 3,
        bombs: [],
        ready: false
      });
    }

    if (ids.length === 2 && game.state === "waiting") {
      update(ref(db, "games/" + gameCode), { state: "naming" });
    }

    if (game.state === "naming") showNameScreen(game);
    if (game.state === "bombs") bombPhase(game);
    if (game.state === "turns") turnPhase(game);
  });
}

/* ---------- שמות ---------- */
function showNameScreen(game) {
  home.classList.add("hidden");
  waiting.classList.add("hidden");
  nameScreen.classList.remove("hidden");

  saveName.onclick = () => {
    update(ref(db, `games/${gameCode}/players/${playerId}`), {
      name: playerNameInput.value,
      ready: true
    });
    waitingName.classList.remove("hidden");
  };

  const players = Object.values(game.players);
  if (players.length === 2 && players.every(p => p.ready)) {
    update(ref(db, "games/" + gameCode), { state: "bombs", turn: "p1" });
  }
}

/* ---------- לוח ---------- */
function drawBoard(clickHandler, enemyClick = false) {
  board.innerHTML = "";
  for (let i = 0; i < 18; i++) {
    const c = document.createElement("div");
    c.className = "circle";
    if (enemyClick) c.classList.add("enemy");
    c.onclick = () => clickHandler(i, c);
    board.appendChild(c);
  }
}

/* ---------- בחירת פצצות ---------- */
function bombPhase(game) {
  nameScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  const me = game.players[playerId];
  const turnName = Object.values(game.players).find(p => p.side === game.turn).name;
  turnText.innerText = `תור ${turnName} לבחור פצצות`;

  if (me.side !== game.turn || me.bombs.length === 3) return;

  drawBoard((i, el) => {
    if (bombs.includes(i) || bombs.length >= 3) return;
    bombs.push(i);
    el.innerText = "💣";

    update(ref(db, `games/${gameCode}/players/${playerId}`), { bombs });

    if (bombs.length === 3) {
      const next = game.turn === "p1" ? "p2" : "p1";
      update(ref(db, "games/" + gameCode), { turn: next });

      const allReady = Object.values(game.players).every(p => p.bombs?.length === 3);
      if (allReady) update(ref(db, "games/" + gameCode), { state: "turns", turn: "p1" });
    }
  });
}

/* ---------- תורות ירי ---------- */
function turnPhase(game) {
  const me = game.players[playerId];
  const enemyId = Object.keys(game.players).find(id => id !== playerId);
  const enemy = game.players[enemyId];

  turnText.innerText = `תור ${Object.values(game.players).find(p => p.side === game.turn).name} לבחור`;

  heartsDiv();

  if (me.side !== game.turn) return;

  drawBoard((i, el) => {
    if (el.classList.contains("dead")) return;

    if (enemy.bombs.includes(i)) {
      el.innerText = "💥";
      hearts--;
      update(ref(db, `games/${gameCode}/players/${playerId}`), { hearts });
      alert("BOOM!!!");
    } else {
      el.innerText = "✅";
      alert("SAVE!!!");
    }

    el.classList.add("dead");

    if (hearts <= 0) {
      alert("הפסדת!");
      location.reload();
      return;
    }

    const next = game.turn === "p1" ? "p2" : "p1";
    update(ref(db, "games/" + gameCode), { turn: next });
  }, true);
}

/* ---------- לבבות ---------- */
function heartsDiv() {
  hearts.innerHTML = "❤️".repeat(hearts);
}
