// Small, code-drawn pixel illustrations share the room's palette and dark outlines.
const drawings = {
  apple: '<path fill="#cf8064" d="M5 7h14v3h2v9h-3v3H6v-3H3v-9h2z"/><path fill="#627c4f" d="M11 3h2v5h-2zM13 2h5v3h-5z"/><path fill="#f4c39a" d="M6 10h3v6H6z"/>',
  tee: '<path fill="#a8bbcd" d="M7 4h3v3h4V4h3l6 5-4 5-2-2v10H7V12l-2 2-4-5z"/>',
  cap: '<path fill="#88a86c" d="M5 7h3V4h9v3h3v10H4V7z"/><path fill="#d7e6c7" d="M4 15h18v4H2v-3h2z"/>',
  cookie: '<path fill="#cf9d7c" d="M7 3h10v3h4v14h-4v3H7v-3H3V6h4z"/><path fill="#87664f" d="M7 7h3v3H7zM14 12h3v3h-3zM7 17h3v3H7zM16 5h3v3h-3z"/>',
  overalls: '<path fill="#a8bbcd" d="M5 3h4v7h6V3h4v20h-6v-7h-2v7H5z"/><path fill="#f0d69f" d="M7 10h2v2H7zM15 10h2v2h-2z"/><path fill="#bdd7d5" d="M10 12h4v3h-4z"/>',
  beanie: '<path fill="#cf9d7c" d="M5 9h3V5h8v4h3v12H5z"/><path fill="#f0d69f" d="M10 1h4v4h-4zM3 16h18v6H3z"/>',
  cake: '<path fill="#cf8064" d="M4 9h16v12H4z"/><path fill="#f9f5e7" d="M3 8h18v5H3zM4 16h16v3H4z"/><path fill="#cf8064" d="M10 3h5v5h-5z"/><path fill="#627c4f" d="M12 1h2v3h-2z"/>',
  sweater: '<path fill="#bdd7d5" d="M7 4h3v3h4V4h3l6 5-3 6-3-2v9H7v-9l-3 2-3-6z"/><path fill="#f9f5e7" d="M7 14h10v3H7z"/>',
  wizard: '<path fill="#a8bbcd" d="M11 2h3v4h3v6h3v8H5v-6h3V7h3z"/><path fill="#d0a8f8" d="M2 20h20v3H2z"/><path fill="#f0d69f" d="M12 10h3v3h-3zM7 17h3v3H7z"/>',
  crown: '<path fill="#e8c469" d="M3 5h3v4h3V3h6v6h3V5h3v16H3z"/><path fill="#cf8064" d="M10 14h4v4h-4z"/><path fill="#fff0a4" d="M4 19h16v2H4z"/>',
};
export function illustration(item) {
  const wrapper = document.createElement('span');
  wrapper.className = 'item-art';
  wrapper.setAttribute('aria-hidden', 'true');
  // All SVG markup comes from the fixed catalog above, never saved/user data.
  wrapper.innerHTML = `<svg viewBox="0 0 24 26" xmlns="http://www.w3.org/2000/svg"><g stroke="#454b3f" stroke-width="1" stroke-linejoin="miter">${drawings[item.icon]}</g></svg>`;
  return wrapper;
}
