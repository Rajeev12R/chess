const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const capturedWhiteElement = document.querySelector("#captured-white");
const capturedBlackElement = document.querySelector("#captured-black");
let selectedSquare = null;
let playerRole = null;
let capturedPieces = { w: [], b: [] };

// Initialize sound effects
const sounds = {
    move: new Howl({ src: ['/sounds/move.mp3'] }),
    capture: new Howl({ src: ['/sounds/capture.mp3'] }),
    check: new Howl({ src: ['/sounds/check.mp3'] }),
    gameStart: new Howl({ src: ['/sounds/game-start.mp3'] }),
    gameEnd: new Howl({ src: ['/sounds/game-end.mp3'] })
};

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
                    pieceElement.addEventListener("click", (event) => {
                        event.stopPropagation();
                        handlePieceClick(rowidx, squareidx);
                    });
                    pieceElement.addEventListener("touchstart", (event) => {
                        event.stopPropagation();
                        handlePieceClick(rowidx, squareidx);
                    });
                } else {
                    pieceElement.style.cursor = "not-allowed";
                }

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("click", function () {
                handleSquareClick(squareElement);
            });
            squareElement.addEventListener("touchstart", function () {
                handleSquareClick(squareElement);
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }

    capturedPieces.w.forEach(piece => {
        const pieceElement = document.createElement("div");
        pieceElement.innerText = getPieceUnicode({ type: piece, color: "w" });
        capturedWhiteElement.appendChild(pieceElement);
    });

    capturedPieces.b.forEach(piece => {
        const pieceElement = document.createElement("div");
        pieceElement.innerText = getPieceUnicode({ type: piece, color: "b" });
        capturedBlackElement.appendChild(pieceElement);
    });
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
            targetSquare.classList.add("highlight");
        }
    });
};

const clearHighlights = () => {
    document.querySelectorAll(".highlight").forEach((el) => el.classList.remove("highlight"));
    document.querySelectorAll(".capture-highlight").forEach((el) => el.classList.remove("capture-highlight"));
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

            // Add capture highlight effect
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

socket.on("playerRole", function (role) {
    playerRole = role;
    sounds.gameStart.play();
    renderBoard();
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