const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const WebSocket = require("ws");

const PORT = 3000;

let state = {
  home: 0,
  guest: 0,

  homeName: "DESPRO",
  guestName: "INFORMATIKA",

  period: 1,
  game: 600,
  shot: 24,

  homeBonus: false,
  guestBonus: false,
  poss: "home",

  gameRun: false,
  shotRun: false
};

const clients = new Set();

const server = http.createServer((req, res) => {
  let file = req.url === "/" ? "/scoreboard.html" : req.url;

  if (file === "/controller") {
    file = "/controller.html";
  }

  const filePath = path.join(__dirname, file);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);

    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8"
    };

    res.writeHead(200, {
      "Content-Type": types[ext] || "text/plain"
    });

    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

function broadcast() {
  const msg = JSON.stringify({
    type: "state",
    state
  });

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function applyAction(a) {
  switch (a.type) {

    // =========================
    // SCORE
    // =========================
    case "score":
      if (a.team === "home" || a.team === "guest") {
        state[a.team] = Math.max(
          0,
          state[a.team] + a.amount
        );
      }
      break;

    // =========================
    // NAMA TIM
    // =========================
    case "teamName":
      if (a.team === "home") {
        state.homeName = String(a.value || "HOME").trim().slice(0, 20);
      }

      if (a.team === "guest") {
        state.guestName = String(a.value || "GUEST").trim().slice(0, 20);
      }

      break;

    // =========================
    // POSSESSION
    // =========================
    case "poss":
      if (a.team === "home" || a.team === "guest") {
        state.poss = a.team;
      }
      break;

    // =========================
    // BONUS
    // =========================
    case "bonus":
      if (a.team === "home") {
        state.homeBonus = !!a.value;
      }

      if (a.team === "guest") {
        state.guestBonus = !!a.value;
      }

      break;

    // =========================
    // PERIOD
    // =========================
    case "period":
      state.period = Math.max(
        1,
        Math.min(9, state.period + a.amount)
      );
      break;

    case "periodSet":
      state.period = Math.max(
        1,
        Math.min(9, a.value)
      );
      break;

    // =========================
    // GAME CLOCK
    // =========================
    case "gameSet":
      state.game = Math.max(0, a.value);
      state.gameRun = false;
      break;

    case "gameAdd":
      state.game = Math.max(
        0,
        state.game + a.amount
      );
      break;

    case "gameToggle":
      if (state.game > 0) {
        state.gameRun = !state.gameRun;
      }
      break;

    // =========================
    // SHOT CLOCK
    // =========================
    case "shotSet":
      state.shot = Math.max(
        0,
        Math.min(99, a.value)
      );

      state.shotRun = false;
      break;

    case "shotAdd":
      state.shot = Math.max(
        0,
        Math.min(99, state.shot + a.amount)
      );
      break;

    case "shotToggle":
      if (state.shot > 0) {
        state.shotRun = !state.shotRun;
      }
      break;

    // =========================
    // RESET PERTANDINGAN
    // Nama tim TIDAK di-reset
    // =========================
    case "reset":
      state.home = 0;
      state.guest = 0;

      state.period = 1;
      state.game = 600;
      state.shot = 24;

      state.homeBonus = false;
      state.guestBonus = false;

      state.poss = "home";

      state.gameRun = false;
      state.shotRun = false;

      break;
  }

  broadcast();
}

// =========================
// WEBSOCKET
// =========================

wss.on("connection", ws => {

  clients.add(ws);

  ws.send(
    JSON.stringify({
      type: "state",
      state
    })
  );

  ws.on("message", raw => {
    try {
      const action = JSON.parse(raw.toString());
      applyAction(action);
    } catch (err) {
      console.log("Invalid action");
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

// =========================
// TIMER
// =========================

setInterval(() => {

  let changed = false;

  // GAME CLOCK
  if (state.gameRun) {

    if (state.game > 0) {
      state.game--;
      changed = true;
    }

    if (state.game <= 0) {
      state.game = 0;
      state.gameRun = false;
    }
  }

  // SHOT CLOCK
  if (state.shotRun) {

    if (state.shot > 0) {
      state.shot--;
      changed = true;
    }

    if (state.shot <= 0) {
      state.shot = 0;
      state.shotRun = false;
    }
  }

  if (changed) {
    broadcast();
  }

}, 1000);

// =========================
// SERVER
// =========================

server.listen(PORT, "0.0.0.0", () => {

  console.log(
    `Scoreboard: http://localhost:${PORT}`
  );

  console.log(
    "Controller: http://<IP-KOMPUTER>:" +
    PORT +
    "/controller"
  );

  console.log("IP komputer:");

  for (const list of Object.values(
    os.networkInterfaces()
  )) {

    for (const item of list || []) {

      if (
        item.family === "IPv4" &&
        !item.internal
      ) {
        console.log("  " + item.address);
      }

    }
  }
});