const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socket(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Multiplayer Chess Game" });
});

// Route for creating a game link
app.get("/create-game", (req, res) => {
    const gameId = Math.random().toString(36).substr(2, 6);
    res.redirect(`/game/${gameId}`);
});

// Route to join a specific game
app.get("/game/:id", (req, res) => {
    res.render("index", { gameId: req.params.id });
});

io.on("connection", (socket) => {
    console.log("A new user connected:", socket.id);

    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");
    } else {
        socket.emit("spectatorRole");
    }

    socket.on("disconnect", () => {
        if (socket.id === players.white) delete players.white;
        else if (socket.id === players.black) delete players.black;

        if (!players.white && !players.black) {
            chess.reset();
            currentPlayer = "w";
            console.log("Both players left, resetting game...");
        }
    });

    socket.on("move", (move) => {
        try {
            if (chess.turn() === "w" && socket.id !== players.white) return;
            if (chess.turn() === "b" && socket.id !== players.black) return;

            const res = chess.move(move);
            if (res) {
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            } else {
                socket.emit("invalidMove", move);
            }
        } catch (error) {
            console.error("Move Error:", error.message);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
