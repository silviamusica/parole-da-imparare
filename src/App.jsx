import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { Upload, Shuffle, Eye, EyeOff, ChevronLeft, ChevronRight, ChevronUp, Check, X, Brain, Zap, RotateCcw, Trophy, Target, Clock, Flame, BookOpen, Sparkles, ArrowRight, Heart, HelpCircle, Download, Edit3, Copy } from 'lucide-react';
import LogoVolpinaChiusi from '../volpina-occhi-chiusi.png';
import LogoVolpinaOcchiAperti from '../volpina-occhi-aperti.png';
import LogoVolpinaTestaAlzata from '../volpina-testa-alzata.png';
import demoCSV from '../lessico completo.csv?raw';

// Normalizza date al formato dd-mm-yy
const normalizeDate = (value) => {
  if (!value) return '';
  const val = `${value}`.trim();
  const ddmmyy = val.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
  if (ddmmyy) {
    const [_, d, m, y] = ddmmyy;
    const dd = d.padStart(2, '0');
    const mm = m.padStart(2, '0');
    const yy = y.padStart(2, '0');
    return `${dd}-${mm}-${yy}`;
  }
  const ymd = val.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (ymd) {
    const [_, y, m, d] = ymd;
    const dd = d.padStart(2, '0');
    const mm = m.padStart(2, '0');
    const yy = y.slice(-2);
    return `${dd}-${mm}-${yy}`;
  }
  return val;
};

// Normalizza valori SI/NO indipendentemente da maiuscole/minuscole e accenti
const normalizeYesNo = (value) => {
  if (value === undefined || value === null) return null;
  const base = `${value}`.trim();
  if (!base) return null;
  const folded = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (folded === 'SI') return 'SI';
  if (folded === 'NO') return 'NO';
  return null;
};

const cleanOptionalField = (val) => {
  if (val === undefined || val === null) return '';
  const trimmed = `${val}`.trim();
  if (!trimmed) return '';
  const lowered = trimmed.toLowerCase();
  if (['no', '-', '--', '/', '//', 'non applicabile', 'n/a', 'nessuno'].includes(lowered)) return '';
  return trimmed;
};

// Parser CSV flessibile: supporta vecchio schema (parola, accento, definizione, etimologia, esempio, data, errori)
// e nuovo schema: Data di inserimento, Termine, Accento, Definizione, Etimologia, Esempio 1, Esempio 2, Esempio 3, Frequenza d'uso, Linguaggio tecnico, Errori, APPRESO
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const parseRow = (line) => {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    return parts;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  const hasExplicitHeaders = ['termine', 'parola', 'term', 'definizione', 'definition'].some(h => headers.includes(h));

  // Normalizza intestazione rimuovendo spazi e caratteri speciali
  const normalizeHeader = (str) => str.toLowerCase().replace(/[\s_-]/g, '');

  const idx = (...names) => {
    // Prova prima match esatto
    for (const name of names) {
      const target = name.toLowerCase();
      const exact = headers.indexOf(target);
      if (exact !== -1) return exact;
    }
    // Poi prova match normalizzato (senza spazi)
    const normalizedHeaders = headers.map(normalizeHeader);
    for (const name of names) {
      const normalized = normalizeHeader(name);
      const normalizedIdx = normalizedHeaders.indexOf(normalized);
      if (normalizedIdx !== -1) return normalizedIdx;
    }
    // Infine prova match parziale
    for (const name of names) {
      const target = name.toLowerCase();
      const partial = headers.findIndex(header => header.includes(target));
      if (partial !== -1) return partial;
    }
    return -1;
  };

  const getField = (row, fallbackIdx, ...names) => {
    const pos = idx(...names);
    if (pos !== -1) return row[pos] ?? '';
    // Usa il fallback numerico solo se non ci sono intestazioni riconosciute (CSV legacy)
    if (!hasExplicitHeaders && fallbackIdx !== null && row[fallbackIdx] !== undefined) return row[fallbackIdx];
    return '';
  };

  const words = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    const term = getField(row, 1, 'termine', 'parola', 'term');
    const accent = getField(row, 2, 'accento', 'accent');
    const definition = getField(row, 3, 'definizione', 'definition');
    const synonyms = cleanOptionalField(getField(row, 4, 'sinonimi', 'sinonimo', 'synonyms'));
    const antonyms = cleanOptionalField(getField(row, 5, 'contrari', 'antonomi', 'antonimi', 'antonyms'));
    const etymology = getField(row, 6, 'etimologia', 'etimo');
    const ex1 = getField(row, 7, 'esempio 1', 'esempio', 'example');
    const ex2 = getField(row, 8, 'esempio 2');
    const ex3 = getField(row, 9, 'esempio 3');
    const frequencyUsage = getField(row, 10, "frequenza d'uso", 'frequenza uso');
    const technical = getField(row, 11, 'linguaggio tecnico');
    const insertedAtRaw = getField(row, 0, 'data di inserimento', 'data_inserimento', 'data');
    const favoriteRaw = getField(row, 14, 'preferito', 'favorite');
    const personalRaw = getField(row, 15, 'frasi personali', 'frasi');
    const insertedAt = normalizeDate(insertedAtRaw);
    const errorRaw = getField(row, 12, 'errori', 'errorflag', 'error');
    const normalizedErrorFlag = normalizeYesNo(errorRaw);
    const errorFlag = normalizedErrorFlag === 'SI' ? 'SI' : 'NO';
    const commonErrors = normalizedErrorFlag ? '' : (errorRaw || '');
    const learned = normalizeYesNo(getField(row, 13, 'appreso')) === 'SI';
    const appreso = learned ? 'SI' : 'NO';
    const personalSentencesRaw = cleanOptionalField(personalRaw);
    const personalSentences = personalSentencesRaw
      ? personalSentencesRaw.split(';').map(s => s.trim()).filter(Boolean)
      : [];

    if (term && definition) {
      const examples = [ex1, ex2, ex3].filter(Boolean).join(' • ');
      words.push({
        term,
        accent,
        definition,
        etymology,
        synonyms: synonyms || '',
        antonyms: antonyms || '',
        example: examples,
        example1: ex1 || '',
        example2: ex2 || '',
        example3: ex3 || '',
        frequencyUsage: frequencyUsage || '',
        technical: technical || '',
        commonErrors,
        learned,
        insertedAt,
        errorFlag,
        mastery: 0,
        appreso,
        lastSeen: null,
        favorite: normalizeYesNo(favoriteRaw) === 'SI',
        personalSentences
      });
    }
  }
  return words;
};

