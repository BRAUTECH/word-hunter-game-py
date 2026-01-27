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

// Shuffle array utility
function shuffleArray(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Try to place a word in a specific direction
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

// Try to place a word, maximizing orientation variety
const tryPlaceWord = (grid, word, ownerId, usedDirections) => {
  // Shuffle directions for randomness
  const directions = shuffleArray(DIRECTIONS);
  // Try unused directions first
  for (const direction of directions) {
    if (!usedDirections.has(direction)) {
      const path = tryPlaceWordInDirection(grid, word, ownerId, direction);
      if (path) {
        usedDirections.add(direction);
        return path;
      }
    }
  }
  // If all directions used, allow repeats
  for (const direction of directions) {
    const path = tryPlaceWordInDirection(grid, word, ownerId, direction);
    if (path) {
      return path;
    }
  }
  return null;
};

export {
  EUROPEAN_CITIES,
  DIFFICULTY_LEVELS,
  GRID_SIZE,
  WORDS_PER_BOARD,
  normalizeWord,
  sanitizeCity,
  randomLetter,
  createEmptyGrid,
  tryPlaceWord
};

