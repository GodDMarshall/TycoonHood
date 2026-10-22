// Line-icon sprite in the reference's fine gold-stroke style, plus the lotus
// mandala mark. Stroke icons inherit `currentColor`; use icon(name) to place one.

const S = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

const symbols = {
  // ---- navigation / UI ----
  arrow: `<path ${S} d="M5 12h14M13 6l6 6-6 6"/>`,
  'arrow-left': `<path ${S} d="M19 12H5M11 6l-6 6 6 6"/>`,
  'arrow-up-right': `<path ${S} d="M7 17 17 7M8 7h9v9"/>`,
  chev: `<path ${S} stroke-width="2" d="m6 9 6 6 6-6"/>`,
  close: `<path ${S} d="M6 6l12 12M18 6 6 18"/>`,
  menu: `<path ${S} d="M4 7h16M4 12h16M4 17h10"/>`,
  search: `<circle ${S} cx="11" cy="11" r="6.5"/><path ${S} d="m20 20-4.2-4.2"/>`,
  play: `<path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z"/>`,
  'play-circle': `<circle ${S} cx="12" cy="12" r="9"/><path fill="currentColor" d="M10 8.5v7l6-3.5-6-3.5Z"/>`,
  external: `<path ${S} d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>`,
  plus: `<path ${S} d="M12 5v14M5 12h14"/>`,
  check: `<path ${S} d="m5 12 4.5 4.5L19 7"/>`,
  // ---- contact / info ----
  pin: `<path ${S} d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z"/><circle ${S} cx="12" cy="10" r="2.5"/>`,
  phone: `<path ${S} d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>`,
  mail: `<rect ${S} x="3" y="5" width="18" height="14" rx="2"/><path ${S} d="m3 7 9 6 9-6"/>`,
  clock: `<circle ${S} cx="12" cy="12" r="9"/><path ${S} d="M12 7v5l3 2"/>`,
  calendar: `<rect ${S} x="3.5" y="5" width="17" height="15.5" rx="2"/><path ${S} d="M3.5 10h17M8 3v4M16 3v4"/><path ${S} d="M8 14h2M14 14h2M8 17.5h2"/>`,
  globe: `<circle ${S} cx="12" cy="12" r="9"/><path ${S} d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z"/>`,
  live: `<circle fill="currentColor" cx="12" cy="12" r="2.4"/><path ${S} d="M8 8a5.6 5.6 0 0 0 0 8M16 8a5.6 5.6 0 0 1 0 8M5.2 5.2a9.6 9.6 0 0 0 0 13.6M18.8 5.2a9.6 9.6 0 0 1 0 13.6"/>`,
  user: `<circle ${S} cx="12" cy="8" r="4"/><path ${S} d="M4 21a8 8 0 0 1 16 0"/>`,
  download: `<path ${S} d="M12 4v11M7 10l5 5 5-5M5 20h14"/>`,
  info: `<circle ${S} cx="12" cy="12" r="9"/><path ${S} d="M12 11v6M12 7.5v.5"/>`,
  // ---- travel ----
  car: `<path ${S} d="M5 16V11l2-5h10l2 5v5M3.5 16h17v3h-3M3.5 16v3h3"/><circle ${S} cx="7.5" cy="13.5" r=".6"/><circle ${S} cx="16.5" cy="13.5" r=".6"/>`,
  bus: `<rect ${S} x="5" y="3.5" width="14" height="14" rx="2.5"/><path ${S} d="M5 11h14M8 21v-3.5M16 21v-3.5"/><circle ${S} cx="8.5" cy="14.3" r=".6"/><circle ${S} cx="15.5" cy="14.3" r=".6"/>`,
  plane: `<path ${S} d="M21 15.5 13.5 11V5.5a1.5 1.5 0 0 0-3 0V11L3 15.5V17l7.5-2v4l-2 1.5V22l3.5-1 3.5 1v-1.5l-2-1.5v-4L21 17Z"/>`,
  train: `<rect ${S} x="5" y="3" width="14" height="14" rx="3"/><path ${S} d="M5 10h14M8 21l2-4M16 21l-2-4"/><circle ${S} cx="9" cy="13.5" r=".6"/><circle ${S} cx="15" cy="13.5" r=".6"/>`,
  bed: `<path ${S} d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3"/><circle ${S} cx="7" cy="10.5" r="1.8"/>`,
  compass: `<circle ${S} cx="12" cy="12" r="9"/><path ${S} d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>`,
  map: `<path ${S} d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4ZM9 4v14M15 6v14"/>`,
  // ---- seva / spirituality ----
  lotus: `<path ${S} d="M12 6c1.8 2 2.6 4.1 2.6 6.2S13.7 16.4 12 18c-1.7-1.6-2.6-3.6-2.6-5.8S10.2 8 12 6Z"/><path ${S} d="M12 18c-2.6.4-5.6-.6-7.5-3.5 2.2-.6 4.4-.3 6 .9M12 18c2.6.4 5.6-.6 7.5-3.5-2.2-.6-4.4-.3-6 .9M3 19h18"/>`,
  temple: `<path ${S} d="M12 2.5v2M8.5 9 12 4.5 15.5 9M7 9h10l-1 3H8L7 9ZM6 12h12v8H6zM10 20v-4a2 2 0 0 1 4 0v4M4 20h16"/>`,
  diya: `<path ${S} d="M12 3c1.3 1.6 2 2.9 2 4a2 2 0 0 1-4 0c0-1.1.7-2.4 2-4Z"/><path ${S} d="M3.5 12.5h17c-.6 3.7-4.2 6-8.5 6s-7.9-2.3-8.5-6ZM8 21h8"/>`,
  flame: `<path ${S} d="M12 3c3 3.2 5 6 5 9.3A5 5 0 0 1 7 12.3c0-1.7.7-3.1 1.8-4.3.2 1.7 1 2.8 2.2 3.3C10.6 8.7 11 5.8 12 3Z"/>`,
  namaste: `<path ${S} d="M12 21V9.5L10 4.8a1.2 1.2 0 0 0-2.2.8L9 11l-3.3 3.6a3 3 0 0 0-.7 2V21M12 21V9.5l2-4.7a1.2 1.2 0 0 1 2.2.8L15 11l3.3 3.6a3 3 0 0 1 .7 2V21"/>`,
  heart: `<path ${S} d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>`,
  'heart-hand': `<path ${S} d="M12.5 11.5S9 9.5 9 7a2 2 0 0 1 3.5-1.3A2 2 0 0 1 16 7c0 2.5-3.5 4.5-3.5 4.5Z"/><path ${S} d="M3 14h3l3.5 1.5h3.2a1.3 1.3 0 0 1 0 2.6H9.5M12.7 18.1l5-2.2a1.5 1.5 0 0 1 1.5 2.5L13 21.5H3"/>`,
  book: `<path ${S} d="M12 6.5c-2-1.6-4.6-2-8-1.8v13c3.4-.2 6 .2 8 1.8 2-1.6 4.6-2 8-1.8v-13c-3.4-.2-6 .2-8 1.8ZM12 6.5v13"/>`,
  music: `<path ${S} d="M9 18V6l11-2v12"/><circle ${S} cx="6.5" cy="18" r="2.5"/><circle ${S} cx="17.5" cy="16" r="2.5"/>`,
  veena: `<circle ${S} cx="6" cy="17" r="3.2"/><circle ${S} cx="18" cy="6" r="2.4"/><path ${S} d="M8.3 14.7 16.2 7.8M8 18.6l9.5-10"/>`,
  school: `<path ${S} d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9ZM6 11v5c3.6 2.6 8.4 2.6 12 0v-5M21.5 9v5"/>`,
  medical: `<rect ${S} x="3.5" y="6.5" width="17" height="13.5" rx="2"/><path ${S} d="M9 6.5V4.5h6v2M12 10v6M9 13h6"/>`,
  cow: `<path ${S} d="M5 7.5 3 5.5M19 7.5l2-2M6 7.5h12l-.8 5.2a5.2 5.2 0 0 1-10.4 0L6 7.5Z"/><path ${S} d="M9.5 16.3V20M14.5 16.3V20"/><circle fill="currentColor" cx="9.6" cy="11" r=".7"/><circle fill="currentColor" cx="14.4" cy="11" r=".7"/>`,
  bird: `<path ${S} d="M16 6.5a2.5 2.5 0 0 1 2.5 2.5L21 9.8l-2.5 1c-.4 5-4 8.2-9 8.2H3l4-3.2c-1.6-3.6-.5-7.8 3-9.8 1.6-.9 3.2-.6 4.4.5"/><circle fill="currentColor" cx="16.2" cy="8.6" r=".7"/>`,
  tree: `<path ${S} d="M12 21v-6M12 15c-4 0-6.5-2.3-6.5-5.3 0-2.4 1.6-3.9 3.4-4.3C9.6 3.6 10.7 3 12 3s2.4.6 3.1 2.4c1.8.4 3.4 1.9 3.4 4.3 0 3-2.5 5.3-6.5 5.3ZM12 15l-3-3M12 13l3-3"/>`,
  yoga: `<circle ${S} cx="12" cy="4.8" r="1.8"/><path ${S} d="M12 8v6M6 10.5l6 1.5 6-1.5M8 20l4-6 4 6M5 20h14"/>`,
  sparkle: `<path ${S} d="M12 3c.5 4.6 2.4 6.5 7 7-4.6.5-6.5 2.4-7 7-.5-4.6-2.4-6.5-7-7 4.6-.5 6.5-2.4 7-7ZM19 15.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5Z"/>`,
  sun: `<circle ${S} cx="12" cy="12" r="4"/><path ${S} d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>`,
  moon: `<path ${S} d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>`,
  // ---- media ----
  video: `<rect ${S} x="3" y="6" width="13" height="12" rx="2"/><path ${S} d="m16 10.5 5-3v9l-5-3"/>`,
  headphones: `<path ${S} d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect ${S} x="3" y="14" width="4.5" height="6.5" rx="1.5"/><rect ${S} x="16.5" y="14" width="4.5" height="6.5" rx="1.5"/>`,
  photo: `<rect ${S} x="3" y="5" width="18" height="14" rx="2"/><circle ${S} cx="8.5" cy="10" r="1.8"/><path ${S} d="m21 16-5-5-8 8"/>`,
  camera: `<path ${S} d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4V8Z"/><circle ${S} cx="12" cy="13.2" r="3.4"/>`,
  article: `<rect ${S} x="4.5" y="3" width="15" height="18" rx="2"/><path ${S} d="M8 7.5h8M8 11h8M8 14.5h5"/>`,
  mobile: `<rect ${S} x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path ${S} d="M11 18.5h2"/>`,
  mic: `<rect ${S} x="9" y="3" width="6" height="11" rx="3"/><path ${S} d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>`,
  // ---- brands (filled) ----
  wa: `<path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z"/>`,
  fb: `<path fill="currentColor" d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5Z"/>`,
  tg: `<path fill="currentColor" d="M21.5 3.5 2.8 10.7c-1 .4-1 1.6 0 1.9l4.7 1.5 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.5 4.9 3.6c.6.4 1.4.1 1.6-.6l3.2-15.4c.2-.9-.7-1.6-1.6-1.2ZM9.6 14.1l8.6-6.9-6.9 8.3-.3 3-1.4-4.4Z"/>`,
  yt: `<path fill="currentColor" d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-3.8 31 31 0 0 0-.4-3.8ZM10 15V9l5.2 3L10 15Z"/>`,
  ig: `<rect ${S} x="3.5" y="3.5" width="17" height="17" rx="5"/><circle ${S} cx="12" cy="12" r="4"/><circle fill="currentColor" cx="17.2" cy="6.8" r="1"/>`,
  spotify: `<path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.4a.6.6 0 0 1-.9.2c-2.4-1.5-5.4-1.8-8.9-1a.6.6 0 1 1-.3-1.2c3.8-.9 7.1-.5 9.8 1.1.3.2.4.6.3.9Zm1.2-2.7a.8.8 0 0 1-1 .3c-2.7-1.7-6.9-2.2-10.2-1.2a.8.8 0 0 1-.4-1.5c3.7-1.1 8.3-.6 11.4 1.4.3.2.4.7.2 1Zm.1-2.8C14.7 9 9.4 8.8 6.3 9.7a.9.9 0 1 1-.5-1.8c3.5-1.1 9.4-.8 13.1 1.4a.9.9 0 0 1-1 1.6Z"/>`,
  apple: `<path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.5 2-3.6a4.3 4.3 0 0 0-3.4-1.8c-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8a4.5 4.5 0 0 0-3.8 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3s1.6-.7 3-.7 1.8.7 3 .7 2-1.1 2.8-2.3a10 10 0 0 0 1.3-2.6 4 4 0 0 1-2.5-3.7ZM14.1 5.5A4 4 0 0 0 15 2.6a4.2 4.2 0 0 0-2.8 1.4 3.9 3.9 0 0 0-1 2.8 3.5 3.5 0 0 0 2.9-1.3Z"/>`,
};

