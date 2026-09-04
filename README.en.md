# 🏆 Tournament Management System

*(Türkçe sürüm: [README.md](README.md))*

An Electron desktop application for managing Football and Volleyball tournaments, designed to run **fully offline**. It uses no internet connection, external CDN, online fonts, or third-party libraries — all data is stored locally on the user's computer.

## Features

- **Setup Wizard**: Create a tournament in 3 steps — Sport (Football/Volleyball) → Format (Groups + Knockout / Direct Knockout) → Configuration (team names, number of groups, etc.).
- **Draw Ceremony**: Optional animated/sound-accompanied draw simulation, or an instant draw.
- **Group Stage**: Automatic single round-robin fixtures with a live standings table.
- **Knockout Bracket**: Automatic bye distribution for non-power-of-2 team counts, plus a special "3 teams remaining" rule (one bye + one semifinal).
- **Moderator Panel**: Disqualify a team — matches already played are preserved, all unplayed matches are awarded to the opponent by forfeit (walkover).
- **Team Locking**: Teams can be edited freely until the first match is played; editing is then locked.
- **Detailed Score Entry**: Football supports regulation/extra-time/penalty flow, volleyball uses set scores; optional goal/card details power a Top Scorers and Card/Discipline table.
- **Print / PDF**: One-click A4-ready printout (can be saved as PDF via Windows' built-in "Microsoft Print to PDF").
- **JSON Backup**: Export/import a single tournament or the whole database (portable via USB flash drive).
- **Champion Celebration**: Full-screen confetti animation and trophy screen.

## Project Structure

```
├── main.js              # Electron main process (window, menu, save-file dialog)
├── index.html            # App shell (all views are rendered here via JS)
├── icon.ico               # App / build icon
├── css/
│   └── style.css          # All UI styling (navy/white/green theme)
├── js/
│   ├── utils.js            # Helpers, localStorage, Web Audio sound effects
│   ├── model.js             # Data model: tournament, draw, fixtures, standings, disqualification logic
│   ├── render.js            # All UI render functions and screen flows
│   └── app.js                # Event delegation (button clicks), JSON export/import, bootstrap
└── package.json
```

## Development

```bash
npm install
npm start
```

## Build Windows Portable (.exe)

```bash
npm run build:win
```

The output is generated in `dist/` as `TurnuvaYonetimSistemi-Portable.exe`. This file runs standalone, no installation required.

> **Note:** `icon.ico` is currently a placeholder icon. Replace it with your own logo (keeping the filename `icon.ico`) before delivering to the client.

## Data Storage

All tournament data is stored locally in the browser engine's (Chromium/Electron) `localStorage`, on the user's own computer. No internet connection is required at any stage.
