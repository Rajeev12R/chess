import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import ChessBoard from './components/ChessBoard';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/game/:roomId" element={<ChessBoard />} />
    </Routes>
  );
};

export default App;