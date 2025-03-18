import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
    const navigate = useNavigate();
    const [roomLink, setRoomLink] = useState('');
    const [roomId, setRoomId] = useState('');
    const [error, setError] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    const createNewRoom = () => {
        setIsCreating(true);
        fetch('https://chess-2-syeu.onrender.com/api/rooms', {
            method: 'POST',
            credentials: 'include'
        })
            .then(res => res.json())
            .then(data => {
                const link = `${window.location.origin}/game/${data.roomId}`;
                setRoomLink(link);
                navigate(`/game/${data.roomId}`);
            })
            .catch(err => {
                console.error('Error creating room:', err);
                setError('Failed to create room');
                setIsCreating(false);
            });
    };

    const joinRoom = () => {
        if (!roomId.trim()) {
            setError('Please enter a room ID');
            return;
        }
        setIsJoining(true);
        navigate(`/game/${roomId.trim()}`);
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
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-white mb-4">Multiplayer Chess</h1>
                <p className="text-xl text-white/80">Create a room or join an existing one!</p>
            </div>

            {error && (
                <div className="bg-red-500 text-white px-6 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <div className="flex flex-col gap-6 w-full max-w-md">
                {/* Create Room Section */}
                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-white mb-4">Create New Room</h2>
                    <button
                        onClick={createNewRoom}
                        disabled={isCreating}
                        className={`w-full px-6 py-3 text-lg font-semibold rounded-lg transition-all
                            ${isCreating
                                ? 'bg-white/20 cursor-not-allowed'
                                : 'bg-white/10 hover:bg-white/20 active:bg-white/30'
                            } backdrop-blur-sm text-white`}
                    >
                        {isCreating ? 'Creating Room...' : 'Create New Room'}
                    </button>
                </div>

                {/* Join Room Section */}
                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-white mb-4">Join Existing Room</h2>
                    <div className="flex flex-col gap-4">
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            placeholder="Enter Room ID"
                            className="px-4 py-2 rounded bg-white/10 backdrop-blur-sm text-white placeholder-white/50"
                        />
                        <button
                            onClick={joinRoom}
                            disabled={isJoining}
                            className={`w-full px-6 py-3 text-lg font-semibold rounded-lg transition-all
                                ${isJoining
                                    ? 'bg-white/20 cursor-not-allowed'
                                    : 'bg-white/10 hover:bg-white/20 active:bg-white/30'
                                } backdrop-blur-sm text-white`}
                        >
                            {isJoining ? 'Joining...' : 'Join Room'}
                        </button>
                    </div>
                </div>

                {/* Room Link Section (shown after room creation) */}
                {roomLink && (
                    <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
                        <h2 className="text-2xl font-bold text-white mb-4">Share Room Link</h2>
                        <div className="flex flex-col gap-4">
                            <input
                                type="text"
                                value={roomLink}
                                readOnly
                                className="px-4 py-2 rounded bg-white/10 backdrop-blur-sm text-white"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={copyRoomLink}
                                    className="flex-1 px-6 py-2 rounded bg-white/10 hover:bg-white/20 transition-colors text-white"
                                >
                                    Copy
                                </button>
                                <button
                                    onClick={shareOnWhatsApp}
                                    className="flex-1 px-6 py-2 rounded bg-white/10 hover:bg-white/20 transition-colors text-white"
                                >
                                    Share
                                </button>
                            </div>
                            <p className="text-white/80 text-center">
                                Waiting for opponent to join...<br />
                                You'll be redirected automatically when they join.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Landing; 