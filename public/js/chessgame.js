const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const capturedWhiteElement = document.querySelector("#captured-white");
const capturedBlackElement = document.querySelector("#captured-black");
let selectedSquare = null;
let playerRole = null;
let capturedPieces = { w: [], b: [] };
let touchStartX = 0;
let touchStartY = 0;

// Initialize sound effects with mobile-optimized settings
const sounds = {
    move: new Howl({
        src: ['/sounds/move.mp3'],
        preload: true,
        html5: true,
        volume: 0.7
    }),
    capture: new Howl({
        src: ['/sounds/capture.mp3'],
        preload: true,
        html5: true,
        volume: 0.7
    }),
    check: new Howl({
        src: ['/sounds/check.mp3'],
        preload: true,
        html5: true,
        volume: 0.7
    }),
    gameStart: new Howl({
        src: ['/sounds/game-start.mp3'],
        preload: true,
        html5: true,
        volume: 0.7
    }),
    gameEnd: new Howl({
        src: ['/sounds/game-end.mp3'],
        preload: true,
        html5: true,
        volume: 0.7
    })
};

// Add vibration feedback for mobile devices
const vibrateDevice = (duration = 50) => {
    if ('vibrate' in navigator) {
        navigator.vibrate(duration);
    }
};

// Prevent default touch behaviors
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('.chessboard')) {
        e.preventDefault();
    }
}, { passive: false });

// Handle orientation changes
window.addEventListener('orientationchange', () => {
    setTimeout(renderBoard, 100); // Re-render board after orientation change
});

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    capturedWhiteElement.innerHTML = "";
    capturedBlackElement.innerHTML = "";

    board.forEach((row, rowidx) => {
        row.forEach((square, squareidx) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square",
                (rowidx + squareidx) % 2 === 0 ? "white" : "black"
            );
            squareElement.dataset.row = rowidx;
            squareElement.dataset.col = squareidx;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);

                if (playerRole === square.color) {
                    // Touch event handlers for pieces
                    pieceElement.addEventListener("touchstart", handlePieceTouch, { passive: false });
                    pieceElement.addEventListener("touchend", handlePieceTouch, { passive: false });
                    // Keep click events for desktop compatibility
                    pieceElement.addEventListener("click", (event) => {
                        event.stopPropagation();
                        handlePieceClick(rowidx, squareidx);
                    });
                } else {
                    pieceElement.style.cursor = "not-allowed";
                }

                squareElement.appendChild(pieceElement);
            }

            // Touch event handlers for squares
            squareElement.addEventListener("touchstart", handleSquareTouch, { passive: false });
            squareElement.addEventListener("touchend", handleSquareTouch, { passive: false });
            // Keep click events for desktop compatibility
            squareElement.addEventListener("click", () => handleSquareClick(squareElement));

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }

    renderCapturedPieces();
};

const renderCapturedPieces = () => {
    capturedWhiteElement.innerHTML = "";
    capturedBlackElement.innerHTML = "";

    capturedPieces.w.forEach(piece => {
        const pieceElement = document.createElement("div");
        pieceElement.innerText = getPieceUnicode({ type: piece, color: "w" });
        pieceElement.classList.add("captured-piece");
        capturedWhiteElement.appendChild(pieceElement);
    });

    capturedPieces.b.forEach(piece => {
        const pieceElement = document.createElement("div");
        pieceElement.innerText = getPieceUnicode({ type: piece, color: "b" });
        pieceElement.classList.add("captured-piece");
        capturedBlackElement.appendChild(pieceElement);
    });
};

const handlePieceTouch = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const touch = event.type === 'touchstart' ? event.touches[0] : event.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const square = element.closest('.square');

    if (!square) return;

    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);

    if (event.type === 'touchstart') {
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    } else if (event.type === 'touchend') {
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        // If it's a tap (not a drag)
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            handlePieceClick(row, col);
            vibrateDevice(30);
        }
    }
};

const handleSquareTouch = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const touch = event.type === 'touchstart' ? event.touches[0] : event.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const square = element.closest('.square');

    if (!square) return;

    if (event.type === 'touchstart') {
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    } else if (event.type === 'touchend') {
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        // If it's a tap (not a drag)
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            handleSquareClick(square);
            if (selectedSquare) {
                vibrateDevice(50);
            }
        }
    }
};

