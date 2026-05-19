(function () {
  "use strict";

  const BOARD_SIZE = 15;
  const EMPTY = "";
  const BLACK = "black";
  const WHITE = "white";
  const DIRECTIONS = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  const boardElement = document.getElementById("board");
  const turnStone = document.getElementById("turn-stone");
  const turnLabel = document.getElementById("turn-label");
  const message = document.getElementById("game-message");
  const blackCount = document.getElementById("black-count");
  const whiteCount = document.getElementById("white-count");
  const moveCount = document.getElementById("move-count");
  const restartButton = document.getElementById("restart-button");
  const undoButton = document.getElementById("undo-button");

  let board = createBoard();
  let currentPlayer = BLACK;
  let history = [];
  let gameOver = false;

  function createBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  }

  function createCell(row, col) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.dataset.row = String(row);
    cell.dataset.col = String(col);
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `第 ${row + 1} 列，第 ${col + 1} 行`);
    cell.addEventListener("click", handleCellClick);
    return cell;
  }

  function renderBoard() {
    boardElement.textContent = "";

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        boardElement.appendChild(createCell(row, col));
      }
    }
  }

  function handleCellClick(event) {
    if (gameOver) {
      return;
    }

    const row = Number(event.currentTarget.dataset.row);
    const col = Number(event.currentTarget.dataset.col);

    if (board[row][col] !== EMPTY) {
      return;
    }

    placeStone(row, col, currentPlayer);
    history.push({ row, col, player: currentPlayer });

    const winningCells = findWinningCells(row, col, currentPlayer);

    if (winningCells.length >= 5) {
      gameOver = true;
      markWinningCells(winningCells);
      setMessage(`${getPlayerName(currentPlayer)}獲勝。`, true);
      updateControls();
      return;
    }

    if (history.length === BOARD_SIZE * BOARD_SIZE) {
      gameOver = true;
      setMessage("棋盤已滿，平手。", true);
      updateControls();
      return;
    }

    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    updateStatus();
  }

  function placeStone(row, col, player) {
    board[row][col] = player;

    const cell = getCell(row, col);
    const stone = document.createElement("span");
    stone.className = `stone ${player}`;
    stone.setAttribute("aria-hidden", "true");

    cell.classList.add("occupied");
    cell.setAttribute("aria-label", `第 ${row + 1} 列，第 ${col + 1} 行，${getPlayerName(player)}`);
    cell.appendChild(stone);

    updateStatus();
  }

  function findWinningCells(row, col, player) {
    for (const [rowStep, colStep] of DIRECTIONS) {
      const line = [
        ...collectCells(row, col, player, -rowStep, -colStep).reverse(),
        { row, col },
        ...collectCells(row, col, player, rowStep, colStep),
      ];

      if (line.length >= 5) {
        return line;
      }
    }

    return [];
  }

  function collectCells(row, col, player, rowStep, colStep) {
    const cells = [];
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInsideBoard(nextRow, nextCol) && board[nextRow][nextCol] === player) {
      cells.push({ row: nextRow, col: nextCol });
      nextRow += rowStep;
      nextCol += colStep;
    }

    return cells;
  }

  function markWinningCells(cells) {
    cells.forEach(({ row, col }) => {
      getCell(row, col).classList.add("win");
    });
  }

  function clearWinningMarks() {
    boardElement.querySelectorAll(".win").forEach((cell) => {
      cell.classList.remove("win");
    });
  }

  function undoMove() {
    if (history.length === 0) {
      return;
    }

    const lastMove = history.pop();
    board[lastMove.row][lastMove.col] = EMPTY;
    gameOver = false;
    currentPlayer = lastMove.player;
    clearWinningMarks();

    const cell = getCell(lastMove.row, lastMove.col);
    cell.textContent = "";
    cell.classList.remove("occupied");
    cell.setAttribute("aria-label", `第 ${lastMove.row + 1} 列，第 ${lastMove.col + 1} 行`);

    updateStatus();
  }

  function restartGame() {
    board = createBoard();
    currentPlayer = BLACK;
    history = [];
    gameOver = false;
    renderBoard();
    updateStatus();
  }

  function updateStatus() {
    const blackStones = history.filter((move) => move.player === BLACK).length;
    const whiteStones = history.filter((move) => move.player === WHITE).length;

    blackCount.textContent = String(blackStones);
    whiteCount.textContent = String(whiteStones);
    moveCount.textContent = String(history.length);

    turnStone.className = `stone-icon ${currentPlayer}`;
    turnLabel.textContent = `${getPlayerName(currentPlayer)}回合`;

    if (!gameOver) {
      setMessage(`請${getPlayerName(currentPlayer)}落子。`, false);
    }

    updateControls();
  }

  function updateControls() {
    undoButton.disabled = history.length === 0;
  }

  function setMessage(text, isWinner) {
    message.textContent = text;
    message.classList.toggle("winner", isWinner);
  }

  function getCell(row, col) {
    return boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  }

  function getPlayerName(player) {
    return player === BLACK ? "黑子" : "白子";
  }

  function isInsideBoard(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  restartButton.addEventListener("click", restartGame);
  undoButton.addEventListener("click", undoMove);

  renderBoard();
  updateStatus();
})();
