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

const tryPlaceWord = (grid, word, ownerId) => {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
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

    if (!fits) {
      continue;
    }

    path.forEach(({ row, col }, letterIndex) => {
      grid[row][col].letter = word[letterIndex];
      grid[row][col].owners = [...grid[row][col].owners, ownerId];
    });

    return path;
  }

  return null;
};

const generateBoardForTargets = (targets) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const grid = createEmptyGrid();
    const placedTargets = [];
    let success = true;

    targets.forEach((target) => {
      if (!success) {
        return;
      }
      const path = tryPlaceWord(grid, target.normalized, target.id);
      if (!path) {
        success = false;
        return;
      }
      placedTargets.push({ ...target, path });
    });

    if (!success) {
      continue;
    }

    const board = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const cell = grid[row][col];
        const letter = cell.letter || randomLetter();
        board.push({
          id: `${row}-${col}`,
          row,
          col,
          letter,
          found: false,
          occupiedBy: cell.owners
        });
      }
    }

    return { board, targets: placedTargets };
  }

  throw new Error('Unable to generate board for these cities.');
};

function App() {
  const [difficulty, setDifficulty] = React.useState('medium');
  const [isRunning, setIsRunning] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(DIFFICULTY_LEVELS.medium.duration);
  const [score, setScore] = React.useState(0);
  const [attempts, setAttempts] = React.useState(0);
  const [foundCities, setFoundCities] = React.useState([]);
  const [history, setHistory] = React.useState([]);
  const [message, setMessage] = React.useState('Press Start then drag across letters to guess.');
  const [remainingCities, setRemainingCities] = React.useState(EUROPEAN_CITIES);
  const [activeTargets, setActiveTargets] = React.useState([]);
  const [boardCells, setBoardCells] = React.useState([]);
  const [selection, setSelection] = React.useState([]);
  const [isSelecting, setIsSelecting] = React.useState(false);

  const previousCitiesRef = React.useRef([]);
  const selectionRef = React.useRef([]);
  const directionRef = React.useRef(null);

  const level = DIFFICULTY_LEVELS[difficulty];

  React.useEffect(() => {
    if (!isRunning) {
      setTimeLeft(level.duration);
    }
  }, [difficulty, isRunning, level.duration]);

  const handleOutOfTime = React.useCallback(() => {
    setIsRunning(false);
    setMessage('Time is up! Restart to continue the hunt.');
  }, []);

  React.useEffect(() => {
    if (!isRunning) {
      return undefined;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleOutOfTime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, handleOutOfTime]);

  const selectBatch = React.useCallback((pool) => {
    const work = [...pool];
    const batch = [];
    while (work.length && batch.length < Math.min(WORDS_PER_BOARD, pool.length)) {
      const avoid = previousCitiesRef.current;
      const filtered = work.filter((city) => !avoid.includes(city));
      const source = filtered.length ? filtered : work;
      const pickIndex = Math.floor(Math.random() * source.length);
      const city = source[pickIndex];
      batch.push(city);
      const removalIndex = work.indexOf(city);
      work.splice(removalIndex, 1);
      previousCitiesRef.current = [...avoid.slice(-9), city];
    }
    return { batch, rest: work };
  }, []);

  const prepareBoard = React.useCallback(
    (poolOverride) => {
      const source = poolOverride ? [...poolOverride] : [...remainingCities];
      if (!source.length) {
        setBoardCells([]);
        setActiveTargets([]);
        return;
      }

      const { batch, rest } = selectBatch(source);
      if (!batch.length) {
        setBoardCells([]);
        setActiveTargets([]);
        return;
      }

      try {
        const baseTargets = batch.map((city) => ({
          id: `${city}-${Math.random().toString(36).slice(2, 8)}`,
          city,
          normalized: sanitizeCity(city),
          found: false,
          path: []
        }));
        const { board, targets } = generateBoardForTargets(baseTargets);
        setBoardCells(board);
        setActiveTargets(targets);
        setRemainingCities(rest);
      } catch (error) {
        console.error(error);
        setMessage('Could not build the board. Please restart.');
        setIsRunning(false);
      }
    },
    [remainingCities, selectBatch]
  );

  const startGame = React.useCallback(() => {
    const pool = [...EUROPEAN_CITIES];
    setScore(0);
    setAttempts(0);
    setHistory([]);
    setFoundCities([]);
    setMessage('Drag letters in a straight line to connect each city.');
    setRemainingCities(pool);
    previousCitiesRef.current = [];
    selectionRef.current = [];
    directionRef.current = null;
    setSelection([]);
    setIsSelecting(false);
    setTimeLeft(level.duration);
    setIsRunning(true);
    prepareBoard(pool);
  }, [level.duration, prepareBoard]);

  const stopGame = () => {
    if (!isRunning) {
      return;
    }
    setIsRunning(false);
    setMessage('Hunt paused. Hit Resume when you are ready again.');
  };

  const handlePointerDown = React.useCallback(
    (event, cell) => {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      if (!isRunning || !activeTargets.length) {
        return;
      }
      const startPath = [cell];
      setIsSelecting(true);
      selectionRef.current = startPath;
      directionRef.current = null;
      setSelection(startPath);
    },
    [activeTargets.length, isRunning]
  );

  const handlePointerEnter = React.useCallback(
    (event, cell) => {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
      if (!isSelecting || !isRunning) {
        return;
      }
      setSelection((prev) => {
        if (!prev.length) {
          return prev;
        }
        if (prev.some((item) => item.id === cell.id)) {
          return prev;
        }
        const last = prev[prev.length - 1];
        const rowDiff = cell.row - last.row;
        const colDiff = cell.col - last.col;
        if (Math.abs(rowDiff) > 1 || Math.abs(colDiff) > 1) {
          return prev;
        }
        if (rowDiff === 0 && colDiff === 0) {
          return prev;
        }
        const stepRow = Math.sign(rowDiff);
        const stepCol = Math.sign(colDiff);
        if (stepRow === 0 && stepCol === 0) {
          return prev;
        }
        const currentDirection = directionRef.current;
        if (!currentDirection) {
          directionRef.current = { row: stepRow, col: stepCol };
        } else if (
          currentDirection.row !== stepRow ||
          currentDirection.col !== stepCol
        ) {
          return prev;
        }
        const next = [...prev, cell];
        selectionRef.current = next;
        return next;
      });
    },
    [isRunning, isSelecting]
  );

  const finalizeSelection = React.useCallback(() => {
    if (!isSelecting) {
      return;
    }
    setIsSelecting(false);
    const path = selectionRef.current;
    selectionRef.current = [];
    directionRef.current = null;
    setSelection([]);

    if (!path.length) {
      return;
    }

    const attempt = path.map((cell) => cell.letter).join('');
    const normalizedAttempt = attempt.replace(/[^A-Z]/g, '');
    const reversed = [...normalizedAttempt].reverse().join('');
    const targetHit = activeTargets.find(
      (target) =>
        !target.found &&
        (target.normalized === normalizedAttempt || target.normalized === reversed)
    );
    const success = Boolean(targetHit);

    setAttempts((prev) => prev + 1);
    setHistory((prev) =>
      [
        {
          word: attempt,
          success,
          target: targetHit ? targetHit.city : '—'
        },
        ...prev
      ].slice(0, 5)
    );

    if (success && targetHit) {
      const updatedTargets = activeTargets.map((target) =>
        target.id === targetHit.id ? { ...target, found: true } : target
      );
      const pathSet = new Set(
        targetHit.path.map((node) => `${node.row}-${node.col}`)
      );
      setBoardCells((prev) =>
        prev.map((cell) =>
          pathSet.has(cell.id) ? { ...cell, found: true } : cell
        )
      );
      setActiveTargets(updatedTargets);
      const bonus = Math.round((timeLeft / level.duration) * 40);
      setScore((prev) => prev + level.points + bonus);
      setFoundCities((prev) =>
        prev.includes(targetHit.city) ? prev : [...prev, targetHit.city]
      );
      setMessage(`Great! ${targetHit.city} located.`);

      if (updatedTargets.every((target) => target.found)) {
        if (remainingCities.length === 0) {
          setIsRunning(false);
          setMessage('Legendary! All 50 cities discovered.');
        } else {
          prepareBoard();
        }
      }
    } else {
      setScore((prev) => Math.max(0, prev - 15));
      setMessage('That path does not form a city yet. Keep searching.');
    }
  }, [activeTargets, isSelecting, level.duration, level.points, prepareBoard, remainingCities.length, timeLeft]);

  React.useEffect(() => {
    const handlePointerUp = () => finalizeSelection();
    if (window.PointerEvent) {
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    return () => {
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [finalizeSelection]);

  const timerColor = timeLeft < 15 ? '#ef4444' : timeLeft < 40 ? '#f97316' : '#0f172a';
  const accuracy = attempts ? Math.round((foundCities.length / attempts) * 100) : 0;
  const progressPercent = Math.round(
    (foundCities.length / EUROPEAN_CITIES.length) * 100
  );
  const selectionIds = React.useMemo(
    () => new Set(selection.map((cell) => cell.id)),
    [selection]
  );
  const boardReady = boardCells.length > 0 && activeTargets.length > 0;

  const handlePrimaryAction = React.useCallback(() => {
    if (isRunning) {
      startGame();
      return;
    }
    if (boardReady) {
      setIsRunning(true);
      setMessage('Back to the hunt. Keep connecting cities.');
      return;
    }
    startGame();
  }, [boardReady, isRunning, startGame]);

  return (
    <div className="app-shell">
      <header>
        <h1>Euro Word Hunter</h1>
        <p>Drag across letters to connect every European city on the grid.</p>
      </header>

      <section className="status-bar">
        <div className="status-chip">
          <span>Timer</span>
          <strong style={{ color: timerColor }}>{timeLeft}s</strong>
        </div>
        <div className="status-chip">
          <span>Score</span>
          <strong>{score}</strong>
        </div>
        <div className="status-chip">
          <span>Found</span>
          <strong>
            {foundCities.length} / {EUROPEAN_CITIES.length}
          </strong>
        </div>
        <div className="status-chip">
          <label htmlFor="difficulty">Difficulty</label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
            disabled={isRunning}
          >
            {Object.entries(DIFFICULTY_LEVELS).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label} ({config.duration}s)
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="board-wrapper">
        <div className="board-info">
          <p>{message}</p>
          <p className="accuracy">Accuracy {accuracy}%</p>
        </div>
        <div className="board-grid">
          {(boardCells.length ? boardCells : Array.from({ length: GRID_SIZE ** 2 }, (_, index) => ({
            id: `placeholder-${index}`,
            row: 0,
            col: 0,
            letter: ' ',
            found: false
          }))).map((cell) => {
            const isSelected = selectionIds.has(cell.id);
            const tileClass = `tile${cell.found ? ' found' : ''}${isSelected ? ' selected' : ''}`;
            return (
              <div
                key={cell.id}
                className={tileClass}
                onPointerDown={(event) => handlePointerDown(event, cell)}
                onPointerEnter={(event) => handlePointerEnter(event, cell)}
                onPointerMove={(event) => handlePointerEnter(event, cell)}
              >
                {cell.letter}
              </div>
            );
          })}
        </div>
        <div className="progress-track" aria-label="Cities found progress">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      <section className="word-chips">
        {activeTargets.length === 0 ? (
          <p className="word-placeholder">Start the game to reveal your targets.</p>
        ) : (
          activeTargets.map((target) => (
            <div
              key={target.id}
              className={`word-chip ${target.found ? 'complete' : ''}`}
            >
              <span>{target.city}</span>
              <small>{target.found ? 'found' : `${target.normalized.length} letters`}</small>
            </div>
          ))
        )}
      </section>

      <section className="actions">
        <button onClick={handlePrimaryAction}>
          {isRunning ? 'Restart Board' : boardReady ? 'Resume Hunt' : 'Start Hunt'}
        </button>
        <button onClick={stopGame} disabled={!isRunning}>
          Pause
        </button>
      </section>

      <section className="history-panel">
        <h3>Recent Paths</h3>
        {history.length === 0 ? (
          <p>No guesses yet. Drag a path to begin.</p>
        ) : (
          <ul>
            {history.map((entry, index) => (
              <li key={`${entry.word}-${index}`}>
                <span>
                  {entry.word}{' '}
                  <em>{entry.target}</em>
                </span>
                <span className={`history-tag ${entry.success ? 'ok' : 'miss'}`}>
                  {entry.success ? 'MATCH' : 'MISS'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
