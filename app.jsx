const EUROPEAN_CITIES = [
  'Lisbon',
  'Madrid',
  'Paris',
  'Berlin',
  'Rome',
  'Vienna',
  'Prague',
  'Warsaw',
  'Budapest',
  'Copenhagen',
  'Stockholm',
  'Oslo',
  'Helsinki',
  'Reykjavik',
  'Dublin',
  'Brussels',
  'Amsterdam',
  'Luxembourg',
  'Zurich',
  'Geneva',
  'Barcelona',
  'Valencia',
  'Seville',
  'Porto',
  'Athens',
  'Thessaloniki',
  'Sofia',
  'Belgrade',
  'Zagreb',
  'Ljubljana',
  'Sarajevo',
  'Skopje',
  'Tallinn',
  'Riga',
  'Vilnius',
  'Krakow',
  'Gdansk',
  'Bucharest',
  'Cluj-Napoca',
  'Istanbul',
  'Ankara',
  'Split',
  'Monaco',
  'Nice',
  'Marseille',
  'Hamburg',
  'Munich',
  'Cologne',
  'Glasgow',
  'Edinburgh',
  'Venice'
];

const DIFFICULTY_LEVELS = {
  easy: { label: 'Explorer', duration: 2100, points: 70 },
  medium: { label: 'Trailblazer', duration: 1500, points: 110 },
  hard: { label: 'Legend', duration: 950, points: 170 }
};

const GRID_SIZE = 12;
const WORDS_PER_BOARD = 6;
const HISTORY_LIMIT = 8;
const WORD_COLORS = [
  '#FFE593',
  '#BEE3F8',
  '#C7F9CC',
  '#FFD6E8',
  '#F8C4B4',
  '#D6BCFA',
  '#FDE68A',
  '#A7F3D0'
];

const DIRECTIONS = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: -1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: -1 },
  { row: -1, col: 1 },
  { row: -1, col: -1 }
];

const normalizeWord = (word) => word.replace(/[^a-z]/gi, '').toLowerCase();
const sanitizeCity = (city) => normalizeWord(city).toUpperCase();
const randomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));

const createEmptyGrid = () =>
  Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ letter: '', owners: [] }))
  );

function shuffleArray(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const tryPlaceWordInDirection = (grid, word, ownerId, direction) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const startRow = Math.floor(Math.random() * GRID_SIZE);
    const startCol = Math.floor(Math.random() * GRID_SIZE);
    const endRow = startRow + direction.row * (word.length - 1);
    const endCol = startCol + direction.col * (word.length - 1);
    if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) {
      continue;
    }
    const path = [];
    let fits = true;
    for (let index = 0; index < word.length; index += 1) {
      const row = startRow + direction.row * index;
      const col = startCol + direction.col * index;
      const cell = grid[row][col];
      if (cell.letter && cell.letter !== word[index]) {
        fits = false;
        break;
      }
      path.push({ row, col });
    }
    if (!fits) continue;
    path.forEach(({ row, col }, letterIndex) => {
      grid[row][col].letter = word[letterIndex];
      grid[row][col].owners = [...grid[row][col].owners, ownerId];
    });
    return path;
  }
  return null;
};

const tryPlaceWord = (grid, word, ownerId, usedDirections) => {
  const directions = shuffleArray(DIRECTIONS);
  for (const direction of directions) {
    if (!usedDirections.has(direction)) {
      const path = tryPlaceWordInDirection(grid, word, ownerId, direction);
      if (path) {
        usedDirections.add(direction);
        return path;
      }
    }
  }
  for (const direction of directions) {
    const path = tryPlaceWordInDirection(grid, word, ownerId, direction);
    if (path) {
      return path;
    }
  }
  return null;
};

const buildGameBoard = () => {
  const workingGrid = createEmptyGrid();
  const usedDirections = new Set();
  const shuffledCities = shuffleArray(EUROPEAN_CITIES);
  const words = [];
  let cityIndex = 0;

  while (words.length < WORDS_PER_BOARD && cityIndex < shuffledCities.length) {
    const city = shuffledCities[cityIndex];
    cityIndex += 1;
    const sanitized = sanitizeCity(city);
    const wordId = words.length;
    const color = WORD_COLORS[wordId % WORD_COLORS.length];
    const path = tryPlaceWord(workingGrid, sanitized, wordId, usedDirections);
    if (path) {
      words.push({ id: wordId, city, sanitized, path, color });
    }
  }

  const filledGrid = workingGrid.map((row) =>
    row.map((cell) => (cell.letter ? cell.letter : randomLetter()))
  );

  return { grid: filledGrid, words };
};

