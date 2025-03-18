import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Howl } from 'howler';
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
    withCredentials: true
});

const sounds = {
    move: new Howl({ src: ['/sounds/move.mp3'] }),
    capture: new Howl({ src: ['/sounds/capture.mp3'] }),
    check: new Howl({ src: ['/sounds/check.mp3'] }),
    gameStart: new Howl({ src: ['/sounds/game-start.mp3'] }),
    gameEnd: new Howl({ src: ['/sounds/game-end.mp3'] })
};

const ChessBoard = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(new Chess());
    const [playerRole, setPlayerRole] = useState(null);
    const [gameStatus, setGameStatus] = useState('waiting');
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] });
    const [roomLink, setRoomLink] = useState('');
    const [players, setPlayers] = useState([]);
    const [legalMoves, setLegalMoves] = useState([]);
    const boardRef = useRef(null);

    useEffect(() => {
        if (!roomId) {
            navigate('/');
            return;
        }

        // Join existing room
        socket.emit('joinRoom', roomId);

        // Socket event handlers
        socket.on('playerRole', (role) => {
            setPlayerRole(role);
            sounds.gameStart.play();
        });

        socket.on('roomState', (state) => {
            const newGame = new Chess();
            newGame.load(state.game.fen);
            setGame(newGame);
            setGameStatus(state.game.gameStatus);
            setPlayers(state.players);
        });

        socket.on('playerJoined', ({ player, gameStatus }) => {
            setPlayers(prev => [...prev, player]);
            setGameStatus(gameStatus);
        });

        socket.on('move', (data) => {
            // Update game state from server
            const newGame = new Chess();
            newGame.load(data.fen);
            setGame(newGame);
            setGameStatus(data.gameStatus);
            setSelectedSquare(null);
            setLegalMoves([]);

            // Update captured pieces
            if (data.move.captured) {
                setCapturedPieces(prev => ({
                    ...prev,
                    [data.move.color === 'w' ? 'b' : 'w']: [...prev[data.move.color === 'w' ? 'b' : 'w'], data.move.captured]
                }));
                sounds.capture.play();
            } else {
                sounds.move.play();
            }

            if (newGame.in_check()) {
                sounds.check.play();
            }

            if (newGame.isGameOver()) {
                sounds.gameEnd.play();
            }
        });

        socket.on('legalMoves', (data) => {
            console.log('Received legal moves:', data.moves); // Debug log
            setLegalMoves(data.moves);
        });

        socket.on('gameStart', (data) => {
            setGameStatus('in_progress');
            setPlayers(data.players);
            sounds.gameStart.play();
        });

        socket.on('gameOver', (data) => {
            setGameStatus('finished');
            sounds.gameEnd.play();
            alert(`Game Over! ${data.winner} wins!`);
        });

        socket.on('playerLeft', (data) => {
            setGameStatus(data.gameStatus);
            setPlayers(prev => prev.filter(p => p.color !== data.color));
            alert(`${data.color === 'w' ? 'White' : 'Black'} player has left the game`);
        });

        // Cleanup
        return () => {
            socket.off('playerRole');
            socket.off('roomState');
            socket.off('playerJoined');
            socket.off('move');
            socket.off('legalMoves');
            socket.off('gameStart');
            socket.off('gameOver');
            socket.off('playerLeft');
        };
    }, [roomId, navigate]);

    const handleSquareClick = (row, col) => {
        if (!playerRole || gameStatus !== 'in_progress') return;

        const square = `${String.fromCharCode(97 + col)}${8 - row}`;
        const piece = game.get(square);

        if (selectedSquare) {
            // Check if the move is in legal moves
            const isLegalMove = legalMoves.some(move => move.to === square);

            if (isLegalMove) {
                const move = {
                    from: selectedSquare,
                    to: square,
                    promotion: 'q'
                };

                // Emit move to server
                socket.emit('move', move);
                setSelectedSquare(null);
                setLegalMoves([]);
            } else {
                // If clicking on a different piece of the same color, select it
                if (piece && piece.color === playerRole) {
                    setSelectedSquare(square);
                    socket.emit('selectPiece', { square, roomId });
                } else {
                    setSelectedSquare(null);
                    setLegalMoves([]);
                }
            }
        } else if (piece && piece.color === playerRole) {
            console.log('Selecting piece at square:', square); // Debug log
            setSelectedSquare(square);
            socket.emit('selectPiece', { square, roomId });
        }
    };

    const renderSquare = (row, col) => {
        const square = `${String.fromCharCode(97 + col)}${8 - row}`;
        const piece = game.get(square);
        const isSelected = square === selectedSquare;
        const isLegalMove = legalMoves.some(move => move.to === square);
        const isCapture = isLegalMove && piece && piece.color !== playerRole;

        return (
            <div
                key={square}
                className={`square ${(row + col) % 2 === 0 ? 'white' : 'black'} 
                    ${isSelected ? 'highlight' : ''}
                    ${isLegalMove ? isCapture ? 'capture-highlight' : 'highlight' : ''}`}
                onClick={() => handleSquareClick(row, col)}
            >
                {piece && (
                    <div className={`piece ${piece.color === 'w' ? 'white' : 'black'}`}>
                        {getPieceUnicode(piece)}
                    </div>
                )}
            </div>
        );
    };

    const getPieceUnicode = (piece) => {
        const unicodePieces = {
            p: '♟︎', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
            P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
        };
        return unicodePieces[piece.type] || '';
    };

    const copyRoomLink = () => {
        navigator.clipboard.writeText(roomLink);
        alert('Room link copied to clipboard!');
    };

    const shareOnWhatsApp = () => {
        const message = `Join me for a game of chess! Click here: ${roomLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-purple-900 to-green-900">
            <div className="flex justify-between w-full max-w-[700px] mb-4">
                <div className="text-xl flex gap-1 text-black">
                    {capturedPieces.b.map((piece, index) => (
                        <div key={index}>{getPieceUnicode({ type: piece, color: 'b' })}</div>
                    ))}
                </div>
                <div className="text-xl flex gap-1 text-white">
                    {capturedPieces.w.map((piece, index) => (
                        <div key={index}>{getPieceUnicode({ type: piece, color: 'w' })}</div>
                    ))}
                </div>
            </div>

            <div className={`chessboard ${playerRole === 'b' ? 'flipped' : ''}`} ref={boardRef}>
                {Array(8).fill(null).map((_, row) => (
                    Array(8).fill(null).map((_, col) => renderSquare(row, col))
                ))}
            </div>

            <div className="mt-4 text-center">
                <p className="text-lg text-white">
                    {gameStatus === 'waiting' && 'Waiting for opponent...'}
                    {gameStatus === 'in_progress' && `Current turn: ${game.turn() === 'w' ? 'White' : 'Black'}`}
                    {gameStatus === 'finished' && 'Game Over'}
                </p>
                {playerRole && (
                    <p className="text-sm text-white/80">
                        You are playing as {playerRole === 'w' ? 'White' : 'Black'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ChessBoard; 