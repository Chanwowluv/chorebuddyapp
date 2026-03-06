
@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;800&display=swap');

/* ─── CSS Variables (set by ThemeProvider via data-theme attribute) ────────── */

:root {
  --color-primary: #2B59C3;
  --color-primary-hover: #24479c;
  --color-accent: #C3B1E1;
  --color-brand-dark: #5E3B85;
  --color-bg: #FDFBF5;
}

[data-theme="ocean"] {
  --color-primary: #2B59C3;
  --color-primary-hover: #24479c;
}

[data-theme="sunset"] {
  --color-primary: #FF6B35;
  --color-primary-hover: #fa5a1f;
}

[data-theme="forest"] {
  --color-primary: #3A7D44;
  --color-primary-hover: #2e6336;
}

[data-theme="lavender"] {
  --color-primary: #C3B1E1;
  --color-primary-hover: #b19dcb;
}

[data-theme="candy"] {
  --color-primary: #F7A1C4;
  --color-primary-hover: #f590b8;
}

.theme-primary { color: var(--color-primary); }
.theme-primary-bg { background-color: var(--color-primary); }

/* ─── Funky card system ───────────────────────────────────────────────────── */

.funky-card {
  background-color: white;
  border: 3px solid var(--color-brand-dark);
  box-shadow: 6px 6px 0px var(--color-brand-dark);
  border-radius: 24px;
  transition: all 0.2s ease-out;
}

.funky-card-hover:hover {
  transform: translate(2px, 2px);
  box-shadow: 4px 4px 0px var(--color-brand-dark);
}

/* ─── Funky button system ─────────────────────────────────────────────────── */

.funky-button {
  border: 3px solid var(--color-brand-dark);
  box-shadow: 4px 4px 0px var(--color-brand-dark);
  border-radius: 16px;
  transition: all 0.2s ease-out;
}

.funky-button:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px var(--color-brand-dark);
}

.funky-button:active {
  transform: translate(4px, 4px);
  box-shadow: 0px 0px 0px var(--color-brand-dark);
}

/* ─── Typography ──────────────────────────────────────────────────────────── */

.header-font {
  font-family: 'Fredoka One', cursive;
  letter-spacing: -0.01em;
}

.body-font {
  font-family: 'Nunito', sans-serif;
  font-weight: 600;
}

.body-font-light {
  font-family: 'Nunito', sans-serif;
  font-weight: 400;
}

/* ─── Scrollbar utilities ─────────────────────────────────────────────────── */

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