const formatTime = (seconds) => {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
};

const areAdjacent = (a, b) => {
  const rowDiff = Math.abs(a.row - b.row);
  const colDiff = Math.abs(a.col - b.col);
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0);
};

const cellKey = (row, col) => `${row}-${col}`;

function App() {
  const [difficulty, setDifficulty] = React.useState('easy');
  const [grid, setGrid] = React.useState([]);
  const [words, setWords] = React.useState([]);
  const [foundWordIds, setFoundWordIds] = React.useState(() => new Set());
  const [selection, setSelection] = React.useState([]);
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [history, setHistory] = React.useState([]);
  const [score, setScore] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(DIFFICULTY_LEVELS.easy.duration);

  const startNewGame = React.useCallback((levelKey) => {
    const { grid: nextGrid, words: nextWords } = buildGameBoard();
    setGrid(nextGrid);
    setWords(nextWords);
    setFoundWordIds(new Set());
    setSelection([]);
    setIsSelecting(false);
    setHistory([]);
    setScore(0);
    setTimeLeft(DIFFICULTY_LEVELS[levelKey].duration);
  }, []);

  React.useEffect(() => {
    startNewGame('easy');
  }, [startNewGame]);

  React.useEffect(() => {
    const timerId = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  React.useEffect(() => {
    if (timeLeft === 0) {
      setIsSelecting(false);
      setSelection([]);
    }
  }, [timeLeft]);

  const evaluateSelection = React.useCallback(
    (path) => {
      if (!path.length || !grid.length) {
        return;
      }
      const letters = path
        .map(({ row, col }) => (grid[row] && grid[row][col] ? grid[row][col] : ''))
        .join('');
      if (letters.length < 2) {
        setHistory((prev) => [
          { label: letters || 'Single tile', status: 'miss', timestamp: Date.now() },
          ...prev
        ].slice(0, HISTORY_LIMIT));
        return;
      }
      const reversed = letters.split('').reverse().join('');
      const match = words.find(
        (word) =>
          !foundWordIds.has(word.id) &&
          (word.sanitized === letters || word.sanitized === reversed)
      );

      if (match) {
        setFoundWordIds((prev) => {
          const next = new Set(prev);
          next.add(match.id);
          return next;
        });
        setScore((prev) => prev + DIFFICULTY_LEVELS[difficulty].points);
        setHistory((prev) => [
          { label: match.city, status: 'ok', timestamp: Date.now() },
          ...prev
        ].slice(0, HISTORY_LIMIT));
      } else {
        setHistory((prev) => [
          { label: letters, status: 'miss', timestamp: Date.now() },
          ...prev
        ].slice(0, HISTORY_LIMIT));
      }
    },
    [grid, words, foundWordIds, difficulty]
  );

  const finalizeSelection = React.useCallback(() => {
    if (!isSelecting) return;
    setIsSelecting(false);
    setSelection((current) => {
      evaluateSelection(current);
      return [];
    });
  }, [isSelecting, evaluateSelection]);

  React.useEffect(() => {
    window.addEventListener('pointerup', finalizeSelection);
    return () => window.removeEventListener('pointerup', finalizeSelection);
  }, [finalizeSelection]);

  const handlePointerDown = (row, col) => (event) => {
    event.preventDefault();
    if (timeLeft === 0) return;
    setIsSelecting(true);
    setSelection([{ row, col }]);
  };

  const handlePointerEnter = (row, col) => (event) => {
    if (!isSelecting) return;
    event.preventDefault();
    setSelection((prev) => {
      const exists = prev.some((cell) => cell.row === row && cell.col === col);
      if (exists) return prev;
      const nextCell = { row, col };
      if (!prev.length) {
        return [nextCell];
      }
      const last = prev[prev.length - 1];
      if (!areAdjacent(last, nextCell)) {
        return prev;
      }
      if (prev.length === 1) {
        return [...prev, nextCell];
      }
      const dirRow = Math.sign(prev[1].row - prev[0].row);
      const dirCol = Math.sign(prev[1].col - prev[0].col);
      if (nextCell.row === last.row + dirRow && nextCell.col === last.col + dirCol) {
        return [...prev, nextCell];
      }
      return prev;
    });
  };

  const handleDifficultyChange = (event) => {
    const nextLevel = event.target.value;
    setDifficulty(nextLevel);
    startNewGame(nextLevel);
  };

  const handleNewGrid = () => {
    startNewGame(difficulty);
  };

  const selectionKeys = React.useMemo(() => {
    return new Set(selection.map(({ row, col }) => cellKey(row, col)));
  }, [selection]);

  const foundKeyColors = React.useMemo(() => {
    const keyMap = new Map();
    words.forEach((word) => {
      if (foundWordIds.has(word.id)) {
        word.path.forEach(({ row, col }) => keyMap.set(cellKey(row, col), word.color));
      }
    });
    return keyMap;
  }, [words, foundWordIds]);

  const totalDuration = DIFFICULTY_LEVELS[difficulty].duration;
  const progressPercent = Math.round((timeLeft / totalDuration) * 100);
  const accuracy = words.length ? Math.round((foundWordIds.size / words.length) * 100) : 0;

  return (
    <div className="app-shell">
      <header>
        <h1>Euro Word Hunter</h1>
        <p>Find the hidden European cities before the timer runs out.</p>
      </header>

      <section className="status-bar">
        <article className="status-chip">
          <label htmlFor="difficulty">Difficulty</label>
          <select id="difficulty" value={difficulty} onChange={handleDifficultyChange}>
            {Object.entries(DIFFICULTY_LEVELS).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </article>
        <article className="status-chip">
          <span>Time Left</span>
          <strong>{formatTime(timeLeft)}</strong>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </article>
        <article className="status-chip">
          <span>Score</span>
          <strong>{score}</strong>
        </article>
        <article className="status-chip">
          <span>Accuracy</span>
          <strong>{accuracy}%</strong>
        </article>
      </section>

      <section className="board-wrapper">
        <div className="board-info">
          <p>
            Words Found: {foundWordIds.size}/{words.length || '-'}
          </p>
          <p className="accuracy">Remaining: {Math.max(words.length - foundWordIds.size, 0)}</p>
        </div>

        {grid.length ? (
          <div className="board-grid">
            {grid.map((row, rowIndex) =>
              row.map((letter, colIndex) => {
                const key = cellKey(rowIndex, colIndex);
                const foundColor = foundKeyColors.get(key);
                const isFound = Boolean(foundColor);
                const isSelected = !isFound && selectionKeys.has(key);
                const tileClass = ['tile'];
                if (isFound) tileClass.push('found');
                if (isSelected) tileClass.push('selected');
                const tileStyle = {};
                if (isFound) {
                  tileStyle.backgroundColor = foundColor;
                  tileStyle.borderColor = foundColor;
                  tileStyle.color = '#0f172a';
                }
                return (
                  <div
                    key={key}
                    className={tileClass.join(' ')}
                    onPointerDown={handlePointerDown(rowIndex, colIndex)}
                    onPointerEnter={handlePointerEnter(rowIndex, colIndex)}
                    style={tileStyle}
                  >
                    {letter}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <p>Preparing your puzzle…</p>
        )}

        <div className="word-chips">
          {words.length === 0 && <p className="word-placeholder">No cities yet. Start a new grid!</p>}
          {words.map((word) => (
            <div
              key={word.id}
              className={`word-chip ${foundWordIds.has(word.id) ? 'complete' : ''}`}
              style={
                foundWordIds.has(word.id)
                  ? { backgroundColor: word.color, borderColor: word.color }
                  : undefined
              }
            >
              <span>{word.city}</span>
              <small>{word.sanitized.length} letters</small>
            </div>
          ))}
        </div>

        <div className="actions">
          <button type="button" onClick={handleNewGrid}>
            New Grid
          </button>
        </div>
      </section>

      <section className="history-panel">
        <h3>Recent Attempts</h3>
        {history.length === 0 ? (
          <p className="word-placeholder">Start hunting to build your timeline.</p>
        ) : (
          <ul>
            {history.map((entry) => (
              <li key={entry.timestamp}>
                <span>{entry.label}</span>
                <span className={`history-tag ${entry.status}`}>
                  {entry.status === 'ok' ? 'Found' : 'Miss'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
