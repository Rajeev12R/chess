const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "../public"))); // Adjust path for Vercel

app.get("/", (req, res) => {
    res.render("../views/index", { title: "Welcome to Chess Game" });
});

io.on("connection", (uniquesocket) => {
    console.log("A new user connected:", uniquesocket.id);

    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
    }

    uniquesocket.on("disconnect", () => {
        if (uniquesocket.id === players.white) delete players.white;
        else if (uniquesocket.id === players.black) delete players.black;

        if (!players.white && !players.black) {
            chess.reset();
            currentPlayer = "w";
            console.log("Both players left, resetting game...");
        }
    });

    uniquesocket.on("move", (move) => {
        try {
            if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
            if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

            const res = chess.move(move);
            if (res) {
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            } else {
                uniquesocket.emit("invalidMove", move);
            }
        } catch (error) {
            console.error("Move Error:", error.message);
        }
    });
});

// Export for Vercel
module.exports = server;
