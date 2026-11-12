import { openSnake, closeSnake } from './snake/snake.js';
import { openBrickBreaker, closeBrickBreaker } from './brick-breaker/brick-breaker.js';

const playableGames = {
  snake: { panel: '.snake-panel', open: openSnake, close: closeSnake, controls: 'Arrow keys / WASD to move. Space to pause.' },
  brick: { panel: '.brick-panel', open: openBrickBreaker, close: closeBrickBreaker, controls: 'Left / Right or A / D to move. Space to launch / pause.' },
};
let selectedGame;

// Add future games here; the list scrolls without moving the menu.
const games = [
  { id: 'memory', name: 'Memory Match', symbol: '▦', description: 'Flip cards and find matching pairs. Train your memory with Boi!' },
  { id: 'snake', name: 'Snake', symbol: '▰', description: 'Collect snacks, grow your snake, and try to beat your best score.' },
  { id: 'brick', name: 'Brick Breaker', symbol: '▦', description: 'Bounce the ball with your paddle and break every brick. You have 3 lives!' },
  { id: 'puzzle', name: 'Tile Puzzle', symbol: '▧', description: 'Slide the tiles into place and put the picture back together.' },
];

const list = document.querySelector('.game-list');
const title = document.querySelector('#game-title');
const description = document.querySelector('.game-description');
const playButton = document.querySelector('.play-game');

function selectGame(game) {
  selectedGame = game;
  for (const card of list.children) {
    card.setAttribute('aria-pressed', String(card.dataset.game === game.id));
  }
  title.textContent = game.name;
  description.textContent = game.description;
  const playable = playableGames[game.id];
  playButton.hidden = !playable;
  playButton.textContent = `PLAY ${game.name.toUpperCase()}`;
  document.querySelector('.game-status').textContent = playable ? 'READY' : 'PLANNED';
  document.querySelector('.game-availability').textContent = playable
    ? playable.controls
    : 'Coming soon. This game is a preview idea.';
}

for (const game of games) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'game-card';
  card.dataset.game = game.id;
  card.setAttribute('aria-pressed', 'false');
  for (const [className, text] of [
    ['game-symbol', game.symbol],
    ['game-name', game.name],
    ['game-card-status', playableGames[game.id] ? 'PLAY NOW' : 'COMING SOON'],
  ]) {
    const label = document.createElement('span');
    label.className = className;
    label.textContent = text;
    if (className === 'game-symbol') label.setAttribute('aria-hidden', 'true');
    card.append(label);
  }
  card.addEventListener('click', () => selectGame(game));
  list.append(card);
}

selectGame(games[0]);

playButton.addEventListener('click', () => {
  const game = playableGames[selectedGame.id];
  if (!game) return;
  document.querySelector('.game-picker').hidden = true;
  document.querySelector(game.panel).hidden = false;
  game.open();
});
for (const game of Object.values(playableGames)) {
  document.querySelector(`${game.panel} .game-back`).addEventListener('click', () => {
    game.close();
    document.querySelector(game.panel).hidden = true;
    document.querySelector('.game-picker').hidden = false;
    playButton.focus();
  });
}
