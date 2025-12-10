# Giochi di parole

Applicazione React (Vite) con Tailwind CSS per esercitarsi con parole/definizioni da un CSV.

## Requisiti
- Node.js 18+

## Avvio locale
1. Installa le dipendenze: `npm install`
2. Avvia il dev server: `npm run dev`
3. Apri `http://localhost:5173` e carica un CSV con intestazione:
   `Parola,Accento,Definizione,Etimologia,Esempio,Data_Inserimento,Errori`

## Build produzione
- `npm run build`
- `npm run preview` per verificare la build.

## Pubblicazione su GitHub
1. `git init` (se serve) e committa i file.
2. `git remote add origin <url-del-repo>`
3. `git push -u origin main`

## Deploy su Vercel
1. Collega il repository GitHub a Vercel e crea un nuovo progetto.
2. Framework preset: **Vite**. Build command: `npm run build`. Output dir: `dist`.
3. Vercel farà la build automatica ad ogni push su main.

## Struttura principale
- `src/App.jsx`: tutta la logica dell'applicazione (quiz, flashcard, match, ecc.).
- `src/main.jsx`: monta l'app su React.
- `src/index.css`: stili globali + Tailwind.
- `tailwind.config.js`, `postcss.config.js`, `vite.config.js`: configurazioni di tooling.
