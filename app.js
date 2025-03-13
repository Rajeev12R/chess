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
        origin: "*", // Allow any frontend to connect
        methods: ["GET", "POST"]
    }
});

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.use(cors()); // Enable CORS for Render
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Adjusted path for Render
app.use(express.static(path.join(__dirname, "public"))); // Adjusted path

app.get("/", (req, res) => {
    res.render("index", { title: "Welcome to Chess Game" });
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

// Use PORT from environment variables (Render sets it automatically)
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