// Componente principale
export default function LessicoGame() {
  const [words, setWords] = useState([]);
  const [gameMode, setGameMode] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [quizOptions, setQuizOptions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const SPEED_TIME = 10;
  const [timeLeft, setTimeLeft] = useState(SPEED_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [matchPairs, setMatchPairs] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [moves, setMoves] = useState(0);
  const [fillBlankInput, setFillBlankInput] = useState('');
  const [gameStats, setGameStats] = useState({ correct: 0, wrong: 0, total: 0 });
  const [shuffledWords, setShuffledWords] = useState([]);
  const [masteredWords, setMasteredWords] = useState(new Set());
  const [questionLimit, setQuestionLimit] = useState(20);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const [wordsToReview, setWordsToReview] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [exportFormat, setExportFormat] = useState('text');
  const [showExportFormatPicker, setShowExportFormatPicker] = useState(false);
  const [exportIncludeRipasso, setExportIncludeRipasso] = useState(true);
  const [exportIncludePreferite, setExportIncludePreferite] = useState(true);
  const [exportIncludeCorrette, setExportIncludeCorrette] = useState(true);
  const [exportIncludeApprese, setExportIncludeApprese] = useState(true);
  const [exportIncludeFrasi, setExportIncludeFrasi] = useState(true);
  const [waitingForContinue, setWaitingForContinue] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(null);
  const [flashcardChoice, setFlashcardChoice] = useState(null);
  const [personalSentenceSelected, setPersonalSentenceSelected] = useState(null);
  const [showPersonalDetails, setShowPersonalDetails] = useState(false);
  const [subsetMode, setSubsetMode] = useState('all'); // all | chunk
  const [chunkPercent, setChunkPercent] = useState(10); // 10,20,33,50
  const [chunkIndex, setChunkIndex] = useState(0);
  const [onlyWrongSubset, setOnlyWrongSubset] = useState(false);
  const [activePool, setActivePool] = useState([]);
  const [learnedFilter, setLearnedFilter] = useState('all'); // all | yes | no
  const [menuTab, setMenuTab] = useState('consultation'); // consultation (Studio) | games
  const [resultsView, setResultsView] = useState('menu'); // menu | review | played | learned
  const [consultOrder, setConsultOrder] = useState('alpha'); // random | alpha
  const [consultLetters, setConsultLetters] = useState(['all']);
  const [consultFavorites, setConsultFavorites] = useState(false);
  const [studyView, setStudyView] = useState('list'); // list | flashcard
  const [showInstructions, setShowInstructions] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(null); // null | 'added' | 'duplicate'
  const [showReviewHelp, setShowReviewHelp] = useState(false);
  const [showSelectionInfo, setShowSelectionInfo] = useState(false);
  const [consultOpenLetter, setConsultOpenLetter] = useState(null);
  const [consultFlashOpenLetter, setConsultFlashOpenLetter] = useState(null);
  const [selectionWarning, setSelectionWarning] = useState(null);
  const [reviewView, setReviewView] = useState('review'); // review | played | learned
  const [playedWords, setPlayedWords] = useState([]);
  const reviewListRef = useRef(null);
  const reviewScrollPos = useRef(0);
  const selectionTimeoutRef = useRef(null);
  const triggerSelectionWarning = (message, duration = 5000) => {
    if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
    setSelectionWarning(message);
    selectionTimeoutRef.current = setTimeout(() => setSelectionWarning(null), duration);
  };
  const [consultFlipped, setConsultFlipped] = useState({});
  const consultShuffleRef = useRef({});
  const [consultVisibleCount, setConsultVisibleCount] = useState({}); // Track visible items per section
  const [consultFlashVisible, setConsultFlashVisible] = useState(20); // Track visible flashcards
  const [foxAnim, setFoxAnim] = useState(false);
  const foxAnimTimeout = useRef(null);
  const foxBreathTimers = useRef([]);
  const foxBreathInterval = useRef(null);
  const [foxVariant, setFoxVariant] = useState('default'); // default | happy | alt | feedback-ok | feedback-wrong
  const [foxCycleStep, setFoxCycleStep] = useState(0); // 0 -> alt, 1 -> happy
  const [foxAnimSize, setFoxAnimSize] = useState('big'); // small | big
  const audioCtxRef = useRef(null);
  const [lastGameMode, setLastGameMode] = useState(null);
  const [quizTimed, setQuizTimed] = useState(false);
  const [useRecent, setUseRecent] = useState(false);
  const [recentLimit, setRecentLimit] = useState(50);
  const [recentMode, setRecentMode] = useState('count'); // count | days7 | day1 | month1 | sinceDate
  const [recentSince, setRecentSince] = useState('');
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);
  const [quizQuestionType, setQuizQuestionType] = useState('definition'); // definition | term | synonyms | antonyms
  const [demoMode, setDemoMode] = useState(false);
  const [showUploadInfo, setShowUploadInfo] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const perfectCelebratedRef = useRef(false);
  const [showLetterPicker, setShowLetterPicker] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem('lexicon-favorites');
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch {
      return new Set();
    }
  });

  // Chiudi pannelli con tasto Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showSelectionPanel) {
          setShowSelectionPanel(false);
        } else if (showLetterPicker) {
          setShowLetterPicker(false);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showLetterPicker, showSelectionPanel]);

  const computeChunkAvailability = useCallback((pool) => {
    const total = pool.length;
    return {
      10: total > 210,
      20: total > 110,
      33: total > 65,
      50: total >= 25
    };
  }, []);

  const triggerAddedFeedback = (type = 'added') => {
    setAddedFeedback(type);
    setTimeout(() => setAddedFeedback(null), 900);
  };

  const toggleFavorite = (term) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(term)) {
        next.delete(term);
      } else {
        next.add(term);
      }
      try {
        localStorage.setItem('lexicon-favorites', JSON.stringify([...next]));
      } catch {}
      return next;
    });
    setWords(prev => prev.map(w => w.term === term ? { ...w, favorite: !w.favorite } : w));
    setShuffledWords(prev => prev.map(w => w.term === term ? { ...w, favorite: !w.favorite } : w));
  };

  const updateWordByTerm = (term, updater) => {
    setWords(prev => prev.map(w => w.term === term ? updater(w) : w));
    setShuffledWords(prev => prev.map(w => w.term === term ? updater(w) : w));
    setActivePool(prev => prev.map(w => w.term === term ? updater(w) : w));
  };

  const toggleLetterFilter = (letter) => {
    setConsultLetters(prev => {
      let next = new Set(prev);
      if (letter === 'all') {
        return ['all'];
      }
      next.delete('all');
      if (next.has(letter)) {
        next.delete(letter);
      } else {
        next.add(letter);
      }
      if (next.size === 0) {
        next.add('all');
      }
      return [...next];
    });
  };

  const getLetterFilterLabel = () => {
    if (consultLetters.includes('all')) return 'Tutte';
    const parts = [];
    const lettersOnly = consultLetters.filter(l => l !== 'fav');
    if (lettersOnly.length) parts.push(lettersOnly.map(l => l.toUpperCase()).join(', '));
    return parts.join(' | ') || 'Tutte';
  };

  const LetterFilterControl = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowLetterPicker(prev => !prev)}
          className="bg-slate-800/60 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm hover:bg-slate-700 min-w-[180px] text-left flex items-center justify-between"
          aria-expanded={showLetterPicker}
          aria-label={`Filtra per lettere, attualmente selezionate: ${getLetterFilterLabel()}`}
        >
          <span className="text-xs tracking-wide text-slate-300">Lettere</span>
          <span className="text-slate-100 font-semibold whitespace-nowrap">({getLetterFilterLabel()})</span>
        </button>
        {showLetterPicker && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowLetterPicker(false)}
              aria-hidden="true"
            />
            <div className="absolute z-40 mt-2 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl w-64">
              <div className="flex items-center justify-between mb-2">
                <button
                  className={`text-xs px-2 py-1 rounded border ${consultLetters.includes('all') ? 'border-amber-300 text-amber-200' : 'border-slate-600 text-slate-300 hover:border-slate-500'}`}
                  onClick={() => toggleLetterFilter('all')}
                >
                  Tutte
                </button>
                <button
                  className={`text-xs px-2 py-1 rounded border ${consultLetters.includes('fav') ? 'border-amber-300 text-amber-200' : 'border-slate-600 text-slate-300 hover:border-slate-500'}`}
                  onClick={() => toggleLetterFilter('fav')}
                >
                  Preferiti
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1 text-slate-200 text-xs">
                {letters.map(letter => {
                  const active = consultLetters.includes(letter);
                  return (
                    <label key={letter} className={`flex items-center gap-1 px-1 py-0.5 rounded ${active ? 'bg-amber-500/20 text-amber-200' : 'hover:bg-slate-800'}`}>
                      <input
                        type="checkbox"
                        className="accent-amber-400"
                        checked={active}
                        onChange={() => toggleLetterFilter(letter)}
                      />
                      <span className="uppercase">{letter}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Effetti sonori semplici
  const playSound = () => {};
  const playCuteSound = () => {};

  const showFoxOpenEyes = () => {
    setFoxVariant('feedback-ok');
    setFoxAnim(false);
    if (foxAnimTimeout.current) clearTimeout(foxAnimTimeout.current);
    foxAnimTimeout.current = setTimeout(() => {
      setFoxVariant('default');
    }, 2000);
  };

  const handleFoxClick = () => {
    setFoxAnim(true);
    if (foxCycleStep === 0) {
      setFoxVariant('feedback-ok'); // occhi aperti
      setFoxAnimSize('small'); // primo click: zoom leggero
      setFoxCycleStep(1);
    } else {
      setFoxVariant('feedback-wrong'); // testa alzata
      setFoxAnimSize('big'); // secondo click: zoom ampio
      setFoxCycleStep(0);
    }
    if (foxAnimTimeout.current) clearTimeout(foxAnimTimeout.current);
    foxAnimTimeout.current = setTimeout(() => {
      setFoxAnim(false);
      setFoxVariant('default');
    }, 2000);
  };

  const clearFoxBreathing = () => {
    foxBreathTimers.current.forEach((t) => clearTimeout(t));
    foxBreathTimers.current = [];
    if (foxBreathInterval.current) {
      clearInterval(foxBreathInterval.current);
      foxBreathInterval.current = null;
    }
  };

  const runFoxBreathing = () => {
    // Una sola apertura occhi ogni ciclo, senza animazione
    foxBreathTimers.current.forEach((t) => clearTimeout(t));
    foxBreathTimers.current = [];
    const on = setTimeout(() => {
      setFoxVariant('feedback-ok');
      setFoxAnim(false);
      const off = setTimeout(() => {
        setFoxVariant('default');
      }, 1200);
      foxBreathTimers.current.push(off);
    }, 100); // Piccolo delay per assicurare visibilità
    foxBreathTimers.current.push(on);
  };

  useEffect(() => {
    if (gameMode === 'results' && gameStats.total > 0 && gameStats.correct === gameStats.total) {
      if (!perfectCelebratedRef.current) {
        perfectCelebratedRef.current = true;
        if (foxAnimTimeout.current) clearTimeout(foxAnimTimeout.current);
        setFoxAnim(false);
        setFoxAnimSize('big');
        setFoxVariant('feedback-wrong'); // resta testa alzata finché resti qui
        setShowConfetti(true);
        const t = setTimeout(() => setShowConfetti(false), 4000);
        return () => clearTimeout(t);
      }
    } else {
      perfectCelebratedRef.current = false;
      setShowConfetti(false);
      setFoxVariant('default');
    }
  }, [gameMode, gameStats, foxAnimTimeout]);

  const syncFavoritesFromWords = (list) => {
    const favs = new Set(list.filter(w => w.favorite).map(w => w.term));
    setFavorites(favs);
    try {
      localStorage.setItem('lexicon-favorites', JSON.stringify([...favs]));
    } catch {}
  };

  // Reset tutti i filtri e torna al menu
  const resetAllFilters = () => {
    setSubsetMode('all');
    setChunkPercent(10);
    setChunkIndex(0);
    setOnlyWrongSubset(false);
    setLearnedFilter('all');
    setConsultOrder('alpha');
    setConsultLetters(['all']);
    setConsultFavorites(false);
    setUseRecent(false);
    setRecentMode('count');
    setActivePool([]);
    setShowSelectionPanel(false); // Chiudi il pannello filtri
    setGameMode(null); // Torna al menu principale
    setShowModeSelection(false);
  };

  // Gestione upload file
  const processCSVFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseCSV(event.target.result);
        if (!parsed.length) {
          throw new Error('CSV vuoto o non compatibile');
        }
        setWords(parsed);
        setShuffledWords([...parsed].sort(() => Math.random() - 0.5));
        syncFavoritesFromWords(parsed);
        setDemoMode(false);
      } catch (err) {
        triggerSelectionWarning('File non compatibile. Esporta da Google Sheet come CSV con intestazione.');
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    processCSVFile(file);
  };

  // Demo mode: carica 50 parole dal CSV incluso (bundled)
  const loadDemoWords = () => {
    try {
      const parsed = parseCSV(demoCSV);

      const buildBalancedDemo = (list, target = 50) => {
        const grouped = {};
        list.forEach(w => {
          const letter = (w.term?.[0] || '#').toLowerCase();
          if (!grouped[letter]) grouped[letter] = [];
          grouped[letter].push(w);
        });
        // Shuffle ogni gruppo e l'ordine delle lettere per avere set diversi ad ogni demo
        Object.keys(grouped).forEach(letter => {
          grouped[letter] = shuffleArray(grouped[letter]);
        });
        const letters = shuffleArray(Object.keys(grouped));
        const demo = [];
        let idx = 0;
        while (demo.length < target && letters.some(l => grouped[l].length > idx)) {
          letters.forEach(l => {
            if (demo.length >= target) return;
            const arr = grouped[l];
            if (arr.length > idx) demo.push(arr[idx]);
          });
          idx += 1;
        }
        return demo;
      };

      const demoSet = buildBalancedDemo(parsed, 50);
      if (!demoSet.length) {
        alert('Demo non disponibile.');
        return;
      }
      setWords(demoSet);
      setShuffledWords([...demoSet].sort(() => Math.random() - 0.5));
      syncFavoritesFromWords(demoSet);
      setDemoMode(true);
    } catch (err) {
      alert('Demo non disponibile.');
    }
  };

  // Shuffle array
  const shuffleArray = (arr) => [...arr].sort(() => Math.random() - 0.5);

  // Estrai parole chiave da una definizione
  const extractKeywords = (text) => {
    if (!text) return [];
    const stopWords = ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'che', 'e', 'o', 'ma', 'se', 'come', 'quando', 'dove', 'chi', 'cosa', 'quale', 'quanto', 'anche', 'più', 'meno', 'molto', 'poco', 'tanto', 'tutto', 'ogni', 'altro', 'stesso', 'proprio', 'essere', 'avere', 'fare', 'dire', 'potere', 'volere', 'dovere', 'andare', 'venire', 'stare', 'dare', 'sapere', 'vedere', 'modo', 'senso', 'spesso', 'riferito', 'indica', 'significa', 'derivato', 'latino', 'greco', 'dal', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'nel', 'nella', 'nello', 'nei', 'negli', 'nelle', 'sul', 'sulla', 'sullo', 'sui', 'sugli', 'sulle', 'al', 'alla', 'allo', 'ai', 'agli', 'alle', 'qualcosa', 'qualcuno', 'nessuno', 'niente', 'alcuni', 'alcune', 'certi', 'certe'];
    return text.toLowerCase()
      .replace(/[^\w\sàèéìòùáéíóú]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.includes(w));
  };

  // Categorie semantiche per raggruppamento
  const semanticCategories = {
    emozioni: ['paura', 'rabbia', 'gioia', 'tristezza', 'ansia', 'felicità', 'dolore', 'sofferenza', 'piacere', 'disgusto', 'vergogna', 'timore', 'terrore', 'angoscia', 'malinconia', 'nostalgia', 'entusiasmo', 'passione'],
    carattere: ['superbo', 'altezzoso', 'umile', 'arrogante', 'modesto', 'orgoglioso', 'vanitoso', 'presuntuoso', 'timido', 'audace', 'coraggioso', 'vile', 'astuto', 'ingenuo', 'furbo', 'sciocco', 'saggio', 'stolto'],
    comunicazione: ['parlare', 'discorso', 'parole', 'eloquenza', 'retorica', 'dialogo', 'conversazione', 'linguaggio', 'espressione', 'eloquio', 'verbosità', 'silenzio', 'tacere', 'dire', 'affermare', 'negare', 'argomentare'],
    morale: ['virtù', 'vizio', 'bene', 'male', 'giusto', 'ingiusto', 'onesto', 'disonesto', 'corrotto', 'integro', 'puro', 'impuro', 'colpa', 'innocenza', 'peccato', 'redenzione', 'etico', 'immorale'],
    intelletto: ['intelligenza', 'stupidità', 'sapienza', 'ignoranza', 'conoscenza', 'comprensione', 'ragione', 'logica', 'pensiero', 'riflessione', 'meditazione', 'intuizione', 'acume', 'perspicacia', 'ottusità'],
    movimento: ['rapido', 'lento', 'veloce', 'celere', 'pigro', 'agile', 'goffo', 'movimento', 'azione', 'gesto', 'slancio', 'impulso', 'inerzia', 'dinamico', 'statico', 'immobile', 'fermo'],
    tempo: ['antico', 'moderno', 'vecchio', 'nuovo', 'passato', 'presente', 'futuro', 'eterno', 'temporaneo', 'effimero', 'duraturo', 'perenne', 'breve', 'lungo', 'improvviso', 'graduale'],
    quantità: ['molto', 'poco', 'abbondante', 'scarso', 'eccessivo', 'insufficiente', 'totale', 'parziale', 'completo', 'incompleto', 'vuoto', 'pieno', 'denso', 'rado'],
    conflitto: ['guerra', 'pace', 'lotta', 'battaglia', 'scontro', 'accordo', 'disputa', 'litigio', 'controversia', 'contesa', 'rivalità', 'alleanza', 'nemico', 'avversario', 'antagonista'],
    apparenza: ['bello', 'brutto', 'elegante', 'goffo', 'raffinato', 'rozzo', 'luminoso', 'oscuro', 'chiaro', 'scuro', 'splendente', 'opaco', 'aspetto', 'sembianza', 'figura'],
    negativo: ['privo', 'assenza', 'mancanza', 'senza', 'vuoto', 'carenza', 'difetto', 'lacuna', 'privazione', 'negazione'],
    positivo: ['dotato', 'pieno', 'ricco', 'abbondante', 'fornito', 'provvisto', 'colmo', 'carico'],
    filosofia: ['dottrina', 'teoria', 'filosofico', 'concetto', 'principio', 'idea', 'pensiero', 'riflessione', 'speculazione', 'metafisica', 'ontologia', 'epistemologia'],
    religione: ['sacro', 'profano', 'divino', 'santo', 'peccato', 'virtù', 'fede', 'credenza', 'rito', 'cerimonia', 'culto', 'devozione', 'spirituale', 'mistico'],
    latino: ['locuzione', 'latina', 'latino', 'espressione', 'formula', 'detto', 'proverbio', 'massima', 'sentenza']
  };

  // Trova la categoria semantica di una parola/definizione
  const findSemanticCategory = (word) => {
    const text = (word.definition + ' ' + word.term).toLowerCase();
    const scores = {};
    
    for (const [category, keywords] of Object.entries(semanticCategories)) {
      scores[category] = keywords.filter(kw => text.includes(kw)).length;
    }
    
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      return Object.entries(scores)
        .filter(([_, score]) => score === maxScore)
        .map(([cat]) => cat);
    }
    return [];
  };

  // Calcola similarità tra due definizioni
  const calculateSimilarity = (word1, word2) => {
    const kw1 = extractKeywords(word1.definition);
    const kw2 = extractKeywords(word2.definition);
    
    if (kw1.length === 0 || kw2.length === 0) return 0;
    
    const common = kw1.filter(w => kw2.includes(w)).length;
    const cat1 = findSemanticCategory(word1);
    const cat2 = findSemanticCategory(word2);
    const categoryBonus = cat1.some(c => cat2.includes(c)) ? 3 : 0;
    const initialBonus = word1.term[0].toLowerCase() === word2.term[0].toLowerCase() ? 1 : 0;
    const lenDiff = Math.abs(word1.term.length - word2.term.length);
    const lengthBonus = lenDiff <= 2 ? 1 : 0;
    
    return common + categoryBonus + initialBonus + lengthBonus;
  };

  const normalizeWord = (w) => (w || '').trim().toLowerCase();

  const buildVariants = (word) => {
    const base = normalizeWord(word);
    if (!base) return [];
    const variants = new Set([base]);
    const last = base.slice(-1);
    if (last === 'a') variants.add(base.slice(0, -1) + 'e');
    if (last === 'o') variants.add(base.slice(0, -1) + 'i');
    if (last === 'e') variants.add(base.slice(0, -1) + 'i');
    if (last === 'i') variants.add(base.slice(0, -1) + 'e');
    return Array.from(variants);
  };

  // Genera hint tipo impiccato - PROGRESSIVO (deterministico, niente shuffle a ogni render)
  const generateHint = (word, level) => {
    const len = word.length;
    if (len <= 2) {
      return { hint: word, lost: level > 0, percent: 100 };
    }

    // Indice centrale (preferisci il “centro” per primo)
    const mid = Math.floor(len / 2);
    const pool = [];
    for (let i = 1; i < len - 1; i++) {
      if (i !== mid) pool.push(i);
    }
    // Ordine random deterministico per evitare cambi ad ogni render
    const rng = (seed) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    const shuffledPool = [...pool].map((v, i) => ({ v, r: rng(i + len) })).sort((a, b) => a.r - b.r).map(o => o.v);

    const revealed = new Set([0, len - 1]); // includi prima e ultima
    if (level > 0) {
      revealed.add(mid); // primo aiuto: la centrale
      const remaining = shuffledPool;
      const extraToShow = Math.max(0, level - 1);
      for (let i = 0; i < Math.min(extraToShow, remaining.length); i++) {
        revealed.add(remaining[i]);
      }
    }

    const percentRevealed = (revealed.size / len) * 100;
    if (percentRevealed > 80) {
      return { hint: word, lost: true, percent: 100 };
    }

    const hint = word
      .split('')
      .map((char, idx) => (revealed.has(idx) ? char : '_'))
      .join('');

    return { hint, lost: false, percent: percentRevealed };
  };

  // Oscura la parola da indovinare dentro un testo (frasi/casi d'uso) e restituisce anche la parola trovata
  const maskTargetInText = (term, text) => {
    if (!term || !text) return { maskedText: text || '', targetWord: term || '' };

    const variants = [term];
    const lower = term.toLowerCase();
    const last = lower.slice(-1);
    if (last === 'a') variants.push(lower.slice(0, -1) + 'e');
    if (last === 'o') variants.push(lower.slice(0, -1) + 'i');
    if (last === 'e') variants.push(lower.slice(0, -1) + 'i');
    if (last === 'i') variants.push(lower.slice(0, -1) + 'e');
    // Variante con radice (gestisce verbi con desinenze/accents)
    const stem = lower.slice(0, Math.max(4, Math.floor(lower.length * 0.6)));

    let target = term;
    let masked = text;
    let found = false;
    for (const v of variants) {
      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      const match = text.match(regex);
      if (match) {
        target = match[0];
        masked = text.replace(regex, '_'.repeat(match[0].length));
        found = true;
        break;
      }
    }

    if (!found && stem.length >= 3) {
      const regexStem = new RegExp(`\\b${stem}[\\wàèéìòù]*\\b`, 'i');
      const match = text.match(regexStem);
      if (match) {
        target = match[0];
        masked = text.replace(regexStem, '_'.repeat(match[0].length));
      }
    }

    return { maskedText: masked, targetWord: target };
  };

  // Genera opzioni quiz con distrattori intelligenti
  const generateQuizOptions = useCallback((correctWord, allWords, mode = 'definition') => {
    const others = allWords.filter(w => w.term !== correctWord.term);

    const fieldNeeded = (() => {
      if (mode === 'synonyms') return 'synonyms';
      if (mode === 'antonyms') return 'antonyms';
      return 'definition';
    })();

    const validOthers = others.filter(w => {
      if (!fieldNeeded) return true;
      const val = w[fieldNeeded];
      return cleanOptionalField(val);
    });

    const pool = validOthers.length >= 3 ? validOthers : others;

    const withSimilarity = pool.map(word => ({
      word,
      similarity: calculateSimilarity(correctWord, word)
    }));
    
    withSimilarity.sort((a, b) => b.similarity - a.similarity);
    
    const topCandidates = withSimilarity.slice(0, Math.min(10, withSimilarity.length));
    const shuffledCandidates = shuffleArray(topCandidates);
    const wrongOptions = shuffledCandidates.slice(0, 3).map(item => item.word);
    
    while (wrongOptions.length < 3) {
      const randomWord = pool[Math.floor(Math.random() * pool.length)];
      if (!wrongOptions.includes(randomWord)) {
        wrongOptions.push(randomWord);
      }
    }
    
    const options = shuffleArray([correctWord, ...wrongOptions]);
    return options;
  }, []);

  // Base filtrata senza tranche (serve anche per disponibilità tranche)
  const getBaseFilteredWords = useCallback(() => {
    const reviewTerms = new Set(wordsToReview.map(w => w.term));
    let base = onlyWrongSubset ? words.filter(w => reviewTerms.has(w.term)) : words;
    if (learnedFilter === 'yes') {
      base = base.filter(w => w.appreso === 'SI');
    } else if (learnedFilter === 'no') {
      base = base.filter(w => w.appreso === 'NO');
    } else if (learnedFilter === 'ripasso') {
      base = base.filter(w => w.appreso === 'RIPASSO');
    }
    return base;
  }, [words, wordsToReview, onlyWrongSubset, learnedFilter]);

  // Filtra le parole in base alla selezione del menu (tutte, tranche, solo “Ripasso”, filtri appreso/recenti)
  const getFilteredWords = useCallback(() => {
    let base = getBaseFilteredWords();

    // Filtro per lettere/preferiti
    const lettersOnly = consultLetters.filter(l => l !== 'all');
    const hasFavoritesFilter = consultFavorites;

    if (hasFavoritesFilter) {
      base = base.filter(w => favorites.has(w.term) || w.favorite);
    }
    if (lettersOnly.length > 0) {
      const setLetters = new Set(lettersOnly.map(l => l.toLowerCase()));
      base = base.filter(w => setLetters.has((w.term?.[0] || '').toLowerCase()));
    }

    if (subsetMode === 'chunk') {
      const numChunks = Math.max(1, Math.floor(100 / chunkPercent));
      const safeChunkIndex = Math.min(chunkIndex, numChunks - 1);
      const grouped = {};

      base.forEach(word => {
        const initial = (word.term?.[0] || '#').toLowerCase();
        if (!grouped[initial]) grouped[initial] = [];
        grouped[initial].push(word);
      });

      const result = [];
      Object.values(grouped).forEach(group => {
        group.sort((a, b) => a.term.localeCompare(b.term, 'it', { sensitivity: 'base' }));
        const chunkSize = Math.max(1, Math.ceil(group.length / numChunks));
        const start = chunkSize * safeChunkIndex;
        if (start >= group.length) return;
        const end = safeChunkIndex === numChunks - 1 ? group.length : Math.min(group.length, start + chunkSize);
        const slice = group.slice(start, end);
        result.push(...slice);
      });

      // Fallback silenzioso: se per qualche lettera non c'è abbastanza materiale, usa tranche sul totale
      if (result.length === 0) {
        const ordered = [...base].sort((a, b) => a.term.localeCompare(b.term, 'it', { sensitivity: 'base' }));
        const totalChunkSize = Math.max(1, Math.ceil(ordered.length / numChunks));
        const start = totalChunkSize * safeChunkIndex;
        const end = safeChunkIndex === numChunks - 1 ? ordered.length : Math.min(ordered.length, start + totalChunkSize);
        const fallbackSlice = ordered.slice(start, end);
        base = fallbackSlice.length ? fallbackSlice : ordered;
      } else {
        base = result;
      }
    }

    if (useRecent) {
      const parseDate = (str) => {
        const d = new Date(str);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      const sorted = [...base].sort((a, b) => parseDate(b.insertedAt) - parseDate(a.insertedAt));
      if (recentMode === 'count') {
        base = sorted.slice(0, recentLimit || sorted.length);
      } else if (recentMode === 'days7') {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        base = sorted.filter(w => parseDate(w.insertedAt) >= cutoff);
      } else if (recentMode === 'day1') {
        const cutoff = Date.now() - 1 * 24 * 60 * 60 * 1000;
        base = sorted.filter(w => parseDate(w.insertedAt) >= cutoff);
      } else if (recentMode === 'month1') {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        base = sorted.filter(w => parseDate(w.insertedAt) >= cutoff);
      } else if (recentMode === 'sinceDate' && recentSince) {
        const cutoff = parseDate(recentSince);
        base = sorted.filter(w => parseDate(w.insertedAt) >= cutoff);
      }
      if (!base.length) base = sorted;
    }

    return base;
  }, [getBaseFilteredWords, subsetMode, chunkPercent, chunkIndex, consultLetters, consultFavorites, favorites, useRecent, recentLimit, recentMode, recentSince]);

  const filteredPool = useMemo(() => getFilteredWords(), [getFilteredWords]);

  const getWordPool = useCallback(() => shuffleArray(getFilteredWords()), [getFilteredWords]);

  // Alfabeto memoizzato per performance
  const alphabet = useMemo(() => 'abcdefghijklmnopqrstuvwxyz'.split(''), []);

  const InstructionsModal = () => (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={() => setShowInstructions(false)}
    >
      <div
        className="bg-slate-900 rounded-3xl border border-slate-700 max-w-xl w-full p-6 text-slate-100 shadow-2xl mt-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold">Istruzioni</h2>
          <button
            onClick={() => setShowInstructions(false)}
            className="text-slate-400 text-xl"
          >
            ✕
          </button>
        </div>
        <div className="space-y-5 text-sm text-slate-200 leading-relaxed">
          <div>
            <p className="font-semibold text-base mb-2">👋 Benvenuto!</p>
            <p className="text-slate-300">Questa app ti aiuta a studiare il lessico italiano in modo efficace. Inizia importando il tuo file CSV con le parole, poi scegli come studiare.</p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="font-semibold text-base mb-2">📂 1. Importa le parole</p>
            <p className="text-slate-300">Carica un file CSV con le tue parole. Serve un file con 16 colonne in ordine:</p>
            <div className="text-xs font-mono bg-slate-800 p-2 rounded mt-2 text-slate-400 leading-relaxed">
              <p>Data, Termine*, Accento, Definizione*,</p>
              <p>Sinonimi, Contrari, Etimologia,</p>
              <p>Esempio1, Esempio2, Esempio3,</p>
              <p>Frequenza, Tecnico, Errori,</p>
              <p>APPRESO, Preferito, Frasi personali</p>
              <p className="text-slate-500 mt-1">* = obbligatorio</p>
            </div>
            <p className="text-slate-300 mt-2 text-xs">💡 Se un campo è vuoto, lascialo vuoto (non spostare i valori!).</p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="font-semibold text-base mb-2">🎯 2. Imposta i filtri (opzionale)</p>
            <p className="text-slate-300">Clicca "Imposta i filtri" per concentrarti su un sottoinsieme di parole:</p>
            <ul className="list-none space-y-1.5 mt-2 text-slate-300">
              <li><strong>• Tranche:</strong> dividi in gruppi (10%, 20%, 33%, 50%)</li>
              <li><strong>• Lettere:</strong> filtra per iniziale alfabetica</li>
              <li><strong>• Preferiti:</strong> solo parole che hai contrassegnato con ❤️</li>
              <li><strong>• Ripasso:</strong> solo parole che hai aggiunto alla lista ripasso</li>
              <li><strong>• Stadio:</strong> apprese, non apprese, o in ripasso</li>
              <li><strong>• Ultime inserite:</strong> per data di inserimento</li>
            </ul>
            <p className="text-slate-300 mt-2 text-xs">💡 Se non imposti filtri, lavori su tutte le parole.</p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="font-semibold text-base mb-2">📚 3. Scegli come imparare</p>
            <p className="text-slate-300 mb-2">Hai tre sezioni principali:</p>

            <div className="space-y-3">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="font-semibold text-cyan-300">a) Studio</p>
                <p className="text-slate-300 text-xs mt-1">Quattro modalità per esplorare le parole:</p>
                <ul className="list-none space-y-1 mt-2 text-slate-400 text-xs">
                  <li><strong>Vista Schede:</strong> elenco completo con definizioni, sinonimi, esempi ed etimologia</li>
                  <li><strong>Flashcard Termine:</strong> mostra la parola, clicca per vedere la definizione</li>
                  <li><strong>Flashcard Definizione:</strong> mostra la definizione, clicca per scoprire la parola</li>
                  <li><strong>Frasi Personali:</strong> scrivi e salva le tue frasi usando le parole del vocabolario</li>
                </ul>
                <p className="text-slate-300 text-xs mt-2">💡 In ogni modalità puoi aggiungere parole ai Preferiti ❤️ o al Ripasso.</p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="font-semibold text-green-300">b) Giochi</p>
                <p className="text-slate-300 text-xs mt-1">Quattro giochi per mettere alla prova la memoria:</p>
                <ul className="list-none space-y-1 mt-2 text-slate-400 text-xs">
                  <li><strong>Quiz:</strong> scegli la definizione corretta tra 4 opzioni</li>
                  <li><strong>Completa la frase:</strong> inserisci la parola mancante</li>
                  <li><strong>Memory:</strong> abbina termini e definizioni</li>
                  <li><strong>Costruisci frasi:</strong> usa la parola in una frase sensata</li>
                </ul>
                <p className="text-slate-300 text-xs mt-2">💡 Le parole sbagliate vengono automaticamente aggiunte al Ripasso.</p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="font-semibold text-amber-300">c) Risultati</p>
                <p className="text-slate-300 text-xs mt-1">Gestisci i tuoi progressi con tre liste:</p>
                <ul className="list-none space-y-1 mt-2 text-slate-400 text-xs">
                  <li><strong>Ripasso:</strong> parole che hai segnato per ripassare</li>
                  <li><strong>Risposte corrette:</strong> ultime risposte giuste nei giochi</li>
                  <li><strong>Apprese:</strong> parole marcate come "apprese"</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="font-semibold text-base mb-2">💾 4. Esporta o copia i progressi</p>
            <p className="text-slate-300 text-xs">Vai su "Risultati" per esportare il tuo lavoro:</p>
            <ul className="list-none space-y-1.5 mt-2 text-slate-400 text-xs">
              <li><strong>TXT:</strong> solo preferiti, ripasso e frasi personali (perfetto per studiare o condividere)</li>
              <li><strong>CSV:</strong> tutto il vocabolario con progressi aggiornati (per ricaricare nella prossima sessione)</li>
            </ul>
            <p className="text-slate-300 text-xs mt-2">💡 Usa <strong>"Copia negli appunti"</strong> per incollare velocemente in un documento, oppure <strong>"Scarica file"</strong> per salvare permanentemente.</p>
          </div>

          <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-3 mt-4">
            <p className="text-cyan-200 text-xs">🎯 <strong>Suggerimento:</strong> Inizia con "Studio → Vista Schede" per familiarizzare con le parole, poi passa a "Flashcard" per memorizzare, usa "Frasi personali" per consolidare scrivendo esempi tuoi, e infine prova i "Giochi" per verificare quanto hai imparato!</p>
          </div>
        </div>
      </div>
    </div>
);

  // Mostra selezione numero domande
  const selectMode = (mode) => {
    const available = getFilteredWords();
    if (!available.length) {
      triggerSelectionWarning('Nessuna parola selezionata');
      return;
    }
    if (mode === 'consultationFlashcard') {
      startConsultationFlashcard(false);
      return;
    }
    if (mode === 'consultationFlashcardDefinition') {
      startConsultationFlashcard(true);
      return;
    }
    if (mode === 'personalSentences') {
      startPersonalSentences();
      return;
    }
    if (mode === 'consultation') {
      startConsultation();
      return;
    }
    if (mode === 'quiz') {
      setQuizTimed(false);
    }
    if (mode === 'match') {
      startGame(mode, null);
    } else {
      setPendingMode(mode);
      setShowModeSelection(true);
    }
  };

  const startConsultation = () => {
    const current = getFilteredWords();
    if (!current.length) {
      triggerSelectionWarning('Nessuna parola selezionata');
      return;
    }
    const pool = current.sort((a, b) =>
      (a.term || '').localeCompare(b.term || '', 'it', { sensitivity: 'base' })
    );
    setActivePool(pool);
    setShuffledWords(pool);
    setGameMode('consultation');
    setShowModeSelection(false);
    setPendingMode(null);
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsCorrect(null);
    setWaitingForContinue(false);
    setShowCorrectAnswer(null);
    setIsTimerRunning(false);
  };

  const startConsultationFlashcard = (showDefinitionOnly = false) => {
    const current = getFilteredWords();
    if (!current.length) {
      setSelectionWarning('Nessuna parola selezionata');
      setTimeout(() => setSelectionWarning(null), 2000);
      return;
    }
    const pool = current.sort((a, b) =>
      (a.term || '').localeCompare(b.term || '', 'it', { sensitivity: 'base' })
    );
    setActivePool(pool);
    setShuffledWords(pool);
    setGameMode(showDefinitionOnly ? 'consultationFlashcardDefinition' : 'consultationFlashcard');
    setShowModeSelection(false);
    setPendingMode(null);
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsCorrect(null);
    setWaitingForContinue(false);
    setShowCorrectAnswer(null);
    setIsTimerRunning(false);
  };

  const startPersonalSentences = () => {
    const current = getFilteredWords();
    if (!current.length) {
      triggerSelectionWarning('Nessuna parola selezionata');
      return;
    }
    const pool = current.sort((a, b) =>
      (a.term || '').localeCompare(b.term || '', 'it', { sensitivity: 'base' })
    );
    setActivePool(pool);
    setPersonalSentenceSelected(pool[0]?.term || null);
    setGameMode('personalSentences');
    setShowModeSelection(false);
    setPendingMode(null);
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsCorrect(null);
    setWaitingForContinue(false);
    setShowCorrectAnswer(null);
    setIsTimerRunning(false);
  };

  // Inizia nuovo gioco
  const startGame = (mode, limit) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const basePool = getFilteredWords();
    if (!basePool.length) {
      triggerSelectionWarning('Nessuna parola selezionata');
      setShowModeSelection(false);
      setPendingMode(null);
      return;
    }
    const actualLimit = limit ?? questionLimit ?? basePool.length;
    const minNeeded = mode === 'match' ? 6 : 1;

    if (basePool.length < minNeeded) {
      triggerSelectionWarning('Nessuna parola selezionata');
      setShowModeSelection(false);
      setPendingMode(null);
      return;
    }

    const requiresField = (type) => {
      if (type === 'synonyms') return 'synonyms';
      if (type === 'antonyms') return 'antonyms';
      return 'definition';
    };

    // Per Frasi, preferisci parole con esempio d'uso
    let phrasePool = basePool.filter(w => w.example && w.example.trim().length > 0);
    if (mode === 'phrase' && phrasePool.length < minNeeded) {
      alert('Non ci sono abbastanza frasi/casi d’uso per questo filtro.');
      setShowModeSelection(false);
      setPendingMode(null);
      return;
    }
    if (mode !== 'phrase') {
      phrasePool = basePool;
    }

    let quizPool = basePool;
    if (mode === 'quiz' || mode === 'speedQuiz') {
      const field = requiresField(quizQuestionType);
      if (field) {
        const filtered = basePool.filter(w => cleanOptionalField(w[field]));
        if (filtered.length < 4) {
          triggerSelectionWarning('Non ci sono abbastanza dati per questa modalità (servono almeno 4 parole con il campo compilato).');
          setShowModeSelection(false);
          setPendingMode(null);
          return;
        }
        quizPool = filtered;
      }
    }

    // Per il match, evita definizioni troppo lunghe; se non bastano, torna al pool completo
    let matchPool = basePool.filter(w => (w.definition || '').length <= 180);
    if (matchPool.length < 6) matchPool = basePool;

    const shuffledPool = shuffleArray(
      mode === 'phrase'
        ? phrasePool
        : (mode === 'quiz' || mode === 'speedQuiz')
          ? quizPool
          : basePool
    );
    const limitApplied = Math.min(actualLimit, shuffledPool.length);
    const gameWords = mode === 'match'
      ? shuffleArray(matchPool).slice(0, Math.min(6, matchPool.length))
      : shuffledPool.slice(0, limitApplied);

    setLastGameMode(mode);
    setGameMode(mode);
    setQuestionLimit(actualLimit);
    setShowModeSelection(false);
    setPendingMode(null);
    setCurrentIndex(0);
    setStreak(0);
    setLives(3);
    setShowAnswer(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setGameStats({ correct: 0, wrong: 0, total: 0 });
    setShowHint(false);
    setHintLevel(0);
    setFillBlankInput('');
    setWaitingForContinue(false);
    setShowCorrectAnswer(null);
    
    setActivePool(basePool);
    setShuffledWords(gameWords);
    
    if (mode === 'quiz' || mode === 'speedQuiz') {
      setQuizOptions(generateQuizOptions(gameWords[0], quizPool, quizQuestionType));
      if (mode === 'speedQuiz') {
        setTimeLeft(SPEED_TIME);
        setIsTimerRunning(true);
      }
    } else if (mode === 'match') {
      initMatchGame(gameWords);
    } else if (mode === 'phrase') {
      // nulla di speciale qui, già impostato gameWords
    }
  };

  // Inizializza gioco memory/match
  const initMatchGame = (pool) => {
    const baseSource = (pool && pool.length ? pool : getWordPool());
    // Evita definizioni troppo lunghe che uscirebbero dalla card
    const filteredSource = baseSource.filter(w => (w.definition || '').length <= 180);
    const source = filteredSource.length >= 6 ? filteredSource : baseSource;
    if (source.length < 6) {
      alert('Servono almeno 6 parole per giocare al Memory con questo filtro.');
      return;
    }
    const selected = shuffleArray(source).slice(0, 6);
    const cards = [];
    selected.forEach((word, idx) => {
      cards.push({ id: `term-${idx}`, content: word.term, type: 'term', pairId: idx });
      const definitionText = word.definition || '';
      cards.push({ id: `def-${idx}`, content: definitionText, type: 'def', pairId: idx });
    });
    setMatchPairs(shuffleArray(cards));
    setMatchedPairs([]);
    setSelectedCards([]);
    setMoves(0);
  };

  // Timer per speed quiz
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && isTimerRunning) {
      handleWrongAnswer();
    }
  }, [timeLeft, isTimerRunning]);

  // Prossima parola
  const nextWord = () => {
    const limit = questionLimit || shuffledWords.length;
    if (currentIndex < Math.min(shuffledWords.length, limit) - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setShowAnswer(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setFillBlankInput('');
      setShowHint(false);
      setHintLevel(0);
      setWaitingForContinue(false);
      setShowCorrectAnswer(null);
      setFlashcardChoice(null);
      
      if (gameMode === 'quiz' || gameMode === 'speedQuiz') {
        const pool = activePool.length ? activePool : words;
        setQuizOptions(generateQuizOptions(shuffledWords[newIndex], pool, quizQuestionType));
        if (gameMode === 'speedQuiz') {
          setTimeLeft(SPEED_TIME);
          setIsTimerRunning(true);
        }
      }
    } else {
      setGameMode('results');
    }
  };

  const addPlayedWord = useCallback((word, isCorrect = false) => {
    if (!word || !word.term) return;
    setPlayedWords(prev => {
      const filtered = prev.filter(w => w.term !== word.term);
      if (!isCorrect) return filtered;
      return [...filtered, { ...word, source: 'played', correct: true }];
    });
  }, []);

  useEffect(() => {
    if (menuTab !== 'results') {
      setResultsView('menu');
    }
  }, [menuTab]);

  const preserveReviewScroll = (action) => {
    const el = reviewListRef.current;
    const top = el?.scrollTop ?? null;
    action();
    if (top !== null) {
      reviewScrollPos.current = top;
      requestAnimationFrame(() => {
        if (reviewListRef.current) {
          reviewListRef.current.scrollTop = reviewScrollPos.current;
        }
      });
    }
  };

  const setAppreso = useCallback((term, status) => {
    if (!term) return;
    preserveReviewScroll(() => {
      setWords(prev => prev.map(w => w.term === term ? { ...w, learned: status === 'SI', appreso: status } : w));
      setWordsToReview(prev => {
        if (status === 'RIPASSO') {
          if (prev.some(w => w.term === term)) return prev;
          const baseWord = (words.find(w => w.term === term) || playedWords.find(w => w.term === term));
          if (!baseWord) return prev;
          const enriched = { ...baseWord, errorFlag: 'SI', source: baseWord.source || 'manual', learned: false, appreso: 'RIPASSO' };
          return [...prev.filter(w => w.term !== term), enriched];
        }
        return prev.filter(w => w.term !== term);
      });
      if (status !== 'RIPASSO') {
        setPlayedWords(prev => prev.filter(w => w.term !== term));
      }
    });
  }, [words, playedWords]);

  const markWordAsLearned = useCallback((term) => setAppreso(term, 'SI'), [setAppreso]);
  const markWordAsToReview = useCallback((term) => setAppreso(term, 'RIPASSO'), [setAppreso]);
  const markWordAsNotLearned = useCallback((term) => setAppreso(term, 'NO'), [setAppreso]);

  // Permetti di avanzare con Enter quando il feedback è visibile (waitingForContinue)
  useEffect(() => {
    const handler = (e) => {
      if (!waitingForContinue) return;
      if (e.key !== 'Enter') return;
      e.preventDefault();
      setWaitingForContinue(false);
      setShowCorrectAnswer(null);
      nextWord();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [waitingForContinue, nextWord]);

  // Traccia le parole viste nei giochi
  useEffect(() => {
    if (!gameMode || ['results', 'consultation', 'consultationFlashcard', null].includes(gameMode)) return;
    const current = shuffledWords[currentIndex];
    if (current && current.term) {
      // Traccia solo l'ultimo stato: se corretta, rimane; se sbagliata, viene rimossa
      const isCurrCorrect = isCorrect === true;
      addPlayedWord(current, isCurrCorrect);
    }
  }, [currentIndex, gameMode, shuffledWords, addPlayedWord, isCorrect]);

  useEffect(() => {
    // Non far respirare la volpe in modalità personalSentences per evitare re-render
    // e in results con punteggio perfetto per mostrare la celebrazione
    if (gameMode === 'personalSentences') {
      clearFoxBreathing();
      return;
    }
    if (gameMode === 'results' && gameStats.total > 0 && gameStats.correct === gameStats.total) {
      clearFoxBreathing();
      return;
    }
    runFoxBreathing();
    foxBreathInterval.current = setInterval(runFoxBreathing, 60000);
    return () => {
      clearFoxBreathing();
    };
  }, [gameMode, gameStats]);

  // Gestione risposta corretta
  const handleCorrectAnswer = () => {
    setIsCorrect(true);
    setStreak(streak + 1);
    setMaxStreak(Math.max(maxStreak, streak + 1));
    setGameStats(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));

    // Aggiungi parola alle risposte corrette
    const currentWord = shuffledWords[currentIndex];
    if (currentWord) {
      setMasteredWords(prev => new Set([...prev, currentWord.term]));
    }

    setIsTimerRunning(false);
    // Non animare la volpe sulle risposte, solo al click esplicito
    // Per i giochi a domanda (quiz/speed/compelta/frasi) mostra feedback e attendi conferma
    if (['quiz', 'speedQuiz', 'fillBlank', 'phrase'].includes(gameMode)) {
      setShowCorrectAnswer(shuffledWords[currentIndex]);
      setWaitingForContinue(true);
    } else {
      // Per le altre modalità, passa subito alla prossima (veloce)
      setTimeout(nextWord, 800);
    }
  };

  // Gestione risposta sbagliata
  const handleWrongAnswer = (selectedWrongWord = null, options = {}) => {
    const { autoAdvance = false } = options;
    setIsCorrect(false);
    setStreak(0);
    setLives(Math.max(0, lives - 1));
    setGameStats(prev => ({ ...prev, wrong: prev.wrong + 1, total: prev.total + 1 }));
    setIsTimerRunning(false);
    playSound('bad');
    
    const correctWord = shuffledWords[currentIndex];
    setShowCorrectAnswer(autoAdvance ? null : correctWord);
    setWaitingForContinue(!autoAdvance);
    
    // Aggiungi alla lista da rivedere (evita duplicati)
    setWordsToReview(prev => {
      const exists = prev.some(w => w.term === correctWord.term);
      if (!exists) {
        return [...prev, { ...correctWord, wrongAnswer: selectedWrongWord?.term || null, errorFlag: 'SI', source: 'game', learned: false, appreso: 'RIPASSO' }];
      }
      return prev;
    });
    setWords(prev => prev.map(w => w.term === correctWord.term ? { ...w, appreso: 'RIPASSO', learned: false } : w));

    // In modalità che devono avanzare subito (es. flashcard), passa oltre senza fermarsi
    if (autoAdvance) {
      setTimeout(() => {
        nextWord();
      }, 300);
    }
  };

  // Gestione selezione quiz
  const handleQuizSelect = (option) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option.term);
    
    if (option.term === shuffledWords[currentIndex].term) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer(option);
    }
  };

  // Gestione match game
  const handleCardClick = (card) => {
    if (selectedCards.length === 2 || matchedPairs.includes(card.pairId)) return;
    
    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);
    
    if (newSelected.length === 2) {
      setMoves(prev => prev + 1);
      
      if (newSelected[0].pairId === newSelected[1].pairId && newSelected[0].type !== newSelected[1].type) {
        setMatchedPairs(prev => [...prev, card.pairId]);
        setSelectedCards([]);
        setGameStats(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));
        
        if (matchedPairs.length + 1 === 6) {
          setTimeout(() => setGameMode('results'), 1000);
        }
      } else {
        setGameStats(prev => ({ ...prev, wrong: prev.wrong + 1, total: prev.total + 1 }));
        setTimeout(() => setSelectedCards([]), 800);
      }
    }
  };

  // Verifica fill blank
  const checkFillBlank = () => {
    const correctTerm = shuffledWords[currentIndex].term;
    const variants = buildVariants(correctTerm);
    const answer = normalizeWord(fillBlankInput);

    if (variants.includes(answer)) {
      setShowCorrectAnswer(shuffledWords[currentIndex]);
      setWaitingForContinue(true);
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  };

  // Verifica per la modalità Frasi (usa la parola effettivamente rimossa dal testo)
  const checkPhraseAnswer = (target, baseTerm) => {
    const normalizedTarget = normalizeWord(target || '');
    const normalizedBase = normalizeWord(baseTerm || '');
    const candidates = [
      normalizedTarget,
      normalizedBase,
      ...buildVariants(target),
      ...buildVariants(baseTerm)
    ];
    const answer = normalizeWord(fillBlankInput);

    if (candidates.includes(answer)) {
      setShowCorrectAnswer(shuffledWords[currentIndex]);
      setWaitingForContinue(true);
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  };

  // Formatta parole per esportazione
  const formatWordsForExport = (format) => {
    if (format === 'text') {
      const alpha = (arr) => [...arr].sort((a, b) => (a.term || '').localeCompare(b.term || '', 'it', { sensitivity: 'base' }));
      const preferite = alpha(words.filter(w => favorites.has(w.term) || w.favorite));

      // Unisci "Da rivedere" e "Da ripassare" rimuovendo duplicati
      const ripassoFromCSV = words.filter(w => w.appreso === 'RIPASSO');
      const allRipasso = [...new Map([...wordsToReview, ...ripassoFromCSV].map(w => [w.term, w])).values()];
      const ripasso = alpha(allRipasso);

      const withSentences = alpha(words.filter(w => Array.isArray(w.personalSentences) && w.personalSentences.length > 0));
      const risposteCorrette = alpha(words.filter(w => masteredWords.has(w.term)));
      const apprese = alpha(words.filter(w => w.learned || w.appreso === 'SI'));

      const sectionText = (title, list) => {
        if (!list.length) return `${title}:\n(nessuna)\n`;
        return `${title}:\n${list.map(w => `• ${w.term}${w.accent ? ` (${w.accent})` : ''} — ${w.definition || ''}`).join('\n')}\n`;
      };

      const compactListText = (title, list) => {
        if (!list.length) return `${title}:\n(nessuna)\n`;
        return `${title}:\n${list.map(w => w.term).join(', ')}\n`;
      };

      const sentencesText = () => {
        if (!withSentences.length) return 'Frasi personali:\n(nessuna)\n';
        return [
          'Frasi personali:',
          ...withSentences.map(w => {
            const lines = (w.personalSentences || []).map(s => `  - ${s}`);
            return `• ${w.term}${w.accent ? ` (${w.accent})` : ''}\n${lines.join('\n')}`;
          })
        ].join('\n') + '\n';
      };

      const sections = [];
      if (exportIncludeRipasso && ripasso.length > 0) sections.push(sectionText('Ripasso', ripasso));
      if (exportIncludePreferite && preferite.length > 0) sections.push(sectionText('Preferite', preferite));
      if (exportIncludeCorrette && risposteCorrette.length > 0) sections.push(compactListText('Risposte corrette', risposteCorrette));
      if (exportIncludeApprese && apprese.length > 0) sections.push(compactListText('Apprese', apprese));
      if (exportIncludeFrasi && withSentences.length > 0) sections.push(sentencesText());

      return sections.length > 0 ? sections.join('\n') : '';
    } else if (format === 'csv') {
      // CSV completo con tutte le parole e indicazione di quali sono da rivedere (nuovo schema)
      const header = "Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali\n";
      const reviewTerms = new Set(wordsToReview.map(w => w.term));
      const rows = words.map(w => {
        const appreso = reviewTerms.has(w.term) ? 'RIPASSO' : (w.learned ? 'SI' : 'NO');
        const errorValue = reviewTerms.has(w.term) ? 'Ripasso' : (w.commonErrors || 'NO');
        const favoriteValue = w.favorite || favorites.has(w.term) ? 'SI' : 'NO';
        const personal = Array.isArray(w.personalSentences) ? w.personalSentences.join(';') : (w.personalSentences || '');
        return `"${normalizeDate(w.insertedAt) || ''}","${w.term}","${w.accent || ''}","${w.definition}","${w.synonyms || ''}","${w.antonyms || ''}","${w.etymology || ''}","${w.example1 || ''}","${w.example2 || ''}","${w.example3 || ''}","${w.frequencyUsage || ''}","${w.technical || ''}","${errorValue}","${appreso}","${favoriteValue}","${personal}"`;
      }).join('\n');
      return header + rows;
    } else if (format === 'csv_empty') {
      // CSV vuoto con intestazioni + riga istruzioni + riga esempio
      const header = "Data di inserimento,Termine,Accento,Definizione,Sinonimi,Contrari,Etimologia,Esempio 1,Esempio 2,Esempio 3,Frequenza d'uso,Linguaggio tecnico,Errori,APPRESO,Preferito,Frasi personali";
      const instructions = [
        'GG-MM-AA (es. 14-10-25)',
        'Termine (obbligatorio)',
        "Accento (es. caffè → caff\u00e8)",
        'Definizione chiara e breve (obbligatoria)',
        'Sinonimi (facoltativo, separa con ;) ',
        'Contrari (facoltativo, separa con ;) ',
        'Etimologia (facoltativo)',
        'Caso d\'uso 1 (obbligatorio)',
        'Caso d\'uso 2 (facoltativo)',
        'Caso d\'uso 3 (facoltativo)',
        "Frequenza d'uso (Bassa/Media/Alta)",
        "Linguaggio tecnico (Comune/Medico/Legale...)", 
        "Errori: descrizione (es. 'spesso confuso con...') oppure NO",
        'APPRESO: SI/NO/RIPASSO',
        'Preferito: SI/NO',
        'Frasi personali (facoltativo, separa con ;)'
      ].map(v => `"${v.replace(/"/g, '""')}"`).join(',');

      const sample = [
        '14-10-25',
        'Lampada',
        'l\u00e0mpada',
        'Dispositivo che produce luce artificiale.',
        'lume;lucerna',
        'illuminare',
        'Dal latino tardo lampas, -adis, dal greco lamp\u00e1s.',
        'Ho acceso la lampada sul comodino.',
        'La lampada in salotto diffonde una luce calda.',
        'Questa lampada \u00e8 troppo debole per leggere.',
        'Media',
        'Comune',
        'No',
        'NO',
        'SI',
        'Questa lampada fa una luce perfetta per leggere.;La lampada del corridoio si \u00e8 rotta.'
      ].map(v => `"${v.replace(/"/g, '""')}"`).join(',');

      return `${header}\n${instructions}\n${sample}\n`;
    } else if (format === 'list') {
      return wordsToReview.map(w => `• ${w.term}${w.accent ? ` (${w.accent})` : ''}: ${w.definition}`).join('\n');
    }
    return '';
  };

  // Copia negli appunti con feedback
  const copyToClipboard = async (format) => {
    // Verifica se almeno una sezione è selezionata
    const hasSectionSelected = exportIncludeRipasso || exportIncludePreferite ||
                                exportIncludeCorrette || exportIncludeApprese || exportIncludeFrasi;

    if (!hasSectionSelected) {
      setCopyFeedback('✗ Seleziona almeno una sezione da includere nell\'export.');
      setTimeout(() => setCopyFeedback(''), 3000);
      return;
    }

    try {
      const text = formatWordsForExport(format);

      // Verifica se il testo generato è vuoto
      if (!text || text.trim().length === 0) {
        setCopyFeedback('✗ Nessun contenuto disponibile nelle sezioni selezionate.');
        setTimeout(() => setCopyFeedback(''), 3000);
        return;
      }

      // Metodo compatibile per copia clipboard (fallback per Safari e browser senza HTTPS)
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
          setCopyFeedback('✓ Contenuto copiato negli appunti!');
          setTimeout(() => setCopyFeedback(''), 2000);
        } else {
          throw new Error('Comando copia non riuscito');
        }
      } catch (execErr) {
        document.body.removeChild(textarea);
        throw execErr;
      }
    } catch (err) {
      console.error('Errore copia clipboard:', err);
      setCopyFeedback('✗ Impossibile copiare. Prova a selezionare e copiare manualmente dal file scaricato.');
      setTimeout(() => setCopyFeedback(''), 4000);
    }
  };

  // Scarica come file
  const downloadFile = (format) => {
    const requiresData = format !== 'csv_empty';
    if (requiresData) {
      // Se stai usando il demo e non hai parole filtrate, blocca download
      if (demoMode && filteredPool.length === 0) {
        triggerSelectionWarning('Non puoi scaricare il file demo: nessuna parola disponibile.');
        return;
      }
      // Nessuna parola disponibile
      if (words.length === 0 && wordsToReview.length === 0) {
        triggerSelectionWarning('Nessuna parola da scaricare.');
        return;
      }
    }
    const textRaw = formatWordsForExport(format);
    const text = typeof textRaw === 'string' ? textRaw : '';
    if (!text) {
      triggerSelectionWarning('Nessuna parola da scaricare con questi filtri.');
      return;
    }
    const extension = format.includes('csv') ? 'csv' : 'txt';
    const filename =
      format === 'csv_empty' ? 'parole-da-imparare.csv' :
      format === 'csv_full' ? 'lessico-completo-con-errori.csv' :
      'parole-da-rivedere.' + extension;
    const mimeType = format.includes('csv') ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCopyFeedback('✓ Scaricato!');
    setTimeout(() => setCopyFeedback(''), 2000);
  };

  const getExamples = (word) =>
    [word?.example1, word?.example2, word?.example3].filter(ex => {
      if (!ex) return false;
      const trimmed = `${ex}`.trim().toLowerCase();
      return trimmed !== 'no' && trimmed !== 'n/a' && trimmed !== 'nessuno';
    });

  // Seleziona un esempio in modo deterministico per evitare cambiamenti tra un render e l'altro
  const pickStableExample = (word) => {
    const examples = getExamples(word);
    if (!examples.length) return null;
    const key = word?.term || '';
    let seed = 0;
    for (let i = 0; i < key.length; i++) {
      seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
    }
    const idx = seed % examples.length;
    return examples[idx];
  };

  const ExamplesBlock = ({ word, className = '' }) => {
    const examples = getExamples(word);
    if (!examples.length) return null;
    return (
      <div className={`mt-3 bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 space-y-2 ${className}`}>
        <p className="text-slate-400 text-sm">Esempi d'uso:</p>
        <ul className="text-slate-200 text-sm space-y-1">
          {examples.map((ex, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-slate-500">-</span>
              <span>{ex}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const ScrollToTopButton = () => (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-4 right-4 z-40 bg-cyan-900/80 hover:bg-cyan-800 text-slate-100 border border-cyan-800/60 rounded-full shadow-lg p-3 transition-colors"
      aria-label="Torna su"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );

  const resetConsultationState = () => {
    setConsultLetters(['all']);
    setConsultOrder('random');
    setConsultOpenLetter(null);
    setConsultFlashOpenLetter(null);
    setConsultFlipped({});
  };

  // Componente per mostrare risposta corretta e pulsante continua
  const AnswerDetailCard = ({ word, isCorrect, onContinue, continueHint = 'o premi Invio' }) => {
    if (!word) return null;
    const commonErrorsClean = `${word.commonErrors || ''}`.trim();
    const showCommonErrors = commonErrorsClean && !['no', 'n/a', 'nessuno'].includes(commonErrorsClean.toLowerCase());
    const cleanField = (val) => {
      const trimmed = `${val || ''}`.trim();
      if (!trimmed) return '';
      const lowered = trimmed.toLowerCase();
      if (['no', '-', '--', '/', 'non applicabile', 'n/a'].includes(lowered)) return '';
      return trimmed;
    };
    const safeSynonyms = cleanField(word.synonyms);
    const safeAntonyms = cleanField(word.antonyms);
    const safeFrequency = cleanField(word.frequencyUsage);
    const safeTechnical = cleanField(word.technical);
    return (
      <div className="mt-4 p-4 bg-slate-800/60 rounded-2xl border border-slate-700/70 text-left space-y-3">
        <div className={`text-lg font-bold ${isCorrect ? 'text-cyan-400' : 'text-red-400'}`}>
          {isCorrect ? '✅ Corretto' : '❌ Sbagliato'}
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-2xl font-extrabold text-emerald-200">{word.term}</span>
        </div>
        <div className="space-y-1">
          {word.accent && (
            <p className="text-slate-300"><span className="font-semibold">Accento:</span> <span className="italic text-slate-100">{word.accent}</span></p>
          )}
          {word.definition && (
            <p className="text-lg font-semibold text-slate-50">{word.definition}</p>
          )}
          {word.etymology && (
            <p className="italic text-slate-300">{word.etymology}</p>
          )}
        </div>
        {(safeSynonyms || safeAntonyms || safeFrequency || safeTechnical || showCommonErrors) && (
          <div className="text-sm text-slate-200 space-y-1">
            {safeSynonyms && (
              <p><span className="font-semibold">Sinonimi:</span> <span className="text-slate-100">{safeSynonyms}</span></p>
            )}
            {safeAntonyms && (
              <p><span className="font-semibold">Contrari:</span> <span className="text-slate-100">{safeAntonyms}</span></p>
            )}
            {safeFrequency && (
              <p><span className="font-semibold">Frequenza d'uso:</span> <span className="text-slate-100">{safeFrequency}</span></p>
            )}
            {safeTechnical && (
              <p><span className="font-semibold">Linguaggio tecnico:</span> <span className="text-slate-100">{safeTechnical}</span></p>
            )}
            {showCommonErrors && (
              <p><span className="font-semibold">Errori frequenti:</span> <span className="text-slate-100">{word.commonErrors}</span></p>
            )}
          </div>
        )}
        <ExamplesBlock word={word} className="text-left" />
        {onContinue && (
          <>
            <button
              type="button"
              onClick={onContinue}
              className="bg-cyan-900 hover:bg-cyan-800 text-slate-100 px-4 py-2 rounded-xl border border-cyan-800/60 transition-colors"
            >
              Continua
            </button>
            {continueHint && <p className="text-left text-slate-500 text-xs">{continueHint}</p>}
          </>
        )}
      </div>
    );
  };

  const InfoTooltip = ({ text }) => (
    <span className="relative group inline-flex items-center">
      <HelpCircle className="w-4 h-4 text-slate-500 group-hover:text-slate-200 transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 max-w-[200px] bg-slate-900 text-slate-100 text-[11px] px-2 py-1 rounded-lg border border-slate-700 shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition text-center z-50">
        {text}
      </span>
    </span>
  );
  
  const ConfettiOverlay = () => {
    const colors = ['#f97316', '#22d3ee', '#a855f7', '#facc15', '#34d399'];
    const pieces = Array.from({ length: 40 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 0.5,
      duration: 3 + Math.random() * 1.5,
      rotate: Math.random() * 360,
      scale: 0.8 + Math.random() * 0.6,
      color: colors[i % colors.length]
    }));
    return (
      <div className="confetti-overlay">
        {pieces.map((p, idx) => (
          <span
            key={idx}
            className="confetti-piece"
            style={{
              left: p.left,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              transform: `rotate(${p.rotate}deg) scale(${p.scale})`,
              backgroundColor: p.color
            }}
          />
        ))}
      </div>
    );
  };

  const SelectionInfoModal = () => (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => setShowSelectionInfo(false)}
    >
      <div
        className="bg-slate-900 rounded-3xl border border-slate-700 max-w-xl w-full p-6 text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold">Come funzionano i filtri</h2>
          <button
            onClick={() => setShowSelectionInfo(false)}
            className="text-slate-400 hover:text-slate-200 text-xl"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-slate-200">
          <p>📊 <strong>Tranche</strong>: scegli una fetta del database per lettera (10/20/33/50%). 10% = primo 10% di ogni lettera; puoi studiare a blocchi selezionando 1ª, 2ª… fetta.</p>
          <p>🎯 <strong>Ripasso</strong>: attiva solo le parole che hai segnato “Ripasso” in questa sessione.</p>
          <p>📗 <strong>Stadio di apprendimento</strong>: filtra per APPRESO = SI (apprese), NO (non apprese), RIPASSO (da ripassare) o tutte.</p>
          <p>⏱️ <strong>Ultime inserite</strong>: limita alle parole più recenti (per numero) oppure per tempo: ultime 24h, 7 giorni, ultimo mese o da una data.</p>
          <p>➕ <strong>Combinazioni</strong>: prima si applicano tranche/da rivedere/stadio, poi gli altri filtri restringono ulteriormente.</p>
        </div>
      </div>
    </div>
  );

  const ReviewInfoModal = () => (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => setShowReviewHelp(false)}
    >
      <div
        className="bg-slate-900 rounded-3xl border border-slate-700 max-w-xl w-full p-6 text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold">Sezione “Risultati”</h2>
          <button
            onClick={() => setShowReviewHelp(false)}
            className="text-slate-400 hover:text-slate-200 text-xl"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-slate-200">
          <p>Qui gestisci tre liste: “Ripasso” (APPRESO=RIPASSO), “Risposte corrette” (solo le ultime risposte giuste) e “Apprese” (APPRESO=SI). Usa i pulsanti per spostare le parole tra gli stati senza perdere i dati.</p>
          <p className="space-y-1">
            <div>Contrassegna come:</div>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li><strong>Apprese</strong>: parole che hai memorizzato.</li>
              <li><strong>Non apprese</strong>: parole che sbagli ancora.</li>
              <li><strong>Ripasso</strong>: parole da inserire nei prossimi ripassi.</li>
            </ul>
          </p>
          <p>Puoi scaricare due formati:</p>
          <p><strong>TXT</strong>: solo elenco delle parole da rivedere/errori.</p>
          <p><strong>CSV completo</strong>: tutte le parole del database con “appreso” valorizzato (RIPASSO per le parole da rivedere, SI per le apprese, NO per tutte le altre). Puoi utilizzarlo nella prossima sessione per filtrare solo ciò che vuoi imparare.</p>
        </div>
      </div>
    </div>
  );

  // Componente Upload
  const UploadScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/40 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full text-center border border-slate-700/50">
        <div className="mx-auto mb-6 flex items-center justify-center">
          <button
            type="button"
            onClick={handleFoxClick}
            className="transition-transform hover:scale-105"
            aria-label="Logo"
          >
              <img
              src={
                foxVariant === 'feedback-ok'
                  ? LogoVolpinaOcchiAperti
                  : foxVariant === 'feedback-wrong'
                  ? LogoVolpinaTestaAlzata
                  : foxVariant === 'happy'
                  ? LogoVolpinaOcchiAperti
                  : foxVariant === 'alt'
                  ? LogoVolpinaTestaAlzata
                  : LogoVolpinaChiusi
              }
              alt="Logo"
              className={`h-[84px] w-auto drop-shadow-xl transition-transform ${foxAnim ? (foxAnimSize === 'small' ? 'scale-110' : 'scale-125') : ''}`}
            />
          </button>
        </div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Giochi di parole</h1>
        <p className="text-slate-400 mb-5">Impara parole nuove giocando!</p>

        <div className="space-y-3">
          <p className="text-slate-200 font-normal text-base text-center">Prova subito la demo, o inizia con il tuo vocabolario.</p>

          <button
            onClick={loadDemoWords}
            className="w-full bg-orange-500 text-white font-semibold px-4 py-3 rounded-xl transition-colors shadow-[0_6px_14px_-10px_rgba(249,115,22,0.5)] flex items-center justify-center gap-2 border border-orange-400/60"
          >
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            <span>Prova demo (50 parole)</span>
          </button>

          <button
            onClick={() => downloadFile('csv_empty')}
            className="w-full bg-cyan-900 text-slate-50 font-semibold px-4 py-3 rounded-xl shadow-[0_6px_18px_-12px_rgba(34,211,238,0.35)] border border-cyan-800/60 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" aria-hidden="true" />
            <span>Scarica il modello</span>
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <p className="text-slate-200 font-normal text-base">Carica il tuo CSV</p>
            <button
              onClick={() => setShowUploadInfo(true)}
              className="text-cyan-200 text-sm underline underline-offset-4"
              aria-label="Formato CSV e istruzioni"
            >
              Formato
            </button>
          </div>
          <label className="block cursor-pointer group">
            <div
              className="border-2 border-dashed border-slate-600 rounded-2xl p-6 transition-all group-hover:border-cyan-700 group-hover:bg-slate-700/20"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                processCSVFile(file);
              }}
            >
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4 group-hover:text-cyan-600 transition-colors" />
              <p className="text-slate-200 font-medium mb-1">Trascina o seleziona il tuo file</p>
              <p className="text-slate-500 text-sm">Già preparato? Caricalo qui!</p>
            </div>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );

  // Menu principale
  const MainMenu = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <button
              type="button"
              onClick={handleFoxClick}
              aria-label="Mascotte Volpina - clicca per animazione"
              className="hover:scale-105 transition-transform"
            >
            <img
              src={
                foxVariant === 'feedback-ok'
                  ? LogoVolpinaOcchiAperti
                  : foxVariant === 'feedback-wrong'
                  ? LogoVolpinaTestaAlzata
                  : foxVariant === 'happy'
                  ? LogoVolpinaOcchiAperti
                  : foxVariant === 'alt'
                  ? LogoVolpinaTestaAlzata
                  : LogoVolpinaChiusi
              }
              alt="Volpina la mascotte del gioco"
              className={`h-[74px] w-auto drop-shadow-xl transition-transform ${foxAnim ? (foxAnimSize === 'small' ? 'scale-110' : 'scale-125') : ''}`}
            />
          </button>
        </div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Giochi di parole</h1>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <p>{filteredPool.length} parole disponibili</p>
            <span className="text-slate-500">-</span>
            <button
              onClick={() => setShowInstructions(true)}
              className="text-slate-200 underline decoration-dotted underline-offset-4 hover:text-cyan-300 text-sm"
              aria-label="Istruzioni"
            >
              Istruzioni
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/60 p-6 rounded-3xl mb-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-200 font-bold text-lg">Seleziona le parole con cui giocare</p>
              <p className="text-slate-400 text-sm mt-1">
                Disponibili: <span className="text-cyan-300 font-semibold">{filteredPool.length}</span>
                {learnedFilter !== 'all' && (
                  <span className="text-xs text-cyan-300 ml-2">
                    ({learnedFilter === 'yes' ? 'solo apprese' : learnedFilter === 'ripasso' ? 'solo ripasso' : 'solo da apprendere'})
                  </span>
                )}
                {onlyWrongSubset && (
                  <span className="text-xs text-orange-300 ml-2">(solo “Ripasso”)</span>
                )}
              </p>
            </div>
            <button
              onClick={() => setShowSelectionPanel(true)}
              className="bg-cyan-900 text-slate-50 px-5 py-2 rounded-xl font-semibold border border-cyan-800/60 shadow-[0_6px_18px_-12px_rgba(34,211,238,0.35)]"
            >
              Scegli
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { key: 'consultation', label: 'Studio' },
              { key: 'games', label: 'Giochi' },
              { key: 'results', label: 'Risultati' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === 'results') setResultsView('menu');
                  setMenuTab(tab.key);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                  menuTab === tab.key
                    ? 'bg-orange-500 text-white shadow-[0_6px_18px_-12px_rgba(249,115,22,0.45)] scale-[1.02]'
                    : 'text-slate-300 bg-slate-800/40 border-slate-600/70 hover:border-slate-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {menuTab === 'consultation' ? (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-4">
            <p className="text-slate-400 text-sm mb-3">Scegli la modalità di studio</p>
            <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-3 mb-3">
              <p className="text-cyan-200 text-xs"><strong>💡 Suggerimento:</strong> Usa ❤️ <strong>Preferiti</strong> per le parole che vuoi aggiungere al tuo vocabolario personale. Usa 📝 <strong>Ripasso</strong> per le parole di cui non sei sicuro e che vuoi rivedere.</p>
            </div>
            <div className="grid gap-2">
              {[
                {
                  key: 'consultation',
                  label: 'Elenco',
                  description: 'Visualizza le parole filtrate in elenco con definizioni ed esempi.',
                  icon: <BookOpen className="w-4 h-4" />
                },
                {
                  key: 'consultationFlashcard',
                  label: 'Flashcard termine',
                  description: 'Vedi la parola, clicca per leggere definizione e dettagli.',
                  icon: <Brain className="w-4 h-4" />
                },
                {
                  key: 'consultationFlashcardDefinition',
                  label: 'Flashcard definizione',
                  description: 'Vedi solo la definizione, clicca per scoprire il lemma e i dettagli.',
                  icon: <Brain className="w-4 h-4" />
                },
                {
                  key: 'personalSentences',
                  label: 'Frasi personali',
                  description: 'Scrivi e salva frasi tue per ogni parola (finiscono nel CSV/TXT).',
                  icon: <Edit3 className="w-4 h-4" />
                }
              ].map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => selectMode(mode.key)}
                  className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border text-slate-200 hover:text-orange-200 hover:border-amber-300/60 border-slate-600/70 bg-slate-800/80 hover:bg-slate-700/70"
                  aria-label={`${mode.label}: ${mode.description}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-700/80 px-2 py-1 rounded-lg text-xs text-slate-200">{mode.icon}</span>
                    <div className="flex flex-col">
                      <span>{mode.label}</span>
                      <span className="text-xs font-normal text-slate-400">{mode.description}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ) : menuTab === 'games' ? (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-4">
            <p className="text-slate-400 text-sm mb-3">Scegli con quale gioco imparare</p>
            <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-3 mb-3">
              <p className="text-cyan-200 text-xs"><strong>💡 Suggerimento:</strong> Usa ❤️ <strong>Preferiti</strong> per le parole che vuoi aggiungere al tuo vocabolario personale. Usa 📝 <strong>Ripasso</strong> per le parole di cui non sei sicuro e che vuoi rivedere.</p>
            </div>
            <div className="grid gap-2">
              {[
                { key: 'flashcard', label: 'Flashcard', desc: 'Studia le parole una alla volta', icon: <Brain className="w-4 h-4" /> },
                { key: 'quiz', label: 'Quiz', desc: 'Scegli la definizione corretta', icon: <Target className="w-4 h-4" /> },
                { key: 'fillBlank', label: 'Completa', desc: 'Scrivi la parola dalla definizione', icon: <Sparkles className="w-4 h-4" /> },
                { key: 'phrase', label: 'Frasi', desc: 'Indovina la parola mancante dal caso d\'uso', icon: <HelpCircle className="w-4 h-4" /> },
                { key: 'match', label: 'Memory', desc: 'Abbina parole e definizioni', icon: <Shuffle className="w-4 h-4" /> }
              ].map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => selectMode(mode.key)}
                  className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border text-slate-200 hover:text-orange-200 hover:border-amber-300/60 border-slate-600/70 bg-slate-800/80 hover:bg-slate-700/70"
                  aria-label={`Gioca a ${mode.label}: ${mode.desc}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-700/80 px-2 py-1 rounded-lg text-xs text-slate-200">{mode.icon}</span>
                    <div className="flex flex-col">
                      <span>{mode.label}</span>
                      <span className="text-xs font-normal text-slate-400">{mode.desc}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ReviewPanel />
        )}

      </div>
    </div>
  );

  // Schermata selezione numero domande
  const QuestionLimitSelection = () => {
    const limits = [5, 10, 20, 50];
    const modeNames = {
      flashcard: 'Flashcard',
      quiz: 'Quiz',
      speedQuiz: 'Speed Quiz',
      fillBlank: 'Completa',
      phrase: 'Frasi'
    };
    const totalAvailable = getFilteredWords().length || words.length;
    const noWords = totalAvailable === 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/40 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full text-center border border-slate-700/50">
          <h2 className="text-2xl font-bold text-slate-100 mb-1">
            {pendingMode === 'speedQuiz' ? modeNames['quiz'] : modeNames[pendingMode]}
          </h2>
          <p className="text-slate-400 mb-8">
          {pendingMode === 'quiz' || pendingMode === 'speedQuiz'
            ? 'Quante domande vuoi?'
            : pendingMode === 'fillBlank'
              ? 'Quante parole vuoi indovinare?'
              : 'Quante ne vuoi?'}
          </p>
          
          {noWords ? (
            <div className="bg-red-900/30 text-red-200 p-4 rounded-xl">
              Nessuna parola disponibile con questo filtro. Torna indietro e verifica “Solo sbagliate”/tranche.
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingMode === 'quiz' && (
                <>
                  <label className="flex items-center justify-between bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200">
                    <span>Attiva timer (Speed)</span>
                    <input
                      type="checkbox"
                      checked={quizTimed}
                      onChange={(e) => setQuizTimed(e.target.checked)}
                      className="accent-cyan-500 h-4 w-4"
                    />
                  </label>
                  <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-3 text-left text-slate-200 space-y-2">
                    <p className="text-sm font-semibold">Modalità domanda</p>
                    <select
                      value={quizQuestionType}
                      onChange={(e) => setQuizQuestionType(e.target.value)}
                      className="w-full bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="definition">Definizione → Parola</option>
                      <option value="term">Parola → Definizione</option>
                      <option value="synonyms">Sinonimi → Parola</option>
                      <option value="antonyms">Contrari → Parola</option>
                    </select>
                  </div>
                </>
              )}
              {limits.map(limit => (
                <button
                  key={limit}
                  onClick={() => startGame(pendingMode === 'quiz' && quizTimed ? 'speedQuiz' : pendingMode, limit)}
                  className="bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/50 p-4 rounded-xl transition-all flex items-center justify-center gap-3"
                  disabled={limit === 0}
                >
                  <span className="text-3xl font-bold text-slate-200">{limit}</span>
                </button>
              ))}
              
              {totalAvailable > 50 && (
                <button
                  onClick={() => startGame(pendingMode, totalAvailable)}
                  className="bg-gradient-to-r from-cyan-900 to-sky-900 p-4 rounded-xl transition-all flex items-center justify-center gap-3 border border-cyan-800/50"
                >
                  <span className="text-2xl font-bold text-slate-100">Tutte</span>
                  <span className="text-slate-300">({totalAvailable} parole)</span>
                </button>
              )}
            </div>
          )}
          
          <button 
            onClick={() => { setShowModeSelection(false); setPendingMode(null); }}
            className="mt-6 text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Indietro
          </button>
        </div>
      </div>
    );
  };

  // Pannello Risultati
  const ReviewPanel = () => {
    const isReviewList = reviewView === 'review';
    const isCorrectList = reviewView === 'played';
    const isLearnedList = reviewView === 'learned';

    let activeList = [];
    if (isReviewList) {
      activeList = wordsToReview;
    } else if (isCorrectList) {
      activeList = playedWords;
    } else if (isLearnedList) {
      activeList = words.filter(w => w.learned);
    }

    const emptyMessage = isReviewList
      ? 'Nessuna parola da rivedere ancora.'
      : isCorrectList
      ? 'Nessuna risposta corretta salvata in questa sessione.'
      : 'Nessuna parola segnata come appresa.';

    useLayoutEffect(() => {
      if (reviewListRef.current) {
        reviewListRef.current.scrollTop = reviewScrollPos.current;
      }
    }, [reviewView, activeList.length]);

    const handleRemove = (idx) => {
      preserveReviewScroll(() => {
        if (isReviewList) {
          const term = activeList[idx]?.term;
          setWordsToReview(prev => prev.filter((_, i) => i !== idx));
          if (term) {
            updateLearned(term, false);
          }
        } else if (isCorrectList) {
          setPlayedWords(prev => prev.filter((_, i) => i !== idx));
        } else if (isLearnedList) {
          const term = activeList[idx]?.term;
          if (term) {
            updateLearned(term, false);
          }
        }
      });
    };

    const detailTitle = reviewView === 'review' ? 'Ripasso' : reviewView === 'played' ? 'Risposte corrette' : 'Apprese';

    const DownloadBlock = () => (
      <div className="pt-4 border-t border-slate-700/50 space-y-3 flex-shrink-0 bg-slate-900/30 rounded-2xl p-4">
        {copyFeedback && (
          <div className="text-center text-cyan-400 font-medium mb-2" role="status" aria-live="polite">
            {copyFeedback}
          </div>
        )}

        <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-3 mb-3">
          <p className="text-slate-300 text-xs leading-relaxed mb-2">
            <strong className="text-cyan-300">📋 Copia negli appunti (TXT):</strong> Include le sezioni selezionate sotto. Ideale per studiare o condividere velocemente.
          </p>
          <p className="text-slate-300 text-xs leading-relaxed">
            <strong className="text-cyan-300">💾 Scarica CSV:</strong> Tutto il vocabolario con colonne aggiornate: APPRESO (SI/NO/RIPASSO), Preferito (SI/NO), Frasi personali. Ricaricalo nella prossima sessione per continuare da dove hai lasciato.
          </p>
        </div>

        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 mb-3">
          <p className="text-slate-300 text-xs font-semibold mb-2">Cosa includere nell'export TXT:</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer hover:text-cyan-300 transition">
              <input
                type="checkbox"
                checked={exportIncludeRipasso}
                onChange={(e) => setExportIncludeRipasso(e.target.checked)}
                className="accent-cyan-500"
              />
              Ripasso
            </label>
            <label className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer hover:text-cyan-300 transition">
              <input
                type="checkbox"
                checked={exportIncludePreferite}
                onChange={(e) => setExportIncludePreferite(e.target.checked)}
                className="accent-cyan-500"
              />
              Preferite
            </label>
            <label className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer hover:text-cyan-300 transition">
              <input
                type="checkbox"
                checked={exportIncludeCorrette}
                onChange={(e) => setExportIncludeCorrette(e.target.checked)}
                className="accent-cyan-500"
              />
              Risposte corrette
            </label>
            <label className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer hover:text-cyan-300 transition">
              <input
                type="checkbox"
                checked={exportIncludeApprese}
                onChange={(e) => setExportIncludeApprese(e.target.checked)}
                className="accent-cyan-500"
              />
              Apprese
            </label>
            <label className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer hover:text-cyan-300 transition col-span-2">
              <input
                type="checkbox"
                checked={exportIncludeFrasi}
                onChange={(e) => setExportIncludeFrasi(e.target.checked)}
                className="accent-cyan-500"
              />
              Frasi personali
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => copyToClipboard('text')}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded-lg border border-slate-600 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copia negli appunti
            </button>
            <button
              onClick={() => setShowExportFormatPicker(prev => !prev)}
              className="flex-1 bg-cyan-900 hover:bg-cyan-800 text-slate-50 px-4 py-2 rounded-lg border border-cyan-800/60 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Scarica file
            </button>
          </div>
          {showExportFormatPicker && (
            <div className="space-y-2 pt-2 border-t border-slate-700">
              <label className="text-slate-400 text-sm">Scegli formato da scaricare:</label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => downloadFile('text')}
                  className="bg-slate-800/70 hover:bg-slate-700 border border-slate-700 text-slate-100 rounded-lg px-4 py-2.5 text-sm transition-colors text-left"
                >
                  <div className="font-semibold">TXT</div>
                  <div className="text-xs text-slate-400 mt-0.5">Solo preferiti, ripasso e frasi personali</div>
                </button>
                <button
                  onClick={() => downloadFile('csv')}
                  className="bg-slate-800/70 hover:bg-slate-700 border border-slate-700 text-slate-100 rounded-lg px-4 py-2.5 text-sm transition-colors text-left"
                >
                  <div className="font-semibold">CSV</div>
                  <div className="text-xs text-slate-400 mt-0.5">Tutto il vocabolario con progressi aggiornati</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );

    let content = null;

    if (resultsView === 'menu') {
      content = (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-slate-400 text-sm">Controlla i progressi e programma il lavoro futuro</p>
            <button
              type="button"
              onClick={() => setShowReviewHelp(true)}
              className="w-6 h-6 rounded-full border border-slate-600 text-slate-300 text-xs flex items-center justify-center hover:text-cyan-300 hover:border-cyan-500"
              aria-label="Info Risultati"
            >
              i
            </button>
          </div>

          <div className="grid gap-2">
            {[
              {
                key: 'review',
                title: 'Ripasso',
                count: wordsToReview.length,
                description: 'Parole segnate per i prossimi ripassi.',
                icon: <RotateCcw className="w-4 h-4" />
              },
              {
                key: 'played',
                title: 'Risposte corrette',
                count: playedWords.length,
                description: 'Le ultime risposte giuste nei giochi.',
                icon: <Check className="w-4 h-4" />
              },
              {
                key: 'learned',
                title: 'Apprese',
                count: words.filter(w => w.learned).length,
                description: 'Parole che hai già memorizzato.',
                icon: <Sparkles className="w-4 h-4" />
              }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setReviewView(item.key);
                  setResultsView(item.key);
                }}
                className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold border text-slate-200 bg-slate-800/80 border-slate-600/70"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/80 border border-slate-600/70 flex items-center justify-center text-slate-200">
                    {item.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2">
                      <span className="text-sm text-slate-100">{item.title}</span>
                      <span className="text-xs text-cyan-300">({item.count})</span>
                    </span>
                    <span className="text-xs font-normal text-slate-400">{item.description}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            ))}
          </div>
        </>
      );
    } else {
      content = (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResultsView('menu')}
                className="flex items-center gap-2 text-slate-300 hover:text-orange-200 text-sm font-semibold"
              >
                <ChevronLeft className="w-4 h-4" /> Risultati
              </button>
              <span className="text-slate-500">/</span>
              <h2 className="text-xl font-bold text-slate-100">{detailTitle}</h2>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span>{activeList.length} parole</span>
              <button
                type="button"
                onClick={() => setShowReviewHelp(true)}
                className="w-6 h-6 rounded-full border border-slate-600 text-slate-300 text-xs flex items-center justify-center hover:text-cyan-300 hover:border-cyan-500"
                aria-label="Info Risultati"
              >
                i
              </button>
            </div>
          </div>

          {activeList.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {emptyMessage}
            </div>
          ) : (
            <div
              ref={reviewListRef}
              className="p-2 overflow-y-auto max-h-[55vh] rounded-xl"
              onScroll={() => {
                if (reviewListRef.current) {
                  reviewScrollPos.current = reviewListRef.current.scrollTop;
                }
              }}
            >
              {activeList.map((word, idx) => {
                const isLearned = !!word.learned;
                const inReview = wordsToReview.some(w => w.term === word.term);
                return (
                  <div key={word.term} className="bg-slate-800/30 rounded-xl p-4 mb-3 border border-slate-700/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-100">{word.term}</h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(word.term);
                            }}
                            className="text-slate-400 hover:text-amber-300 transition-colors"
                            aria-label="Preferito"
                          >
                            <Heart className={`w-4 h-4 ${favorites.has(word.term) || word.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                          </button>
                        </div>
                        {word.accent && (
                          <p className="text-slate-400 text-sm">Accento: {word.accent}</p>
                        )}
                        {word.source && (
                          <p className="text-slate-500 text-xs mt-1 capitalize">Origine: {word.source === 'game' ? 'Errore/gioco' : 'Aggiunta manuale'}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {isReviewList && (
                          <>
                            <button
                              onClick={() => markWordAsLearned(word.term)}
                              className="text-xs px-3 py-1 rounded-full transition font-semibold bg-emerald-600 text-emerald-50 hover:bg-emerald-500"
                            >
                              Appresa
                            </button>
                            <button
                              onClick={() => markWordAsToReview(word.term)}
                              className="text-xs px-3 py-1 rounded-full transition font-semibold bg-slate-700 text-slate-100 hover:bg-slate-600"
                            >
                              Ripasso
                            </button>
                            <button
                              onClick={() => handleRemove(idx)}
                              className="text-xs px-3 py-1 rounded-full transition font-semibold bg-red-600 text-white hover:bg-red-500"
                            >
                              Appresa: NO
                            </button>
                          </>
                        )}
                        {isCorrectList && (
                          <>
                            <button
                              onClick={() => {
                                preserveReviewScroll(() => {
                                  markWordAsToReview(word.term);
                                  setPlayedWords(prev => prev.filter(w => w.term !== word.term));
                                });
                              }}
                              className="text-xs px-3 py-1 rounded-full bg-orange-500 text-white hover:bg-orange-400"
                            >
                              Aggiungi a Ripasso
                            </button>
                            <button
                              onClick={() => {
                                preserveReviewScroll(() => {
                                  markWordAsLearned(word.term);
                                  setPlayedWords(prev => prev.filter(w => w.term !== word.term));
                                });
                              }}
                              className="text-xs px-3 py-1 rounded-full transition font-semibold bg-emerald-600 text-emerald-50 hover:bg-emerald-500"
                            >
                              Appresa
                            </button>
                          </>
                        )}
                        {isLearnedList && (
                          <button
                            onClick={() => {
                              preserveReviewScroll(() => {
                                markWordAsToReview(word.term);
                              });
                            }}
                            className="text-xs px-3 py-1 rounded-full bg-orange-500 text-white hover:bg-orange-400"
                          >
                            Aggiungi a Ripasso
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-300 mt-2">{word.definition}</p>
                    {word.etymology && (
                      <p className="text-slate-400 text-sm italic mt-2">{word.etymology}</p>
                    )}
                    <ExamplesBlock word={word} />
                  </div>
                );
              })}
            </div>
          )}
        </>
      );
    }

    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-5 shadow-xl space-y-4">
        {content}
        <DownloadBlock />
      </div>
    );
  };

  const SelectionPanel = () => {
    const favoritesInCurrentSelection = useMemo(
      () => filteredPool.filter(w => favorites.has(w.term) || w.favorite).length,
      [filteredPool, favorites]
    );

    return (
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto"
        onClick={() => setShowSelectionPanel(false)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-dialog-title"
      >
        <div className="min-h-screen flex items-center justify-center p-4 py-8">
          <div
            className="bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-700/50 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 id="filters-dialog-title" className="text-2xl font-bold text-slate-100">Imposta i filtri</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAllFilters}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-1 rounded-xl font-semibold text-sm border border-slate-600 transition-colors"
                  aria-label="Resetta tutti i filtri"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowSelectionPanel(false)}
                  className="bg-cyan-900 text-slate-50 px-3 py-1 rounded-xl font-semibold text-sm border border-cyan-800/60 shadow-[0_6px_18px_-12px_rgba(34,211,238,0.35)]"
                  aria-label="Chiudi pannello filtri"
                >
                  Chiudi
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-slate-300 text-sm">Filtra le parole per concentrarti su un sottoinsieme specifico. I filtri si combinano tra loro.</p>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-200">
                    Parole attive: <span className="font-semibold text-cyan-300">{filteredPool.length}</span>
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-700/50 my-4"></div>
              <div className="grid gap-3">
                <p className="text-slate-400 text-xs px-1 mb-0.5 mt-5">Dividi le parole in gruppi più piccoli (es: studia il 10% alla volta invece di tutte insieme).</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/** Calcolo disponibilità tranche */}
                  {(() => {
                    const options = [10, 20, 33, 50];
                    const availability = computeChunkAvailability(getBaseFilteredWords());
                    const availableChunks = options.filter(p => availability[p]);
                    const currentValid = subsetMode === 'chunk' && availability[chunkPercent];
                    return (
                      <select
                        value={currentValid ? `chunk-${chunkPercent}` : 'all'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'all') {
                            setSubsetMode('all');
                          } else {
                            const perc = parseInt(val.split('-')[1], 10) || 10;
                            if (!availability[perc]) {
                              triggerSelectionWarning('Tranche disabilitata: servono più parole (almeno 1 per fetta per lettera).');
                              setSubsetMode('all');
                              return;
                            }
                            setSubsetMode('chunk');
                            setChunkPercent(perc);
                            setChunkIndex(0);
                          }
                        }}
                        className="bg-slate-800/60 text-slate-100 rounded-xl px-4 py-3"
                        aria-label="Seleziona tranche percentuale"
                      >
                        <option value="all">Tutte (casuale)</option>
                        {availableChunks.map((perc) => (
                          <option key={perc} value={`chunk-${perc}`}>Tranche {perc}%</option>
                        ))}
                      </select>
                    );
                  })()}

                {subsetMode === 'chunk' && (
                  <select
                    value={chunkIndex}
                    onChange={(e) => setChunkIndex(parseInt(e.target.value, 10))}
                    className="bg-slate-800/60 text-slate-100 rounded-xl px-4 py-3"
                    aria-label="Seleziona quale tranche"
                  >
                    {Array.from({ length: Math.max(1, Math.floor(100 / chunkPercent)) }).map((_, idx) => (
                      <option key={idx} value={idx}>
                        {idx + 1}° tranche ({idx === Math.floor(100 / chunkPercent) - 1 && chunkPercent === 33 ? 34 : chunkPercent}%)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-slate-400 text-xs px-1 mb-0.5 mt-4">Mostra solo parole che iniziano con lettere specifiche (es: solo A, B, C).</div>
              <div className="relative">
                <button
                  onClick={() => setShowLetterPicker(prev => !prev)}
                  className="w-full bg-slate-800/60 text-slate-200 rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between shadow-inner"
                  type="button"
                  aria-expanded={showLetterPicker}
                  aria-label={`Filtra per lettere, attualmente selezionate: ${getLetterFilterLabel()}`}
                  aria-controls="letter-picker-panel"
                >
                  <span className="text-sm tracking-wide text-slate-200">Lettere</span>
                  <span className="text-slate-100 font-semibold whitespace-nowrap text-sm">({getLetterFilterLabel()})</span>
                </button>
                {showLetterPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowLetterPicker(false)}
                      aria-hidden="true"
                    />
                    <div id="letter-picker-panel" className="relative z-20 bg-slate-900 border border-slate-500 rounded-xl p-3 shadow-xl w-full mt-2" role="region" aria-label="Selezione lettere">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          className={`text-xs px-2 py-1 rounded border ${consultLetters.includes('all') ? 'border-amber-300 text-amber-200' : 'border-slate-600 text-slate-300 hover:border-slate-500'}`}
                          onClick={() => toggleLetterFilter('all')}
                        >
                          Tutte
                        </button>
                      </div>
                      <div className="grid grid-cols-6 gap-1 text-slate-200 text-xs">
                        {alphabet.map(letter => {
                          const active = consultLetters.includes(letter);
                          return (
                            <label key={letter} className={`flex items-center gap-1 px-1 py-0.5 rounded ${active ? 'bg-amber-500/20 text-amber-200' : 'hover:bg-slate-800'}`}>
                              <input
                                type="checkbox"
                                className="accent-amber-400"
                                checked={active}
                                onChange={() => toggleLetterFilter(letter)}
                              />
                              <span className="uppercase">{letter}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="text-slate-400 text-xs px-1 mb-0.5 mt-4">Mostra solo le parole che hai salvato come preferite cliccando il cuore ❤️.</div>
              <label className="flex items-center justify-between gap-3 text-slate-200 bg-slate-800/60 rounded-xl px-4 py-3 shadow-inner">
                <div className="flex items-center gap-2 text-sm leading-tight">
                  <span>Preferiti</span>
                  <span className="text-xs text-slate-400 ml-1">({favoritesInCurrentSelection})</span>
                </div>
                <input
                  type="checkbox"
                  checked={consultFavorites}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setConsultFavorites(checked);
                    if (checked) {
                      setSubsetMode('all');
                      setChunkIndex(0);
                    }
                  }}
                  className="accent-amber-400 h-4 w-4"
                  aria-label={`Filtra solo preferiti (${favorites.size} parole)`}
                />
              </label>
              <div className="text-slate-400 text-xs px-1 mb-0.5 mt-4">Mostra solo le parole che hai aggiunto al Ripasso cliccando "+ Ripasso" durante studio o giochi.</div>
              <label className="flex items-center justify-between gap-3 text-slate-200 bg-slate-800/60 rounded-xl px-4 py-3 shadow-inner">
                <div className="flex items-center gap-2 text-sm leading-tight">
                  <span>Ripasso</span>
                  <span className="text-xs text-slate-400 ml-1">({wordsToReview.length})</span>
                </div>
                <input
                  type="checkbox"
                  checked={onlyWrongSubset}
                  onChange={(e) => setOnlyWrongSubset(e.target.checked)}
                  className="accent-cyan-500 h-4 w-4"
                  aria-label={`Filtra solo parole da ripassare (${wordsToReview.length} parole)`}
                />
              </label>

              <div className="text-slate-400 text-xs px-1 mb-0.5 mt-4">Filtra in base allo stato di apprendimento salvato nel CSV (colonna "APPRESO").</div>
              <div className="flex items-center justify-between gap-3 text-slate-200 bg-slate-800/60 rounded-xl px-4 py-3 shadow-inner">
                <div className="flex items-center gap-2 text-sm leading-tight">
                  <span>Stadio di apprendimento</span>
                </div>
                <select
                  value={learnedFilter}
                  onChange={(e) => setLearnedFilter(e.target.value)}
                  className="bg-slate-900/70 text-slate-100 rounded-lg px-3 py-2 text-sm"
                  aria-label="Filtra per stadio di apprendimento"
                >
                  <option value="all">Tutti</option>
                  <option value="yes">Apprese (SI)</option>
                  <option value="no">Non apprese (NO)</option>
                  <option value="ripasso">Ripasso (RIPASSO)</option>
                </select>
              </div>

              <div className="text-slate-400 text-xs px-1 mb-0.5 mt-4">Mostra solo parole aggiunte di recente (in base alla colonna "Data di inserimento" del CSV).</div>
              <div className="flex items-center justify-between gap-3 text-slate-200 bg-slate-800/60 rounded-xl px-4 py-3 shadow-inner">
                <div className="flex items-center gap-2 text-sm leading-tight">
                  <span>Ultime inserite</span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={useRecent ? recentMode : 'none'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'none') {
                        setUseRecent(false);
                      } else {
                        setUseRecent(true);
                        setRecentMode(val);
                      }
                    }}
                    className="bg-slate-900/70 text-slate-100 rounded-lg px-3 py-2 text-sm min-w-[180px]"
                    aria-label="Filtra per data di inserimento"
                  >
                    <option value="none">Disattivo</option>
                    <option value="count">Ultime (numero)</option>
                    <option value="day1">Ultime 24h</option>
                    <option value="days7">Ultimi 7 giorni</option>
                    <option value="month1">Ultimo mese</option>
                    <option value="sinceDate">Da data specifica</option>
                  </select>
                  {useRecent && recentMode === 'count' && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">Quante:</span>
                      <input
                        type="number"
                        min="1"
                        value={recentLimit}
                        onChange={(e) => setRecentLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-20 bg-slate-900/70 text-slate-100 rounded-lg px-2 py-1 text-sm"
                        aria-label="Numero di parole recenti"
                      />
                    </div>
                  )}
                  {useRecent && recentMode === 'sinceDate' && (
                    <input
                      type="date"
                      value={recentSince}
                      onChange={(e) => setRecentSince(e.target.value)}
                      className="bg-slate-900/70 text-slate-100 rounded-lg px-2 py-1 text-sm"
                      aria-label="Data di inizio per filtrare parole"
                    />
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  };
  const HeaderBar = ({ rightContent }) => (
    <div className="flex items-center justify-between mb-6 bg-amber-400 text-slate-900 rounded-2xl px-4 py-3 shadow-[0_6px_18px_-12px_rgba(251,191,36,0.45)]">
      <button
        onClick={() => setGameMode(null)}
        className="flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Menu</span>
      </button>
      <div className="flex items-center gap-3">
        {rightContent}
      </div>
    </div>
  );

  // Header del gioco
  const GameHeader = () => (
    <HeaderBar
      rightContent={
        <>
          {wordsToReview.length > 0 && (
            <button
              onClick={() => {
                setGameMode(null);
                setMenuTab('results');
                setResultsView('menu');
              }}
              className="bg-slate-900/20 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-slate-900/30 transition-colors border border-slate-900/30 text-slate-900"
            >
              <BookOpen className="w-4 h-4" />
              <span className="font-bold">{wordsToReview.length}</span>
            </button>
          )}
          {gameMode !== 'match' && gameMode !== 'flashcard' && streak > 1 && (
            <div className="bg-white/30 px-3 py-1 rounded-full flex items-center gap-1 border border-white/50">
              <Flame className="w-4 h-4 text-orange-700" />
              <span className="font-bold">{streak}</span>
            </div>
          )}
        </>
      }
    />
  );

  const FoxInline = () => (
    <div className="flex justify-center mt-6">
      <button
        type="button"
        onClick={handleFoxClick}
        aria-label="Logo volpe"
        className="hover:scale-110 transition-transform"
      >
        <img
          src={
            foxVariant === 'feedback-ok'
              ? LogoVolpinaOcchiAperti
              : foxVariant === 'feedback-wrong'
              ? LogoVolpinaTestaAlzata
              : foxVariant === 'happy'
              ? LogoVolpinaOcchiAperti
              : foxVariant === 'alt'
              ? LogoVolpinaTestaAlzata
              : LogoVolpinaChiusi
          }
          alt="Logo"
          className={`h-[70px] w-auto transition-transform ${foxAnim ? (foxAnimSize === 'small' ? 'scale-110' : 'scale-125') : ''}`}
        />
      </button>
    </div>
  );

  // Flashcard Mode
  const FlashcardMode = () => {
    const word = shuffledWords[currentIndex];
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
        <div className="max-w-lg mx-auto pt-4">
          <GameHeader />
          
          <div className="text-center text-slate-400 mb-4">
            {Math.min(currentIndex + 1, shuffledWords.length)} / {shuffledWords.length}
          </div>

          <div 
            onClick={() => {
              const next = !showAnswer;
              setShowAnswer(next);
              if (next) showFoxOpenEyes();
            }}
            className="bg-slate-800/40 backdrop-blur-lg rounded-3xl p-8 min-h-[300px] flex flex-col justify-center cursor-pointer border border-slate-700/50 transform transition-all hover:scale-105"
          >
            {!showAnswer ? (
              <>
                <h2 className="text-3xl font-bold text-slate-100 mb-2">{word.term}</h2>
                {word.accent && (
                  <p className="text-slate-400 text-sm mb-4">Accento: {word.accent}</p>
                )}
                <p className="text-slate-500 text-sm">Tocca per vedere la definizione</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">{word.term}</h2>
                {word.accent && (
                  <p className="text-slate-400 text-sm mb-3">Accento: {word.accent}</p>
                )}
                <p className="text-slate-300 text-lg mb-4">{word.definition}</p>
                {(word.frequencyUsage || (word.technical && word.technical.toLowerCase() !== 'comune')) && (
                  <div className="text-slate-400 text-sm space-y-1 mb-3">
                    {word.frequencyUsage && <p>Frequenza d'uso: {word.frequencyUsage}</p>}
                    {word.technical && word.technical.toLowerCase() !== 'comune' && <p>Linguaggio tecnico: {word.technical}</p>}
                  </div>
                )}
                {word.etymology && (
                  <p className="text-slate-400 text-sm italic mb-2">{word.etymology}</p>
                )}
                <ExamplesBlock word={word} className="mt-4" />
              </>
            )}
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={() => { setShowAnswer(false); handleWrongAnswer(null, { autoAdvance: true }); }}
              className="bg-red-950/30 hover:bg-red-950/50 text-red-400 px-8 py-3 rounded-xl flex items-center gap-2 transition-colors border border-red-900/50"
            >
              <X className="w-5 h-5" /> Ripasso
            </button>
            <button
              onClick={() => { setShowAnswer(false); handleCorrectAnswer(); }}
              className="bg-cyan-950/30 hover:bg-cyan-950/50 text-cyan-400 px-8 py-3 rounded-xl flex items-center gap-2 transition-colors border border-cyan-900/50"
            >
              <Check className="w-5 h-5" /> La so!
            </button>
          </div>
          <FoxInline />
        </div>
      </div>
    );
  };

  // Quiz Mode
  const QuizMode = () => {
    const word = shuffledWords[currentIndex];
    const safeSynonyms = cleanOptionalField(word.synonyms);
    const safeAntonyms = cleanOptionalField(word.antonyms);
    const getPrompt = () => {
      switch (quizQuestionType) {
        case 'term':
          return { label: 'Qual è la definizione di...', text: word.term };
        case 'synonyms':
          return { label: 'Quale parola corrisponde a questi sinonimi?', text: safeSynonyms || '—' };
        case 'antonyms':
          return { label: 'Quale parola corrisponde a questi contrari?', text: safeAntonyms || '—' };
        default:
          return { label: 'Qual è la parola per...', text: word.definition };
      }
    };

    const getOptionLabel = (option) => {
      if (quizQuestionType === 'term') return option.definition || option.term;
      return option.term;
    };

    const prompt = getPrompt();
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
        <div className="max-w-lg mx-auto pt-4">
          <GameHeader />

          {gameMode === 'speedQuiz' && (
            <div className="mb-4">
              <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${timeLeft > 5 ? 'bg-cyan-600' : 'bg-red-600'}`}
                  style={{ width: `${(timeLeft / SPEED_TIME) * 100}%` }}
                />
              </div>
              <div className="text-center mt-2">
                <span className={`text-2xl font-bold ${timeLeft > 5 ? 'text-cyan-400' : 'text-red-400'}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
          )}

          <div className="text-center text-slate-400 mb-4">
            {currentIndex + 1} / {shuffledWords.length}
          </div>

          <div className="bg-slate-800/40 backdrop-blur-lg rounded-3xl p-6 mb-6 border border-slate-700/50">
            <p className="text-slate-500 text-sm mb-2">{prompt.label}</p>
            <p className="text-xl text-slate-100">{prompt.text || '—'}</p>
          </div>

          {!waitingForContinue && (
            <div className="grid gap-3">
              {quizOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuizSelect(option)}
                  disabled={selectedAnswer !== null}
                  className={`p-4 rounded-xl text-left transition-all transform ${
                    selectedAnswer === null
                      ? 'bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 border border-slate-600/50'
                      : selectedAnswer === option.term
                        ? option.term === word.term
                          ? 'bg-cyan-900/50 text-slate-100 scale-105 border border-cyan-800/50'
                          : 'bg-red-900/50 text-slate-100 border border-red-800/50'
                        : option.term === word.term
                          ? 'bg-cyan-900/30 text-slate-100 border border-cyan-800/50'
                          : 'bg-slate-800/20 text-slate-500 border border-slate-700/30'
                  }`}
                >
                  <span className="font-medium">{getOptionLabel(option)}</span>
                </button>
              ))}
            </div>
          )}

          {(isCorrect !== null || waitingForContinue) && (
            <AnswerDetailCard
              word={showCorrectAnswer || word}
              isCorrect={isCorrect}
              onContinue={
                waitingForContinue
                  ? () => { setWaitingForContinue(false); nextWord(); }
                  : null
              }
              continueHint={waitingForContinue ? 'o premi Invio' : null}
            />
          )}
          <FoxInline />
        </div>
      </div>
    );
  };

  // Fill Blank Mode
  const FillBlankMode = () => {
    const word = shuffledWords[currentIndex];
    if (!word) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
          <div className="max-w-lg mx-auto pt-4 text-center text-slate-300">
            Nessuna parola disponibile per questa modalità. Torna indietro e seleziona un set.
          </div>
        </div>
      );
    }
    // Primo aiuto considera già le due lettere date: aggiungiamo subito una lettera extra (hintLevel + 1)
    const hintData = showHint ? generateHint(word.term, hintLevel + 1) : null;
    const masked = useMemo(() => {
      const term = word.term || '';
      if (term.length <= 2) return term;
      const first = term[0];
      const last = term[term.length - 1];
      const middle = '_'.repeat(Math.max(term.length - 2, 0));
      return `${first}${middle}${last}`;
    }, [word.term]);

    // Testo del prompt: sempre definizione se presente, altrimenti un esempio casuale (stabile per parola)
    const promptText = useMemo(() => {
      if (word.definition) return word.definition;
      const stableExample = pickStableExample(word);
      return stableExample || 'Inserisci la parola mancante.';
    }, [word, currentIndex]);
    
    // Se l'aiuto supera l'80%, segna come sbagliato automaticamente
    if (hintData && hintData.lost && isCorrect === null) {
      handleWrongAnswer();
    }
    
    const handleHintClick = () => {
      if (!showHint) {
        setShowHint(true);
        setHintLevel(0);
      } else {
        setHintLevel(hintLevel + 1);
      }
    };
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
        <div className="max-w-lg mx-auto pt-4">
          <GameHeader />

          <div className="text-center text-slate-400 mb-4">
            {currentIndex + 1} / {shuffledWords.length}
          </div>

          <div className="bg-slate-800/40 backdrop-blur-lg rounded-3xl p-6 mb-6 border border-slate-700/50">
            <p className="text-slate-500 text-sm mb-2">Scrivi la parola:</p>
            <p className="text-xl text-slate-100 mb-4">{promptText}</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-cyan-300 font-mono text-lg">Schema:</p>
              <p className="text-cyan-100 font-mono text-xl tracking-wide">{masked}</p>
              <span className="text-slate-500 text-sm">({word.term.length} lettere)</span>
            </div>
            
            {showHint && hintData && (
              <div className="mt-4 p-3 bg-cyan-950/30 rounded-lg border border-cyan-900/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-cyan-400 text-sm">💡 Aiuto {hintLevel + 1}:</p>
                  <p className="text-cyan-500 text-xs">{Math.round(hintData.percent)}% visibile</p>
                </div>
                <p className="text-2xl font-mono text-cyan-300 tracking-wider">{hintData.hint}</p>
                {hintData.percent > 60 && !hintData.lost && (
                  <p className="text-orange-400 text-xs mt-2">⚠️ Attenzione! Oltre l'80% perderai</p>
                )}
                {hintData.lost && (
                  <p className="text-red-400 text-sm mt-2">❌ Troppi aiuti! Segno come sbagliato...</p>
                )}
              </div>
            )}
          </div>

          {(isCorrect !== null || waitingForContinue) && (
            <AnswerDetailCard
              word={showCorrectAnswer || word}
              isCorrect={isCorrect}
              onContinue={
                waitingForContinue
                  ? () => { setWaitingForContinue(false); nextWord(); }
                  : null
              }
              continueHint={waitingForContinue ? 'o premi Invio' : null}
            />
          )}

          {!waitingForContinue && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isCorrect === null && !waitingForContinue && fillBlankInput.trim() && !(hintData && hintData.lost)) {
                    checkFillBlank();
                  }
                }}
                className="flex flex-col items-stretch"
              >
                <div className="flex gap-3 mb-1 items-start">
                  <input
                    type="text"
                    value={fillBlankInput}
                    onChange={(e) => setFillBlankInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                        e.preventDefault();
                        e.currentTarget.select();
                      }
                    }}
                    placeholder="Scrivi la parola..."
                  className="flex-1 bg-slate-700/30 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-800"
                  disabled={isCorrect !== null || (hintData && hintData.lost)}
                  autoFocus
                />
                <div className="flex flex-col items-start gap-1">
                  <button
                    type="submit"
                    disabled={isCorrect !== null || !fillBlankInput.trim() || (hintData && hintData.lost)}
                    className="bg-cyan-900 hover:bg-cyan-800 text-slate-100 px-6 py-3 rounded-xl transition-colors border border-cyan-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Verifica
                  </button>
                  <p className="text-left text-slate-500 text-xs">o premi Invio</p>
                </div>
              </div>
            </form>

              <button
                onClick={handleHintClick}
                disabled={isCorrect !== null || (hintData && hintData.lost)}
                className="w-full bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 py-2 rounded-xl transition-colors border border-slate-600/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HelpCircle className="w-4 h-4" />
                {!showHint ? 'Mostra aiuto' : `Aiuto aggiuntivo (${hintLevel + 1})`}
              </button>

            </>
          )}
          <FoxInline />
        </div>
      </div>
    );
  };

  // Phrase Mode (frasi con parola mancante)
  const PhraseMode = () => {
    const word = shuffledWords[currentIndex];
    if (!word) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
          <div className="max-w-lg mx-auto pt-4 text-center text-slate-300">
            Nessuna frase disponibile per questa modalità. Torna indietro e seleziona un set.
          </div>
        </div>
      );
    }

    const phraseExample = useMemo(() => {
      const exList = [word.example1, word.example2, word.example3].filter(Boolean);
      if (exList.length === 0) return word.definition || '';
      // Se manca la seconda o la terza, usa sempre la prima
      if (exList.length < 3) return word.example1 || exList[0];
      const example = pickStableExample(word);
      return example || exList[0];
    }, [word, currentIndex]);

    const baseText = phraseExample;
    const { maskedText, targetWord } = useMemo(
      () => maskTargetInText(word.term, baseText),
      [word.term, baseText]
    );
    const hintData = showHint ? generateHint(targetWord, hintLevel + 1) : null;
    const masked = useMemo(() => {
      const term = targetWord || word.term || '';
      if (term.length <= 2) return term;
      const first = term[0];
      const last = term[term.length - 1];
      const middle = '_'.repeat(Math.max(term.length - 2, 0));
      return `${first}${middle}${last}`;
    }, [targetWord, word.term]);

    if (hintData && hintData.lost && isCorrect === null) {
      handleWrongAnswer();
    }

    const handleHintClick = () => {
      if (!showHint) {
        setShowHint(true);
        setHintLevel(0);
      } else {
        setHintLevel(hintLevel + 1);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
        <div className="max-w-lg mx-auto pt-4">
          <GameHeader />

          <div className="text-center text-slate-400 mb-4">
            {currentIndex + 1} / {shuffledWords.length}
          </div>

          <div className="bg-slate-800/40 backdrop-blur-lg rounded-3xl p-6 mb-6 border border-slate-700/50">
            <p className="text-slate-500 text-sm mb-2">Caso d'uso:</p>
            <p className="text-lg text-slate-100 mb-4">{maskedText}</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-cyan-300 font-mono text-lg">Parola:</p>
              <p className="text-cyan-100 font-mono text-xl tracking-wide">{hintData ? hintData.hint : masked}</p>
              <span className="text-slate-500 text-sm">({word.term.length} lettere)</span>
            </div>

            {showHint && hintData && !hintData.lost && (
              <div className="mt-4 p-3 bg-cyan-950/30 rounded-lg border border-cyan-900/50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-cyan-400 text-sm">💡 Aiuto {hintLevel + 1}:</p>
                  <p className="text-cyan-500 text-xs">{Math.round(hintData.percent)}% visibile</p>
                </div>
              </div>
            )}
            {hintData && hintData.lost && (
              <div className="mt-4 p-3 bg-red-900/30 rounded-lg border border-red-800/50 text-red-200 text-sm">
                ❌ Troppi aiuti! Segno come sbagliato...
              </div>
            )}
          </div>

          {(isCorrect !== null || waitingForContinue) && (
            <div className="mt-4 p-4 bg-slate-800/60 rounded-2xl border border-slate-700/70 text-left space-y-3">
              <div className={`text-lg font-bold ${isCorrect ? 'text-cyan-400' : 'text-red-400'}`}>
                {isCorrect ? '✅ Corretto' : '❌ Sbagliato'}
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-2xl font-extrabold text-emerald-200">{(showCorrectAnswer || { term: targetWord || word.term }).term}</span>
              </div>
              <div className="text-sm font-normal text-slate-200 space-y-2">
                {(showCorrectAnswer || word).accent && (
                  <p><span className="font-semibold">Accento:</span> <span className="italic text-slate-100">{(showCorrectAnswer || word).accent}</span></p>
                )}
                <p><span className="font-semibold">Definizione:</span> <span className="text-slate-100">{(showCorrectAnswer || word).definition}</span></p>
                {(showCorrectAnswer || word).etymology && (
                  <p><span className="font-semibold">Etimologia:</span> <span className="italic text-slate-300">{(showCorrectAnswer || word).etymology}</span></p>
                )}
                {(showCorrectAnswer || word).commonErrors && (
                  <p><span className="font-semibold">Errori frequenti:</span> <span className="text-slate-100">{(showCorrectAnswer || word).commonErrors}</span></p>
                )}
                {(showCorrectAnswer || word).frequencyUsage && (
                  <p><span className="font-semibold">Frequenza d'uso:</span> <span className="text-slate-100">{(showCorrectAnswer || word).frequencyUsage}</span></p>
                )}
                {(showCorrectAnswer || word).technical && (
                  <p><span className="font-semibold">Linguaggio tecnico:</span> <span className="text-slate-100">{(showCorrectAnswer || word).technical}</span></p>
                )}
              </div>
              <ExamplesBlock word={showCorrectAnswer || word} className="text-left" />
              {waitingForContinue && (
                <>
                  <button
                    type="button"
                    onClick={() => { setWaitingForContinue(false); nextWord(); }}
                    className="mt-2 bg-cyan-900 hover:bg-cyan-800 text-slate-100 px-4 py-2 rounded-xl border border-cyan-800/60 transition-colors"
                  >
                    Continua
                  </button>
                  <p className="text-left text-slate-500 text-xs">o premi Invio</p>
                </>
              )}
            </div>
          )}

          {!waitingForContinue && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isCorrect === null && !waitingForContinue && fillBlankInput.trim() && !(hintData && hintData.lost)) {
                    checkPhraseAnswer(targetWord, word.term);
                  }
                }}
                className="flex flex-col items-stretch"
              >
                <div className="flex gap-3 mb-1 items-start">
                  <input
                    type="text"
                    value={fillBlankInput}
                    onChange={(e) => setFillBlankInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                        e.preventDefault();
                        e.currentTarget.select();
                      }
                    }}
                    placeholder="Scrivi la parola..."
                  className="flex-1 bg-slate-700/30 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-800"
                  disabled={isCorrect !== null || (hintData && hintData.lost)}
                  autoFocus
                />
                <div className="flex flex-col items-start gap-1">
                  <button
                    type="submit"
                    disabled={isCorrect !== null || !fillBlankInput.trim() || (hintData && hintData.lost)}
                    className="bg-cyan-900 hover:bg-cyan-800 text-slate-100 px-6 py-3 rounded-xl transition-colors border border-cyan-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Verifica
                  </button>
                  <p className="text-left text-slate-500 text-xs">o premi Invio</p>
                </div>
              </div>
            </form>

              <button
                onClick={handleHintClick}
                disabled={isCorrect !== null || (hintData && hintData.lost)}
                className="w-full bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 py-2 rounded-xl transition-colors border border-slate-600/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HelpCircle className="w-4 h-4" />
                {!showHint ? 'Mostra aiuto' : `Aiuto aggiuntivo (${hintLevel + 1})`}
              </button>

            </>
          )}
          <FoxInline />
        </div>
      </div>
    );
  };

  // Match Game Mode
  const MatchMode = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
      <div className="max-w-2xl mx-auto pt-4">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setGameMode(null)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 px-3 py-2 rounded-xl font-semibold transition border border-amber-200 shadow-[0_6px_18px_-12px_rgba(251,191,36,0.45)]"
            >
              ← Menu
            </button>
            <div className="flex items-center gap-4">
              <div className="bg-sky-900/30 px-3 py-1 rounded-full border border-sky-800/50">
              <span className="text-sky-400">Mosse: {moves}</span>
            </div>
            <div className="bg-cyan-900/30 px-3 py-1 rounded-full border border-cyan-800/50">
              <span className="text-cyan-400">Trovate: {matchedPairs.length}/6</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {matchPairs.map((card) => {
            const isSelected = selectedCards.some(c => c.id === card.id);
            const isMatched = matchedPairs.includes(card.pairId);
            
            const isDefinition = card.type !== 'term';
            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(card)}
                disabled={isMatched}
                className={`p-4 rounded-xl min-h-[140px] max-h-[260px] overflow-hidden transition-all transform flex ${isDefinition ? 'items-start' : 'items-center'} justify-center ${
                  isMatched
                    ? 'bg-cyan-900/30 text-cyan-300 scale-95 border border-cyan-800/50'
                    : isSelected
                      ? 'bg-cyan-900 text-slate-100 scale-105 border border-cyan-800/50'
                      : 'bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 border border-slate-600/50'
                } ${card.type === 'term' ? 'font-bold text-base text-center' : 'text-sm leading-relaxed text-left'}`}
              >
                <span
                  className={`break-words w-full ${isDefinition ? 'overflow-y-auto pr-1 max-h-[220px]' : ''}`}
                  style={isDefinition ? {} : { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {card.content}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={initMatchGame}
          className="mt-6 mx-auto block text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RotateCcw className="w-5 h-5 inline mr-2" />
          Nuova partita
        </button>

        <FoxInline />
      </div>
    </div>
  );

  // Results Screen
  const ResultsScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/40 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full text-center border border-slate-700/50">
        <div className="flex justify-center mb-4">
          <img
            src={
              foxVariant === 'feedback-ok'
                ? LogoVolpinaOcchiAperti
                : foxVariant === 'feedback-wrong'
                ? LogoVolpinaTestaAlzata
                : foxVariant === 'happy'
                ? LogoVolpinaOcchiAperti
                : foxVariant === 'alt'
                ? LogoVolpinaTestaAlzata
                : LogoVolpinaChiusi
            }
            alt="Logo volpina"
            className="h-[84px] w-auto drop-shadow-xl transition-transform"
          />
        </div>
        
        <h2 className="text-3xl font-bold text-slate-100 mb-6">Partita finita!</h2>
        
        <div className="grid grid-cols-2 gap-4 my-4">
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <p className="text-3xl font-bold text-cyan-400">{gameStats.correct}</p>
            <p className="text-slate-400 text-sm">Corrette</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <p className="text-3xl font-bold text-orange-300">{gameStats.total}</p>
            <p className="text-slate-400 text-sm">Totale</p>
          </div>
        </div>

        {gameStats.total > 0 && (
          <div className="mb-6">
            <div className="h-3 bg-slate-700/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                style={{ width: `${(gameStats.correct / gameStats.total) * 100}%` }}
              />
            </div>
            <p className="text-slate-400 text-sm mt-2">
              {Math.round((gameStats.correct / gameStats.total) * 100)}% di precisione
            </p>
          </div>
        )}

        {wordsToReview.length > 0 && (
          <button
            onClick={() => {
              setGameMode(null);
              setMenuTab('results');
              setResultsView('menu');
            }}
            className="w-full mb-4 bg-sky-950/30 hover:bg-sky-950/50 border border-sky-900/50 text-sky-400 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Vedi {wordsToReview.length} parole da rivedere
          </button>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setGameMode(null)}
            className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-900 py-3 rounded-xl transition-colors border border-amber-200 font-semibold shadow-[0_6px_18px_-12px_rgba(251,191,36,0.45)]"
          >
            Menu
          </button>
          <button
            onClick={() => {
              const modeToReplay = lastGameMode || (gameMode === 'results' ? 'quiz' : gameMode);
              if (modeToReplay) {
                startGame(modeToReplay);
              } else {
                setGameMode(null);
              }
            }}
            className="flex-1 bg-cyan-900 hover:bg-cyan-800 text-slate-100 py-3 rounded-xl transition-colors border border-cyan-800/50"
          >
            Rigioca
          </button>
        </div>
      </div>
    </div>
  );

  // Consultation Mode
  const ConsultationMode = () => {
    let pool = activePool.length ? activePool : getFilteredWords();
    const lettersOnly = consultLetters.filter(l => l !== 'all');

    if (consultFavorites) {
      pool = pool.filter(w => favorites.has(w.term) || w.favorite);
    }
    if (lettersOnly.length > 0) {
      const setLetters = new Set(lettersOnly.map(l => l.toLowerCase()));
      pool = pool.filter(w => setLetters.has((w.term?.[0] || '').toLowerCase()));
    }
    const { sections, total } = useMemo(() => {
      const grouped = pool.reduce((acc, word) => {
        const initial = (word.term?.[0] || '#').toUpperCase();
        if (!acc[initial]) acc[initial] = [];
        acc[initial].push(word);
        return acc;
      }, {});

      const orderWords = (arr) => {
        const items = [...arr];
        if (consultOrder === 'random') {
          items.forEach(word => {
            if (consultShuffleRef.current[word.term] === undefined) {
              consultShuffleRef.current[word.term] = Math.random();
            }
          });
          return items.sort((a, b) => consultShuffleRef.current[a.term] - consultShuffleRef.current[b.term]);
        }
        return items.sort((a, b) => (a.term || '').localeCompare(b.term || '', 'it', { sensitivity: 'base' }));
      };

      const perLetter = Object.entries(grouped)
        .map(([letter, words]) => ({ letter, words: orderWords(words) }))
        .filter(section => section.words.length > 0)
        .sort((a, b) => a.letter.localeCompare(b.letter, 'it', { sensitivity: 'base' }));

      const total = perLetter.reduce((sum, s) => sum + s.words.length, 0);

      const combined = consultLetters.includes('all') && perLetter.length > 0 ? {
        letter: 'Tutte le lettere',
        words: orderWords(perLetter.flatMap(s => s.words)),
        combined: true
      } : null;

      return { sections: [combined, ...perLetter].filter(Boolean), total };
    }, [pool, consultOrder, consultLetters]);

    const filteredCount = total;

    useEffect(() => {
      if (consultOpenLetter && !sections.some(s => s.letter === consultOpenLetter)) {
        setConsultOpenLetter(null);
      }
    }, [sections, consultOpenLetter]);

    const toggleLetter = (letter) => {
      setConsultOpenLetter(prev => (prev === letter ? null : letter));
      // Initialize visible count for this section
      if (consultOpenLetter !== letter && !consultVisibleCount[letter]) {
        setConsultVisibleCount(prev => ({ ...prev, [letter]: 20 }));
      }
    };

    const loadMoreForSection = (letter) => {
      setConsultVisibleCount(prev => ({
        ...prev,
        [letter]: (prev[letter] || 20) + 20
      }));
    };

    const renderCard = (word, idx, letter) => (
      <div
        key={word.term}
        className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 hover:border-cyan-800/60 transition-colors"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="text-xl font-bold text-slate-100">{word.term}</h3>
            {word.accent && (
              <p className="text-slate-400 text-sm">Accento: {word.accent}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(word.term);
              }}
              className="text-slate-400 hover:text-amber-300 transition-colors"
              aria-label="Preferito"
            >
              <Heart className={`w-5 h-5 ${favorites.has(word.term) ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
            </button>
            {(() => {
              const inReview = wordsToReview.some(w => w.term === word.term);
              return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWordsToReview(prev => {
                            if (prev.some(w => w.term === word.term)) {
                              triggerAddedFeedback('duplicate');
                              return prev;
                            }
                            triggerAddedFeedback('added');
                            return [...prev, { ...word, errorFlag: 'SI', source: 'manual', learned: false }];
                          });
                          setConsultOpenLetter(letter);
                        }}
                        className={`text-xs px-3 py-1 rounded-full border transition-all ${inReview ? 'bg-amber-400 text-slate-900 border-amber-200 shadow-[0_6px_18px_-12px_rgba(251,191,36,0.45)]' : 'border-cyan-800/50 bg-cyan-900/40 text-cyan-200 hover:bg-cyan-900/60'}`}
                      >
                        + Ripasso
                      </button>
                    );
                  })()}
                </div>
              </div>
        <p className="text-slate-200 mb-2 leading-relaxed">{word.definition}</p>
        {(word.synonyms || word.antonyms) && (
          <div className="text-slate-300 text-sm space-y-1 mb-2">
            {word.synonyms && <p><span className="font-semibold">Sinonimi:</span> {word.synonyms}</p>}
            {word.antonyms && <p><span className="font-semibold">Contrari:</span> {word.antonyms}</p>}
          </div>
        )}
        {word.etymology && (
          <p className="text-slate-400 text-sm italic mb-2">{word.etymology}</p>
        )}
        {(word.frequencyUsage || (word.technical && word.technical.toLowerCase() !== 'comune') || (word.commonErrors && word.commonErrors.toLowerCase() !== 'nessuno')) && (
          <div className="text-slate-400 text-xs space-y-1 mb-2">
            {word.frequencyUsage && <p>Frequenza d'uso: {word.frequencyUsage}</p>}
            {word.technical && word.technical.toLowerCase() !== 'comune' && <p>Linguaggio tecnico: {word.technical}</p>}
            {word.commonErrors && word.commonErrors.toLowerCase() !== 'nessuno' && <p>Errori comuni: {word.commonErrors}</p>}
          </div>
        )}
        <ExamplesBlock word={word} />
      </div>
    );

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
          <div className="max-w-5xl mx-auto pt-6">
            <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setGameMode(null)}
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 px-3 py-2 rounded-xl font-semibold transition border border-amber-200 shadow-[0_6px_18px_-12px_rgba(251,191,36,0.45)]"
              >
                ← Menu
              </button>
            </div>
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mt-2">Consultazione</h2>
                <p className="text-slate-400 text-sm">Parole filtrate: {filteredCount}</p>
                {wordsToReview.length > 0 && (
                  <button
                    onClick={() => {
                      setGameMode(null);
                      setMenuTab('results');
                      setResultsView('menu');
                    }}
                    className="text-cyan-300 text-xs underline underline-offset-2 hover:text-cyan-200"
                  >
                    Ripasso: {wordsToReview.length}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <LetterFilterControl />
                <select
                  value={consultOrder}
                  onChange={(e) => setConsultOrder(e.target.value)}
                  className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="random">Casuale</option>
                  <option value="alpha">Alfabetico</option>
                </select>
                <button
                  onClick={resetConsultationState}
                  className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm hover:bg-slate-800"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {filteredCount === 0 ? (
            <div className="text-center text-slate-400 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
              Nessuna parola per questi filtri/ricerca.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-500 text-sm mb-2 px-1">Clicca sulla lettera per espandere</p>
              {sections.map(section => (
                <div key={section.letter} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                  <button
                  onClick={() => toggleLetter(section.letter)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left text-slate-200 font-semibold"
                  >
                    <span className="text-lg">{section.combined ? section.letter : `Lettera ${section.letter}`}</span>
                    <span className="text-sm text-slate-400">({section.words.length})</span>
                  </button>
                  {consultOpenLetter === section.letter && (
                    <>
                      <div className="grid gap-4 md:grid-cols-2 px-4 pb-4">
                        {section.words
                          .slice(0, consultVisibleCount[section.letter] || 20)
                          .map((word, idx) => renderCard(word, idx, section.letter))}
                      </div>
                      {section.words.length > (consultVisibleCount[section.letter] || 20) && (
                        <div className="px-4 pb-4 text-center">
                          <button
                            onClick={() => loadMoreForSection(section.letter)}
                            className="bg-slate-700/50 hover:bg-slate-700 text-slate-200 px-6 py-2 rounded-xl text-sm transition-colors border border-slate-600/50"
                          >
                            Mostra altro ({section.words.length - (consultVisibleCount[section.letter] || 20)} rimanenti)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-6">
            <FoxInline />
          </div>
        </div>
        <ScrollToTopButton />
      </div>
    );
  };

  const PersonalSentencesMode = () => {
    // State locale per l'input - evita re-render del componente principale
    const [localSentenceInput, setLocalSentenceInput] = useState('');
    // State locale per mostrare/nascondere definizione
    const [localShowDetails, setLocalShowDetails] = useState(false);

    // Usa sempre filteredPool per rispettare i filtri lettere/preferiti in tempo reale
    const orderedPool = useMemo(
      () => [...filteredPool].sort((a, b) => (a.term || '').localeCompare(b.term || '', 'it', { sensitivity: 'base' })),
      [filteredPool]
    );

    useEffect(() => {
      if (!orderedPool.length) return;
      setPersonalSentenceSelected(prev => {
        if (prev && orderedPool.some(w => w.term === prev)) return prev;
        return orderedPool[0]?.term || prev || null;
      });
    }, [orderedPool]);

    const selectedWord =
      orderedPool.find(w => w.term === personalSentenceSelected) ||
      words.find(w => w.term === personalSentenceSelected);

    const sentences = selectedWord?.personalSentences || [];
    const totalSaved = useMemo(
      () => words.reduce((sum, w) => sum + (Array.isArray(w.personalSentences) ? w.personalSentences.length : 0), 0),
      [words]
    );

    const handleSaveSentence = () => {
      if (!selectedWord) return;
      const text = localSentenceInput.trim();
      if (!text) return;
      const mapper = (w) => {
        const current = Array.isArray(w.personalSentences)
          ? w.personalSentences
          : (w.personalSentences ? `${w.personalSentences}`.split(';').map(s => s.trim()).filter(Boolean) : []);
        const next = Array.from(new Set([...current, text]));
        return { ...w, personalSentences: next };
      };
      updateWordByTerm(selectedWord.term, mapper);
      setLocalSentenceInput('');
      triggerAddedFeedback('added');
    };

    const handleDeleteSentence = (sentence) => {
      if (!selectedWord) return;
      updateWordByTerm(selectedWord.term, (w) => ({
        ...w,
        personalSentences: (w.personalSentences || []).filter(s => s !== sentence)
      }));
    };

    const inReview = selectedWord ? wordsToReview.some(w => w.term === selectedWord.term) : false;
    const isFav = selectedWord ? (favorites.has(selectedWord.term) || selectedWord.favorite) : false;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
        <div className="max-w-5xl mx-auto pt-6 space-y-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setGameMode(null);
                setShowPersonalDetails(false);
              }}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 px-3 py-2 rounded-xl font-semibold transition border border-amber-200 shadow-[0_10px_30px_-12px_rgba(251,191,36,0.7)]"
            >
              ← Menu
            </button>
            <div className="text-right text-xs text-slate-400">
              <p>Parole filtrate: {orderedPool.length}</p>
              <p>Frasi salvate: {totalSaved}</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-slate-100">Frasi personali</h2>
            <p className="text-slate-400 text-sm">
              Usa le parole del vocabolario per scrivere le tue frasi.
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Le frasi vengono salvate e incluse quando esporti in CSV o TXT.
            </p>
          </div>

          {orderedPool.length === 0 ? (
            <div className="text-center text-slate-400 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
              Nessuna parola per questi filtri/ricerca.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 shadow-lg">
                <div className="flex flex-wrap gap-2 mb-4">
                  <LetterFilterControl />
                  <select
                    value={consultOrder}
                    onChange={(e) => setConsultOrder(e.target.value)}
                    className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="random">Casuale</option>
                    <option value="alpha">Alfabetico</option>
                  </select>
                  <button
                    onClick={() => setConsultFavorites(prev => !prev)}
                    className={`px-3 py-2 rounded-xl text-sm border transition flex items-center gap-2 ${consultFavorites ? 'bg-amber-400 text-slate-900 border-amber-200 font-semibold' : 'bg-slate-900/70 text-slate-200 border-slate-700 hover:bg-slate-800'}`}
                    aria-label={`Filtra preferiti (${favorites.size})`}
                  >
                    <Heart className={`w-4 h-4 ${consultFavorites ? 'fill-slate-900' : ''}`} />
                    Preferiti ({favorites.size})
                  </button>
                  <button
                    onClick={() => setOnlyWrongSubset(prev => !prev)}
                    className={`px-3 py-2 rounded-xl text-sm border transition ${onlyWrongSubset ? 'bg-cyan-500 text-slate-900 border-cyan-400 font-semibold' : 'bg-slate-900/70 text-slate-200 border-slate-700 hover:bg-slate-800'}`}
                    aria-label={`Filtra ripasso (${wordsToReview.length})`}
                  >
                    Ripasso ({wordsToReview.length})
                  </button>
                  <button
                    onClick={resetConsultationState}
                    className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm hover:bg-slate-800"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <label className="text-xs text-slate-400">Parola</label>
                    <select
                      value={personalSentenceSelected || ''}
                      onChange={(e) => setPersonalSentenceSelected(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      className="w-full bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                    >
                      {orderedPool.map((w) => (
                        <option key={w.term} value={w.term}>{w.term}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectedWord && toggleFavorite(selectedWord.term)}
                      className={`px-3 py-2 rounded-xl text-sm border transition ${isFav ? 'bg-amber-400 text-slate-900 border-amber-200' : 'bg-slate-900/70 text-slate-200 border-slate-700 hover:bg-slate-800'}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-slate-900 text-slate-900' : ''}`} />
                        Preferito
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        if (!selectedWord) return;
                        setWordsToReview(prev => {
                          if (prev.some(w => w.term === selectedWord.term)) {
                            triggerAddedFeedback('duplicate');
                            return prev;
                          }
                          triggerAddedFeedback('added');
                          return [...prev, { ...selectedWord, errorFlag: 'SI', source: 'manual', learned: false }];
                        });
                      }}
                      className={`px-3 py-2 rounded-xl text-sm border transition ${inReview ? 'bg-amber-400 text-slate-900 border-amber-200' : 'bg-cyan-900/40 text-cyan-200 border-cyan-800/60 hover:bg-cyan-900/60'}`}
                    >
                      + Ripasso
                    </button>
                  </div>
                </div>

                {selectedWord && (
                  <div className="mt-3">
                    <button
                      onClick={() => setLocalShowDetails(prev => !prev)}
                      className="text-sm text-cyan-300 underline underline-offset-4 hover:text-cyan-200"
                    >
                      {localShowDetails ? 'Nascondi definizione' : 'Mostra definizione'}
                    </button>
                    {localShowDetails && (
                      <div className="mt-3 bg-slate-900/60 border border-slate-700 rounded-2xl p-4 space-y-2 shadow-inner">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-bold text-slate-100">{selectedWord.term}</h3>
                            {selectedWord.accent && (
                              <p className="text-slate-400 text-sm">Accento: {selectedWord.accent}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
                            {inReview && (
                              <span className="text-xs text-amber-200 bg-amber-500/20 border border-amber-300/50 px-2 py-0.5 rounded-full">Ripasso</span>
                            )}
                          </div>
                        </div>
                        {selectedWord.definition && (
                          <p className="text-slate-200 leading-relaxed">{selectedWord.definition}</p>
                        )}
                        {(() => {
                          const syn = cleanOptionalField(selectedWord.synonyms);
                          const ant = cleanOptionalField(selectedWord.antonyms);
                          if (!syn && !ant) return null;
                          return (
                            <div className="text-slate-300 text-sm space-y-1">
                              {syn && <p><span className="font-semibold">Sinonimi:</span> {syn}</p>}
                              {ant && <p><span className="font-semibold">Contrari:</span> {ant}</p>}
                            </div>
                          );
                        })()}
                        {selectedWord.etymology && (
                          <p className="text-slate-400 text-sm italic">{selectedWord.etymology}</p>
                        )}
                        {(() => {
                          const freq = cleanOptionalField(selectedWord.frequencyUsage);
                          const tech = cleanOptionalField(selectedWord.technical);
                          if (!freq && !tech) return null;
                          return (
                            <div className="text-slate-400 text-xs space-y-1">
                              {freq && <p>Frequenza d'uso: {freq}</p>}
                              {tech && <p>Linguaggio tecnico: {tech}</p>}
                            </div>
                          );
                        })()}
                        {(() => {
                          const examples = getExamples(selectedWord);
                          if (!examples.length) return null;
                          return <ExamplesBlock word={selectedWord} />;
                        })()}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <label className="text-xs text-slate-400">Scrivi la tua frase</label>
                  <textarea
                    value={localSentenceInput}
                    onChange={(e) => setLocalSentenceInput(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-700/60"
                    placeholder="Usa la parola in una frase completa. Premi Salva per aggiungerla."
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleSaveSentence}
                      className="bg-cyan-800 text-slate-50 px-4 py-2 rounded-xl text-sm font-semibold border border-cyan-700 hover:bg-cyan-700 transition"
                    >
                      Salva frase
                    </button>
                    <button
                      onClick={() => setLocalSentenceInput('')}
                      className="bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm border border-slate-700 hover:bg-slate-700 transition"
                    >
                      Pulisci campo
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-100">
                    Frasi salvate per <span className="text-cyan-300">{selectedWord?.term || '—'}</span>
                  </h3>
                  <span className="text-slate-400 text-sm">({sentences.length})</span>
                </div>
                {sentences.length === 0 ? (
                  <p className="text-slate-400 text-sm">Nessuna frase salvata per questa parola.</p>
                ) : (
                  <div className="space-y-2">
                    {sentences.map((sentence, idx) => (
                      <div
                        key={`${sentence}-${idx}`}
                        className="flex items-start justify-between gap-3 bg-slate-900/50 border border-slate-700/60 rounded-xl px-3 py-2"
                      >
                        <p className="text-slate-100 text-sm leading-relaxed">{sentence}</p>
                        <button
                          onClick={() => handleDeleteSentence(sentence)}
                          className="text-slate-400 hover:text-red-400 text-xs"
                          aria-label="Elimina frase"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-slate-500 text-xs">
                  💡 Le frasi restano salvate finché non ricarichi la pagina. Esporta in CSV o TXT per conservarle permanentemente.
                </p>
              </div>
            </div>
          )}
          <FoxInline />
        </div>
      </div>
    );
  };

  // Consultation Flashcard Mode
  const ConsultationFlashcardMode = ({ showDefinitionFirst = false }) => {
    let pool = activePool.length ? activePool : getFilteredWords();
    const lettersOnly = consultLetters.filter(l => l !== 'all');
    if (consultFavorites) {
      pool = pool.filter(w => favorites.has(w.term) || w.favorite);
    }
    if (lettersOnly.length > 0) {
      const setLetters = new Set(lettersOnly.map(l => l.toLowerCase()));
      pool = pool.filter(w => setLetters.has((w.term?.[0] || '').toLowerCase()));
    }

    const { sections, total } = useMemo(() => {
      const grouped = pool.reduce((acc, word) => {
        const initial = (word.term?.[0] || '#').toUpperCase();
        if (!acc[initial]) acc[initial] = [];
        acc[initial].push(word);
        return acc;
      }, {});

      const orderWords = (arr) => {
        const items = [...arr];
        if (consultOrder === 'random') {
          items.forEach(word => {
            if (consultShuffleRef.current[word.term] === undefined) {
              consultShuffleRef.current[word.term] = Math.random();
            }
          });
          return items.sort((a, b) => consultShuffleRef.current[a.term] - consultShuffleRef.current[b.term]);
        }
        return items.sort((a, b) => (a.term || '').localeCompare(b.term || '', 'it', { sensitivity: 'base' }));
      };

      const perLetter = Object.entries(grouped)
        .map(([letter, words]) => ({ letter, words: orderWords(words) }))
        .filter(section => section.words.length > 0)
        .sort((a, b) => a.letter.localeCompare(b.letter, 'it', { sensitivity: 'base' }));

      const total = perLetter.reduce((sum, s) => sum + s.words.length, 0);

      const combined = consultLetters.includes('all') && perLetter.length > 0 ? {
        letter: 'Tutte le lettere',
        words: orderWords(perLetter.flatMap(s => s.words)),
        combined: true
      } : null;

      return { sections: [combined, ...perLetter].filter(Boolean), total };
    }, [pool, consultOrder, consultLetters]);

    const filteredCount = total;

    useEffect(() => {
      if (consultFlashOpenLetter && !sections.some(s => s.letter === consultFlashOpenLetter)) {
        setConsultFlashOpenLetter(null);
      }
    }, [sections, consultFlashOpenLetter]);

    const toggleFlip = (term) => {
      setConsultFlipped(prev => ({ ...prev, [term]: !prev[term] }));
      showFoxOpenEyes();
    };
    useEffect(() => {
      if (!showDefinitionFirst || !pool.length) return;
      setConsultFlipped((prev) => {
        // Se già inizializzato, non resettare per permettere il flip
        if (Object.keys(prev).length > 0) return prev;
        const next = {};
        pool.forEach((w) => { next[w.term] = false; });
        return next;
      });
    }, [showDefinitionFirst, pool]);

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
          <div className="max-w-5xl mx-auto pt-6">
            <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setGameMode(null)}
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 px-3 py-2 rounded-xl font-semibold transition border border-amber-200 shadow-[0_10px_30px_-12px_rgba(251,191,36,0.7)]"
              >
                ← Menu
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-3xl font-bold text-slate-100">
                  {showDefinitionFirst ? 'Flashcard definizione' : 'Flashcard termine'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {showDefinitionFirst ? 'Vedi la definizione, clicca per scoprire il lemma.' : 'Vedi il lemma, clicca per definizione e dettagli.'}
                </p>
                <p className="text-slate-500 text-xs mt-1">Parole filtrate: {filteredCount}</p>
                {wordsToReview.length > 0 && (
                  <button
                    onClick={() => {
                      setGameMode(null);
                      setMenuTab('results');
                      setResultsView('menu');
                    }}
                    className="text-cyan-300 text-xs underline underline-offset-2 hover:text-cyan-200"
                  >
                    Ripasso: {wordsToReview.length}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <LetterFilterControl />
                <select
                  value={consultOrder}
                  onChange={(e) => setConsultOrder(e.target.value)}
                  className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="random">Casuale</option>
                  <option value="alpha">Alfabetico</option>
                </select>
                <button
                  onClick={resetConsultationState}
                  className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm hover:bg-slate-800"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {filteredCount === 0 ? (
            <div className="text-center text-slate-400 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
              Nessuna parola per questi filtri/ricerca.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {sections.flatMap(section => section.words).slice(0, consultFlashVisible).map((word) => {
                const isFlipped = consultFlipped[word.term];
                const hasExamples = getExamples(word).length > 0;
                return (
                  <div
                    key={word.term}
                    className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 hover:border-cyan-800/60 transition-colors cursor-pointer"
                    onClick={() => toggleFlip(word.term)}
                  >
                    {!isFlipped ? (
                      showDefinitionFirst ? (
                        <div className="min-h-[140px] flex items-center justify-center text-center px-2">
                          <p className="text-lg text-slate-100">{word.definition || '—'}</p>
                        </div>
                      ) : (
                        <div className="min-h-[120px] flex items-center justify-center">
                          <h3 className="text-2xl font-bold text-slate-100">{word.term}</h3>
                        </div>
                      )
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-bold text-slate-100">{word.term}</h3>
                            {word.accent && (
                              <p className="text-slate-400 text-sm">Accento: {word.accent}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(word.term);
                              }}
                              className="text-slate-400 hover:text-amber-300 transition-colors"
                              aria-label="Preferito"
                            >
                              <Heart className={`w-5 h-5 ${favorites.has(word.term) || word.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                            </button>
                            {(() => {
                              const inReview = wordsToReview.some(w => w.term === word.term);
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setWordsToReview(prev => {
                                      if (prev.some(w => w.term === word.term)) {
                                        triggerAddedFeedback('duplicate');
                                        return prev;
                                      }
                                      triggerAddedFeedback('added');
                                      return [...prev, { ...word, errorFlag: 'SI', source: 'manual', learned: false }];
                                    });
                                  }}
                                  className={`text-xs px-3 py-1 rounded-full border transition-all ${inReview ? 'bg-amber-400 text-slate-900 border-amber-200 shadow-[0_6px_18px_-12px_rgba(251,191,36,0.45)]' : 'bg-cyan-900/40 text-cyan-200 border-cyan-800/50 hover:bg-cyan-900/60'}`}
                                >
                                  + Ripasso
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                        {showDefinitionFirst && hasExamples && <ExamplesBlock word={word} className="mt-2" />}
                        <p className="text-slate-200 leading-relaxed">{word.definition}</p>
                        {(word.synonyms || word.antonyms) && (
                          <div className="text-slate-300 text-sm space-y-1">
                            {(() => {
                              const cleanField = (val) => {
                                const trimmed = `${val || ''}`.trim();
                                if (!trimmed) return '';
                                const lowered = trimmed.toLowerCase();
                                if (['no', '-', '--', '/', 'non applicabile', 'n/a'].includes(lowered)) return '';
                                return trimmed;
                              };
                              const syn = cleanField(word.synonyms);
                              const ant = cleanField(word.antonyms);
                              return (
                                <>
                                  {syn && <p><span className="font-semibold">Sinonimi:</span> {syn}</p>}
                                  {ant && <p><span className="font-semibold">Contrari:</span> {ant}</p>}
                                </>
                              );
                            })()}
                          </div>
                        )}
                        {word.etymology && (
                          <p className="text-slate-400 text-sm italic">{word.etymology}</p>
                        )}
                        {(word.frequencyUsage || (word.technical && word.technical.toLowerCase() !== 'comune') || (word.commonErrors && word.commonErrors.toLowerCase() !== 'nessuno')) && (
                          <div className="text-slate-400 text-xs space-y-1 mt-2">
                            {word.frequencyUsage && <p>Frequenza d'uso: {word.frequencyUsage}</p>}
                            {word.technical && word.technical.toLowerCase() !== 'comune' && <p>Linguaggio tecnico: {word.technical}</p>}
                            {word.commonErrors && word.commonErrors.toLowerCase() !== 'nessuno' && <p>Errori comuni: {word.commonErrors}</p>}
                          </div>
                        )}
                        {!showDefinitionFirst && hasExamples && <ExamplesBlock word={word} className="mt-2" />}
                        <p className="text-slate-500 text-xs">Clicca per richiudere</p>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
              {total > consultFlashVisible && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setConsultFlashVisible(prev => prev + 20)}
                    className="bg-slate-700/50 hover:bg-slate-700 text-slate-200 px-6 py-2 rounded-xl text-sm transition-colors border border-slate-600/50"
                  >
                    Mostra altro ({total - consultFlashVisible} rimanenti)
                  </button>
                </div>
              )}
            </>
          )}
          <FoxInline />
        </div>
        <ScrollToTopButton />
      </div>
    );
  };

  // Render principale
  return (
    <>
      {showUploadInfo && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowUploadInfo(false)}
        >
          <div
            className="bg-slate-900 rounded-3xl border border-slate-700 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold">Come preparare il CSV</h2>
              <button
                onClick={() => setShowUploadInfo(false)}
                className="text-slate-400 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-slate-200">
              <div>
                <p className="font-semibold mb-2">📥 Come iniziare</p>
                <p className="text-slate-300">Scarica il modello CSV cliccando "Scarica il modello" nella schermata principale. È già pronto con tutte le intestazioni e una riga di esempio.</p>
              </div>

              <div className="border-t border-slate-700 pt-3">
                <p className="font-semibold mb-2">📋 Struttura del CSV (16 colonne)</p>
                <div className="bg-slate-800 p-3 rounded-lg text-xs font-mono text-slate-400">
                  <p>1. Data di inserimento</p>
                  <p>2. Termine (obbligatorio)</p>
                  <p>3. Accento</p>
                  <p>4. Definizione (obbligatorio)</p>
                  <p>5. Sinonimi</p>
                  <p>6. Contrari</p>
                  <p>7. Etimologia</p>
                  <p>8. Esempio 1</p>
                  <p>9. Esempio 2</p>
                  <p>10. Esempio 3</p>
                  <p>11. Frequenza d'uso</p>
                  <p>12. Linguaggio tecnico</p>
                  <p>13. Errori</p>
                  <p>14. APPRESO</p>
                  <p>15. Preferito</p>
                  <p>16. Frasi personali</p>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-3">
                <p className="font-semibold mb-2">✅ Regole importanti</p>
                <ul className="space-y-1 text-slate-300 text-xs">
                  <li>• Solo <strong>"Termine"</strong> e <strong>"Definizione"</strong> sono obbligatori</li>
                  <li>• Se un campo è vuoto, lascialo vuoto (non spostare i valori!)</li>
                  <li>• Mantieni sempre l'ordine delle 16 colonne</li>
                  <li>• Usa la virgola "," come separatore (no ";" o tab)</li>
                  <li>• Le intestazioni sono flessibili: "Esempio 1", "esempio1", "ESEMPIO1" funzionano tutte</li>
                  <li>• Salva come <strong>CSV UTF-8</strong></li>
                </ul>
              </div>

              <div className="border-t border-slate-700 pt-3">
                <p className="font-semibold mb-2">📝 Formati dei campi</p>
                <ul className="space-y-1 text-slate-300 text-xs">
                  <li>• <strong>Data:</strong> formato GG-MM-AA (es: 15-03-24) oppure vuoto</li>
                  <li>• <strong>APPRESO:</strong> SI, NO o RIPASSO</li>
                  <li>• <strong>Preferito:</strong> SI o NO</li>
                  <li>• <strong>Sinonimi/Contrari:</strong> separati da ";" — puoi scrivere "parola1;parola2" o "parola1; parola2"</li>
                  <li>• <strong>Errori:</strong> descrizione testuale oppure "NO"</li>
                  <li>• <strong>Frasi personali:</strong> separate da ";" — puoi scrivere "frase1;frase2" o "frase1; frase2"</li>
                </ul>
              </div>

              <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-3">
                <p className="text-cyan-200 text-xs"><strong>💡 Suggerimento:</strong> Da Google Sheets, Excel, LibreOffice o Numbers, scegli "File → Scarica/Esporta → CSV" e seleziona UTF-8. Non modificare l'intestazione!</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {showConfetti && <ConfettiOverlay />}
      {showSelectionPanel && <SelectionPanel />}
      {showInstructions && <InstructionsModal />}
      {showReviewHelp && <ReviewInfoModal />}
      {showSelectionInfo && <SelectionInfoModal />}
      {selectionWarning && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl shadow-lg border z-50 bg-red-600 text-slate-50 border-red-700 flex items-center gap-3" role="alert" aria-live="assertive">
          <span>{selectionWarning}</span>
          <button
            className="text-sm bg-red-800/70 px-2 py-1 rounded border border-red-700 hover:bg-red-700"
            onClick={() => {
              if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);
              setSelectionWarning(null);
            }}
          >
            OK
          </button>
        </div>
      )}
      <main role="main" aria-label="Contenuto principale">
        {words.length === 0 ? <UploadScreen /> :
         showModeSelection ? <QuestionLimitSelection /> :
         !gameMode ? <MainMenu /> :
         gameMode === 'results' ? <ResultsScreen /> :
         gameMode === 'consultation' ? <ConsultationMode /> :
         gameMode === 'personalSentences' ? <PersonalSentencesMode /> :
         gameMode === 'consultationFlashcard' ? <ConsultationFlashcardMode /> :
         gameMode === 'consultationFlashcardDefinition' ? <ConsultationFlashcardMode showDefinitionFirst /> :
         gameMode === 'flashcard' ? <FlashcardMode /> :
         (gameMode === 'quiz' || gameMode === 'speedQuiz') ? <QuizMode /> :
         gameMode === 'phrase' ? <PhraseMode /> :
         gameMode === 'fillBlank' ? <FillBlankMode /> :
         gameMode === 'match' ? <MatchMode /> :
         <MainMenu />}
      </main>
    </>
  );
}
