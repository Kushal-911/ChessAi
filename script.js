import { trainBotFromSavedGames, moveStats } from './training.js';

const board = document.getElementById('chessboard');
let game = new Chess();
let selectedSquare = null;
let moveHistory = [];
let whiteTime, blackTime;
let timerInterval;
let currentTurn = 'w';
let gameMode = '2p'; 
let botPlaysAs = 'b';

function toggleSetupOptions() {
    const mode = document.getElementById('modeSelect').value;
    document.getElementById('sideSelection').style.display = (mode === 'bot') ? 'block' : 'none';
    document.getElementById('timerOptions').style.display = (mode === '2p') ? 'block' : 'none';
}

const pieceSymbols = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
};

function createBoard() {
    board.innerHTML = '';
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let rank = 8; rank >= 1; rank--) {
        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
            const file = files[fileIndex];
            const squareName = file + rank;
            const square = document.createElement('div');
            square.classList.add('square');
            if ((fileIndex + rank) % 2 === 0) square.classList.add('white');
            else square.classList.add('black');

            if (game.get(squareName)) {
                const pieceObj = game.get(squareName);
                const piece = pieceObj.type;
                const color = pieceObj.color;
            
                square.textContent = pieceSymbols[color === 'w' ? piece.toUpperCase() : piece];
            
                if (color === 'w') {
                    square.classList.add('white-piece');
                } else {
                    square.classList.add('black-piece');
                }
            }
            

            square.dataset.square = squareName;
            square.addEventListener('click', handleSquareClick);
            board.appendChild(square);
        }
    }

    // Highlight legal moves
    //highlightLegalMoves();
    highlightKingInCheck();
}

function startNewGame() {
    gameMode = document.getElementById('modeSelect').value;
    botPlaysAs = document.getElementById('botSideSelect').value;

    const timeInMinutes = parseInt(document.getElementById('timeInput').value) || 5;
    whiteTime = blackTime = timeInMinutes * 60;

    game = new Chess();
    selectedSquare = null;
    moveHistory = [];
    updateTimerDisplay();
    createBoard();
    updateMoveList();
    clearInterval(timerInterval);
    currentTurn = 'w';

    document.getElementById('setupBox').style.display = 'none';

    if (gameMode === '2p') {
        startTimer();
    } else if (gameMode === 'bot' && botPlaysAs === 'b') {
        setTimeout(makeBotMove, 500);
    }
}

function handleSquareClick(e) {
    const clickedSquare = e.currentTarget.dataset.square;
    if (gameMode === 'bot' && game.turn() === 'b' && botPlaysAs === 'b') {
        setTimeout(makeBotMove, 300);
    }
    
    if (selectedSquare) {
        const move = game.move({ from: selectedSquare, to: clickedSquare, promotion: 'q' });
            if (move) {
            saveMoveToHistory(move.san, game.fen());
            // continue with update UI, board, etc.
            }

        if (move) {
            moveHistory.push(move);
            createBoard();
            saveGameState();

            selectedSquare = null; // Clear selected after move

            setTimeout(makeBotMove, 500); // Slight delay so it feels natural
            return;
        }
    } else if (game.get(clickedSquare)) {
        selectedSquare = clickedSquare;
    }
}

function makeBotMove() {

    if (gameMode !== 'bot' || game.turn() === 'w' || botPlaysAs === 'w') return;
    if (game.game_over()) {
        let resultMessage = '';
        if (game.in_checkmate()) resultMessage = 'You Won! Checkmate.';
        else if (game.in_stalemate()) resultMessage = 'Draw by stalemate.';
        else if (game.in_draw()) resultMessage = 'Draw.';
        else resultMessage = 'Game over.';

        handleGameOver(resultMessage);
        return;
    }
    const fen = game.fen();
    const possibleMoves = game.moves();

    let move = null;
    if (moveStats[fen]) {
        const trainedMove = moveStats[fen];

        if (possibleMoves.includes(trainedMove)) {
            console.log("Bot is using trained move:", trainedMove);
            move = game.move(trainedMove);
        } else {
            console.warn("Trained move is illegal. Falling back.");
            const fallback = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            console.log("Bot plays fallback move:", fallback);
            move = game.move(fallback);
        }
    } else {
        console.log("📉 No training data. Bot plays randomly.");
        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        console.log("🎲 Random move selected:", randomMove);
        move = game.move(randomMove);
    }

    if (move) {
        saveMoveToHistory(move.san, game.fen());
    } else {
        console.error("Failed to make bot move.");
    }

    if (game.game_over()) {
        let resultMessage = '';
        if (game.in_checkmate()) resultMessage = 'You Lose! Checkmate.';
        else if (game.in_stalemate()) resultMessage = 'Draw by stalemate.';
        else if (game.in_draw()) resultMessage = 'Draw.';
        else resultMessage = 'Game over.';

        handleGameOver(resultMessage);
        trainBotFromSavedGames();

        return;
    }

    createBoard();
    updateMoveList();
    saveGameState();
}

