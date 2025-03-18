const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Frontend URL
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Store active rooms
const rooms = new Map();

// Configure CORS for Express
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
    res.render("index", { title: "Multiplayer Chess Game" });
});

// Generate a random room ID
const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Function to get legal moves for a square
const getLegalMoves = (game, square) => {
    const moves = game.moves({ square, verbose: true });
    return moves.map(move => ({
        from: move.from,
        to: move.to,
        piece: move.piece,
        color: move.color,
        captured: move.captured,
        promotion: move.promotion
    }));
};

// Create a new room
app.post("/api/rooms", (req, res) => {
    const roomId = generateRoomId();
    const game = new Chess();
    // Ensure white starts first
    game.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

    rooms.set(roomId, {
        game: game,
        players: [],
        gameStatus: "waiting"
    });
    console.log(`Created new room: ${roomId}`);
    res.json({ roomId });
});

// Route to get room state
app.get("/api/rooms/:id", (req, res) => {
    const room = rooms.get(req.params.id);
    if (!room) {
        console.log(`Room ${req.params.id} not found`);
        return res.status(404).json({ error: "Room not found" });
    }
    console.log(`Room ${req.params.id} found with ${room.players.length} players`);
    res.json({
        roomId: req.params.id,
        players: room.players,
        game: {
            fen: room.game.fen(),
            gameStatus: room.gameStatus
        }
    });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join a room
    socket.on("joinRoom", (roomId) => {
        console.log(`Attempting to join room: ${roomId}`);
        const room = rooms.get(roomId);

        if (!room) {
            console.log(`Room ${roomId} not found`);
            socket.emit("error", { message: "Room not found" });
            return;
        }

        // Check if player is already in the room
        const existingPlayer = room.players.find(p => p.id === socket.id);
        if (existingPlayer) {
            console.log(`Player ${socket.id} already in room ${roomId}`);
            socket.join(roomId);
            socket.emit("playerRole", existingPlayer.color);
            socket.emit("roomState", {
                game: {
                    fen: room.game.fen(),
                    gameStatus: room.gameStatus
                },
                players: room.players
            });
            return;
        }

        if (room.players.length >= 2) {
            console.log(`Room ${roomId} is full`);
            socket.emit("error", { message: "Room is full" });
            return;
        }

        // Assign player role (white or black)
        const playerRole = room.players.length === 0 ? "w" : "b";
        const player = {
            id: socket.id,
            color: playerRole
        };
        room.players.push(player);

        socket.join(roomId);
        console.log(`Player ${socket.id} joined room ${roomId} as ${playerRole === "w" ? "White" : "Black"}`);

        // Emit player role immediately
        socket.emit("playerRole", playerRole);

        // If room is full, start the game
        if (room.players.length === 2) {
            console.log(`Room ${roomId} is now full, starting game`);
            room.gameStatus = "in_progress";
            // Ensure white starts first
            room.game.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

            io.to(roomId).emit("gameStart", {
                players: room.players,
                gameStatus: room.gameStatus,
                fen: room.game.fen()
            });
        }

        // Send current room state to the new player
        socket.emit("roomState", {
            game: {
                fen: room.game.fen(),
                gameStatus: room.gameStatus
            },
            players: room.players
        });
    });

    // Handle piece selection (get legal moves)
    socket.on("selectPiece", ({ square, roomId }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Check if it's the player's turn
        if (room.game.turn() !== player.color) {
            socket.emit("error", { message: "Not your turn" });
            return;
        }

        // Get legal moves for the selected square
        const legalMoves = getLegalMoves(room.game, square);

        // Send legal moves to the client
        socket.emit("legalMoves", {
            square,
            moves: legalMoves
        });
    });

    // Handle moves
    socket.on("move", (move) => {
        const roomId = Array.from(socket.rooms)[1]; // Get the room ID
        if (!roomId) {
            console.log(`No room found for socket ${socket.id}`);
            socket.emit("error", { message: "Not in a room" });
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            console.log(`Room ${roomId} not found for move`);
            socket.emit("error", { message: "Room not found" });
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`Player ${socket.id} not found in room ${roomId}`);
            socket.emit("error", { message: "Player not found in room" });
            return;
        }

        // Check if it's the player's turn
        if (room.game.turn() !== player.color) {
            console.log(`Not ${player.color}'s turn in room ${roomId}`);
            socket.emit("error", { message: "Not your turn" });
            return;
        }

        try {
            // Make the move
            const result = room.game.move(move);
            if (!result) {
                console.log(`Invalid move in room ${roomId}`);
                socket.emit("error", { message: "Invalid move" });
                return;
            }

            // Check game status
            let gameStatus = room.gameStatus;
            if (room.game.isGameOver()) {
                gameStatus = "finished";
                if (room.game.isCheckmate()) {
                    io.to(roomId).emit("gameOver", {
                        winner: player.color === "w" ? "White" : "Black",
                        reason: "checkmate"
                    });
                } else if (room.game.isDraw()) {
                    io.to(roomId).emit("gameOver", {
                        winner: "Draw",
                        reason: "draw"
                    });
                }
            }

            // Update room state
            room.gameStatus = gameStatus;

            // Broadcast the move to all players in the room
            io.to(roomId).emit("move", {
                move: {
                    from: move.from,
                    to: move.to,
                    color: player.color,
                    captured: result.captured
                },
                fen: room.game.fen(),
                gameStatus: room.gameStatus
            });

        } catch (error) {
            console.log(`Error processing move in room ${roomId}:`, error);
            socket.emit("error", { message: "Invalid move" });
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        // Find and clean up the room
        for (const [roomId, room] of rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                console.log(`Player ${socket.id} left room ${roomId}`);
                room.players.splice(playerIndex, 1);

                if (room.players.length === 0) {
                    // Room is empty, remove it
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} deleted as it's empty`);
                } else {
                    // Notify remaining player
                    room.gameStatus = "waiting";
                    io.to(roomId).emit("playerLeft", {
                        color: playerIndex === 0 ? "w" : "b",
                        gameStatus: room.gameStatus
                    });
                    console.log(`Room ${roomId} status updated to waiting`);
                }
                break;
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
