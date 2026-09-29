const http = require("http");
const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");
const { Redis } = require("@upstash/redis");

const app = express();

const redis = Redis.fromEnv();

const STATE_KEY = "basketball:state";

const defaultState = {
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

// =========================
// REDIS
// =========================

async function getState() {
  const saved = await redis.get(STATE_KEY);

  if (!saved) {
    await redis.set(STATE_KEY, defaultState);
    return { ...defaultState };
  }

  return {
    ...defaultState,
    ...saved
  };
}

async function saveState(state) {
  await redis.set(STATE_KEY, state);
}

// =========================
// HTTP SERVER
// =========================

const server = http.createServer(app);

// =========================
// WEBSOCKET
// =========================

const wss = new WebSocketServer({
  server
});

const clients = new Set();

async function broadcast() {
  const state = await getState();

  const message = JSON.stringify({
    type: "state",
    state
  });

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

// =========================
// ACTION
// =========================

async function applyAction(a) {
  const state = await getState();

  switch (a.type) {

    // =====================
    // SCORE
    // =====================

    case "score":

      if (a.team === "home" || a.team === "guest") {

        state[a.team] = Math.max(
          0,
          state[a.team] + Number(a.amount || 0)
        );

      }

      break;


    // =====================
    // NAMA TIM
    // =====================

    case "teamName":

      if (a.team === "home") {

        state.homeName =
          String(a.value || "HOME")
            .trim()
            .slice(0, 20);

      }

      if (a.team === "guest") {

        state.guestName =
          String(a.value || "GUEST")
            .trim()
            .slice(0, 20);

      }

      break;


    // =====================
    // POSSESSION
    // =====================

    case "poss":

      if (
        a.team === "home" ||
        a.team === "guest"
      ) {
        state.poss = a.team;
      }

      break;


    // =====================
    // BONUS
    // =====================

    case "bonus":

      if (a.team === "home") {
        state.homeBonus = !!a.value;
      }

      if (a.team === "guest") {
        state.guestBonus = !!a.value;
      }

      break;


    // =====================
    // PERIOD
    // =====================

    case "period":

      state.period = Math.max(
        1,
        Math.min(
          9,
          state.period + Number(a.amount || 0)
        )
      );

      break;


    case "periodSet":

      state.period = Math.max(
        1,
        Math.min(
          9,
          Number(a.value)
        )
      );

      break;


    // =====================
    // GAME CLOCK
    // =====================

    case "gameSet":

      state.game = Math.max(
        0,
        Number(a.value)
      );

      state.gameRun = false;

      break;


    case "gameAdd":

      state.game = Math.max(
        0,
        state.game + Number(a.amount || 0)
      );

      break;


    case "gameToggle":

      if (state.game > 0) {
        state.gameRun = !state.gameRun;
      }

      break;


    // =====================
    // SHOT CLOCK
    // =====================

    case "shotSet":

      state.shot = Math.max(
        0,
        Math.min(
          99,
          Number(a.value)
        )
      );

      state.shotRun = false;

      break;


    case "shotAdd":

      state.shot = Math.max(
        0,
        Math.min(
          99,
          state.shot + Number(a.amount || 0)
        )
      );

      break;


    case "shotToggle":

      if (state.shot > 0) {
        state.shotRun = !state.shotRun;
      }

      break;


    // =====================
    // RESET
    // =====================

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

      // Nama tim TIDAK direset

      break;
  }

  await saveState(state);

  await broadcast();
}


// =========================
// CONNECTION
// =========================

wss.on("connection", async (ws) => {

  clients.add(ws);

  try {

    const state = await getState();

    ws.send(
      JSON.stringify({
        type: "state",
        state
      })
    );

  } catch (error) {

    console.error(
      "Gagal mengambil state:",
      error
    );

  }


  ws.on("message", async (raw) => {

    try {

      const action =
        JSON.parse(raw.toString());

      await applyAction(action);

    } catch (error) {

      console.error(
        "Invalid action:",
        error
      );

    }

  });


  ws.on("close", () => {

    clients.delete(ws);

  });

});


// =========================
// HEALTH CHECK
// =========================

app.get("/", async (req, res) => {

  res.sendFile(
    "scoreboard.html",
    {
      root: "public"
    }
  );

});


app.get("/controller", async (req, res) => {

  res.sendFile(
    "controller.html",
    {
      root: "public"
    }
  );

});


app.get("/api/health", (req, res) => {

  res.json({
    status: "OK",
    message: "Basketball scoreboard server"
  });

});


// =========================
// EXPORT
// =========================

module.exports = server;