function updateMoveList() {
    const moveListContainer = document.getElementById('moveList');
    moveListContainer.innerHTML = '';

    const history = game.history({ verbose: true });

    history.forEach((move, index) => {
        const moveEl = document.createElement('div');
        const moveNumber = Math.floor(index / 2) + 1;
        const piece = move.piece.toUpperCase();

        if (index % 2 === 0) {
            moveEl.textContent = `${moveNumber}. ${piece} ${move.from} to ${move.to}`;
        } else {
            moveEl.textContent += ` ${piece} ${move.from} to ${move.to}`;
        }
        moveListContainer.appendChild(moveEl);
    });
}

function undoMove() {
    if (moveHistory.length === 0) return;
    game.undo();
    moveHistory.pop();
    createBoard();
    saveGameState();
}

function saveGameState() {
    const gameState = {
        fen: game.fen,      
        history: game.history({ verbose: true }),
    };
    localStorage.setItem('chessGameState', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('chessGameState');
    if (savedState) {
        const { fen, history } = JSON.parse(savedState);
        moveHistory = history || [];
        createBoard();
        updateMoveList();
    }
}

function highlightLegalMoves() {
    if (!selectedSquare) return;

    const legalMoves = game.legal_moves.filter(move => move.from === selectedSquare);
    const allSquares = document.querySelectorAll('.square');
    allSquares.forEach(square => square.classList.remove('legal-move'));

    legalMoves.forEach(move => {
        const square = document.querySelector(`[data-square="${move.to}"]`);
        if (square) {
            square.classList.add('legal-move');
        }
    });
}

function highlightKingInCheck() {
    const inCheck = game.in_check();
    const currentTurnColor = game.turn(); 
    let kingSquare = null;

    for (let rank = 1; rank <= 8; rank++) {
        for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
            const file = String.fromCharCode(97 + fileIndex);
            const squareName = file + rank;

            const piece = game.get(squareName);
            if (piece && piece.type === 'k' && piece.color === currentTurnColor) {
                kingSquare = squareName;
                break;
            }
        }
        if (kingSquare) break;
    }

    if (inCheck && kingSquare) {
        const square = document.querySelector(`[data-square="${kingSquare}"]`);
        if (square) {
            square.classList.add('king-in-check');
        }
    }
}

function startTimer() {
    if (gameMode !== '2p') return;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (game.game_over()) {
            clearInterval(timerInterval);
            return;
        }

        if (currentTurn === 'w') whiteTime--;
        else blackTime--;

        updateTimerDisplay();

        if (whiteTime <= 0 || blackTime <= 0) {
            clearInterval(timerInterval);
            handleGameOver(`${currentTurn === 'w' ? 'Black' : 'White'} wins on time`);
        }
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById('white-timer').textContent = `White: ${formatTime(whiteTime)}`;
    document.getElementById('black-timer').textContent = `Black: ${formatTime(blackTime)}`;
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}
currentTurn = currentTurn === 'w' ? 'b' : 'w';
startTimer();

function handleGameOver(message) {
    alert(`Game Over: ${message}`);
    clearInterval(timerInterval);
}

function downloadPGN() {
    const pgn = game.pgn();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'chess_game.pgn';
    a.click();

    URL.revokeObjectURL(url);
}

function resetGame() {
    game.reset();
    selectedSquare = null;
    gameHistory = [];
    createBoard();
    updateMoveList();
}

let gameHistory = [];

function saveMoveToHistory(move, fen) {
    const lastTurn = game.turn() === 'w' ? 'b' : 'w';
    gameHistory.push({ fen, move, turn: lastTurn });
}

function saveGameResult(result) {
    const savedGames = JSON.parse(localStorage.getItem("savedGames") || "[]");

    savedGames.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        history: [...gameHistory],
        result: result, 
        botSide: 'b' || 'none'
    });

    localStorage.setItem("savedGames", JSON.stringify(savedGames));
    gameHistory = []; 
    populateSavedGamesDropdown();
}

function printSavedGames() {
    const savedGames = JSON.parse(localStorage.getItem("savedGames") || "[]");
    console.log(savedGames);
}

function populateSavedGamesDropdown() {
    const select = document.getElementById('savedGamesSelect');
    const savedGames = JSON.parse(localStorage.getItem("savedGames") || "[]");

    select.innerHTML = '<option value="">-- Load a saved game --</option>';

    savedGames.forEach((game, index) => {
        select.innerHTML += `<option value="${index}">Game ${index + 1} - ${game.result}</option>`;
    });
}

function loadSelectedGame() {
    const index = document.getElementById('savedGamesSelect').value;
    if (index === '') return;

    const savedGames = JSON.parse(localStorage.getItem("savedGames") || "[]");
    const selectedGame = savedGames[parseInt(index)];

    if (!selectedGame || !selectedGame.history || selectedGame.history.length === 0) {
        alert("No valid game data found.");
        return;
    }

    game.reset();
    selectedSquare = null;
    gameHistory = [];

    selectedGame.history.forEach(entry => {
        game.load(entry.fen);
        gameHistory.push(entry);
    });

    createBoard();
    updateMoveList();
}

document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('undoButton').addEventListener('click', undoMove);
document.getElementById('downloadPGN').addEventListener('click', downloadPGN);
document.getElementById('saveGameButton').addEventListener('click', saveGameResult);
document.getElementById('printSavedGames').addEventListener('click', printSavedGames);
document.getElementById('savedGamesSelect').addEventListener('change', loadSelectedGame);
document.getElementById('savedGamesSelect').addEventListener('change', populateSavedGamesDropdown);

loadGameState();
createBoard();