const handlePieceClick = (row, col) => {
    if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        clearHighlights();
        return;
    }
    highlightMoves(row, col);
};

const handleSquareClick = (squareElement) => {
    if (selectedSquare) {
        const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
        };
        handleMove(selectedSquare, targetSquare);
    }
};

const highlightMoves = (row, col) => {
    clearHighlights();
    selectedSquare = { row, col };
    const squareNotation = `${String.fromCharCode(97 + col)}${8 - row}`;
    const legalMoves = chess.moves({ square: squareNotation, verbose: true });

    legalMoves.forEach((move) => {
        const targetRow = 8 - parseInt(move.to[1]);
        const targetCol = move.to.charCodeAt(0) - 97;
        const targetSquare = document.querySelector(
            `.square[data-row="${targetRow}"][data-col="${targetCol}"]`
        );
        if (targetSquare) {
            targetSquare.classList.add(move.captured ? "capture-highlight" : "highlight");
        }
    });
};

const clearHighlights = () => {
    document.querySelectorAll(".highlight, .capture-highlight").forEach(
        (el) => el.classList.remove("highlight", "capture-highlight")
    );
    selectedSquare = null;
};

const handleMove = (sourceSquare, targetSquare) => {
    if (!playerRole) return;

    const move = {
        from: `${String.fromCharCode(97 + sourceSquare.col)}${8 - sourceSquare.row}`,
        to: `${String.fromCharCode(97 + targetSquare.col)}${8 - targetSquare.row}`,
        promotion: "q",
    };

    const result = chess.move(move);
    if (result) {
        if (result.captured) {
            capturedPieces[result.color === "w" ? "b" : "w"].push(result.captured);
            sounds.capture.play();
            vibrateDevice(100);

            const targetSquareElement = document.querySelector(
                `.square[data-row="${targetSquare.row}"][data-col="${targetSquare.col}"]`
            );
            if (targetSquareElement) {
                targetSquareElement.classList.add("capture-highlight");
                setTimeout(() => {
                    targetSquareElement.classList.remove("capture-highlight");
                }, 500);
            }
        } else {
            sounds.move.play();
            vibrateDevice(30);
        }

        if (chess.in_check()) {
            sounds.check.play();
            vibrateDevice([50, 50, 50]);
        }

        socket.emit("move", move);
        clearHighlights();
        renderBoard();
    }
};

const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: "♟︎", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
        P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
    };
    return unicodePieces[piece.type] || "";
};

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Socket event handlers with mobile optimizations
socket.on("playerRole", function (role) {
    playerRole = role;
    sounds.gameStart.play();
    vibrateDevice(50);
    renderBoard();

    // Request wake lock to keep screen on during game
    if ('wakeLock' in navigator) {
        requestWakeLock();
    }
});

// Keep screen on during game
async function requestWakeLock() {
    try {
        await navigator.wakeLock.request('screen');
    } catch (err) {
        console.log(`Wake Lock error: ${err.name}, ${err.message}`);
    }
}

// Handle offline/online events
window.addEventListener('online', () => {
    socket.connect();
});

window.addEventListener('offline', () => {
    alert('You are offline. Please check your connection.');
});

socket.on("spectatorRole", function () {
    playerRole = null;
    renderBoard();
});

socket.on("boardState", function (fen) {
    chess.load(fen);
    renderBoard();
});

socket.on("move", function (move) {
    const result = chess.move(move);

    if (result) {
        if (result.captured) {
            capturedPieces[result.color === "w" ? "b" : "w"].push(result.captured);
            sounds.capture.play();

            // Add capture highlight effect for opponent's move
            const targetSquare = {
                row: 8 - parseInt(move.to[1]),
                col: move.to.charCodeAt(0) - 97
            };
            const targetSquareElement = document.querySelector(
                `.square[data-row="${targetSquare.row}"][data-col="${targetSquare.col}"]`
            );
            if (targetSquareElement) {
                targetSquareElement.classList.add("capture-highlight");
                // Remove the highlight after animation
                setTimeout(() => {
                    targetSquareElement.classList.remove("capture-highlight");
                }, 500);
            }
        } else {
            sounds.move.play();
        }

        if (chess.in_check()) {
            sounds.check.play();
        }

        if (chess.is_game_over()) {
            sounds.gameEnd.play();
        }
    }

    renderBoard();
});

renderBoard();