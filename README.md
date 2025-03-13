Initializtion - Socket and chess objects will be initialized, Board lement is selected from the dom, Initial Value for the dragged Piece, soource square and player role are set to null.

Initial Borad Rendering - renderBoard() is called to display the initial state of the chess board.
Drag and Drop Functionality - drag and drop event listener for each pieces nd square , draggedPiece and sourceSquare is set. When a new piece is dragged, handleMove() is called to handle the logic and emit it to the server.
Socketio Functionality Handling ( Client and Server ) - Browser1 user to server will be connected real-time via socket.io so do with browser2 user 