// The lotus mandala: two rings of eight petals around a seed, drawn with
// fine strokes so it reads as gold line-art at any size.
function petals(count, len, width, inner, rot = 0) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = rot + (360 / count) * i;
    out.push(`<path transform="rotate(${a})" d="M0 ${-inner} C ${width} ${-inner - len * 0.35} ${width} ${-inner - len * 0.75} 0 ${-inner - len} C ${-width} ${-inner - len * 0.75} ${-width} ${-inner - len * 0.35} 0 ${-inner}Z"/>`);
  }
  return out.join('');
}
export const mandala = `<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
  <circle r="46" opacity=".55"/><circle r="49.5" stroke-dasharray="1 4" opacity=".7"/>
  ${petals(16, 13, 4.2, 30, 11.25)}
  ${petals(8, 22, 8.5, 9)}
  ${petals(8, 14, 5.5, 9, 22.5)}
  <circle r="8.5"/><circle r="4" fill="currentColor" stroke="none"/>
</g>`;

symbols.mandala = mandala;

export const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${
  Object.entries(symbols).map(([id, body]) =>
    id === 'mandala'
      ? `<symbol id="i-${id}" viewBox="-52 -52 104 104">${body}</symbol>`
      : `<symbol id="i-${id}" viewBox="0 0 24 24">${body}</symbol>`).join('')
}</svg>`;

export function icon(name, size = 22, cls = '') {
  return `<svg class="ico${cls ? ' ' + cls : ''}" width="${size}" height="${size}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}

export const iconNames = Object.keys(symbols);
