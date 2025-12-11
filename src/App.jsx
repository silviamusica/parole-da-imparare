import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Upload, Shuffle, Eye, EyeOff, ChevronLeft, ChevronRight, Check, X, Brain, Zap, RotateCcw, Trophy, Target, Clock, Flame, BookOpen, Sparkles, ArrowRight, Heart, HelpCircle } from 'lucide-react';
import LogoYP from '../Logo YP.png';
import LogoFoxHappy from '../Logo occhi aperti Yasmina.png';
import demoCSV from '../lessico completo.csv?raw';

// Parser CSV semplice - STRUTTURA: parola, accento, definizione, etimologia, esempio, data_inserimento, errori (SI/NO)
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  const words = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Parser che gestisce le virgolette
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
    
    if (parts[0] && parts[2]) {
      words.push({
        term: parts[0],
        accent: parts[1] || '',
        definition: parts[2],
        etymology: parts[3] || '',
        example: parts[4] || '',
        insertedAt: parts[5] || '',
        errorFlag: (parts[6] || '').toUpperCase() === 'SI' ? 'SI' : 'NO',
        mastery: 0,
        lastSeen: null
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
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [exportFormat, setExportFormat] = useState('text');
  const [waitingForContinue, setWaitingForContinue] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(null);
  const [flashcardChoice, setFlashcardChoice] = useState(null);
  const [subsetMode, setSubsetMode] = useState('all'); // all | chunk
  const [chunkPercent, setChunkPercent] = useState(10); // 10,20,33,50
  const [chunkIndex, setChunkIndex] = useState(0);
  const [onlyWrongSubset, setOnlyWrongSubset] = useState(false);
  const [activePool, setActivePool] = useState([]);
  const [soundOn, setSoundOn] = useState(true);
  const [onlyErrorFlag, setOnlyErrorFlag] = useState(false);
  const [menuTab, setMenuTab] = useState('consultation'); // consultation (Studio) | games
  const [consultOrder, setConsultOrder] = useState('alpha'); // random | alpha
  const [consultLetter, setConsultLetter] = useState('all');
  const [studyView, setStudyView] = useState('list'); // list | flashcard
  const [showInstructions, setShowInstructions] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(null); // null | 'added' | 'duplicate'
  const [showReviewHelp, setShowReviewHelp] = useState(false);
  const [showSelectionInfo, setShowSelectionInfo] = useState(false);
  const [consultOpenLetter, setConsultOpenLetter] = useState(null);
  const [consultFlashOpenLetter, setConsultFlashOpenLetter] = useState(null);
  const [consultFlipped, setConsultFlipped] = useState({});
  const consultShuffleRef = useRef({});
  const [foxAnim, setFoxAnim] = useState(false);
  const foxAnimTimeout = useRef(null);
  const [foxVariant, setFoxVariant] = useState('default'); // default | happy
  const audioCtxRef = useRef(null);

  const triggerAddedFeedback = (type = 'added') => {
    setAddedFeedback(type);
    setTimeout(() => setAddedFeedback(null), 900);
  };

  // Effetti sonori semplici
  const playSound = (type) => {
    if (!soundOn) return;
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = type === 'good' ? 880 : 220;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      // Ignora errori audio (es. autoplay block)
    }
  };

  // Suono tenero per la volpe
  const playCuteSound = () => {
    if (!soundOn) return;
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const now = ctx.currentTime;

      // Pop piano e morbido
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      // Ignora errori audio
    }
  };

  const handleFoxClick = () => {
    playCuteSound();
    setFoxVariant('happy');
    setFoxAnim(true);
    if (foxAnimTimeout.current) clearTimeout(foxAnimTimeout.current);
    foxAnimTimeout.current = setTimeout(() => {
      setFoxAnim(false);
      setFoxVariant('default');
    }, 800);
  };

  // Gestione upload file
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const parsed = parseCSV(event.target.result);
        setWords(parsed);
        setShuffledWords([...parsed].sort(() => Math.random() - 0.5));
      };
      reader.readAsText(file);
    }
  };

  // Demo mode: carica 20 parole dal CSV incluso (bundled)
  const loadDemoWords = () => {
    try {
      const parsed = parseCSV(demoCSV);

      const buildBalancedDemo = (list, target = 20) => {
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

      const demoSet = buildBalancedDemo(parsed, 20);
      if (!demoSet.length) {
        alert('Demo non disponibile.');
        return;
      }
      setWords(demoSet);
      setShuffledWords([...demoSet].sort(() => Math.random() - 0.5));
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

  // Genera hint tipo impiccato - PROGRESSIVO (deterministico, niente shuffle a ogni render)
  const generateHint = (word, level) => {
    const len = word.length;
    const revealed = new Set([0, len - 1]);

    if (level > 0) {
      // Ordine deterministico dal centro verso l'esterno per evitare che le lettere cambino posizione
      const middleOrder = [];
      let left = 1;
      let right = len - 2;
      while (left <= right) {
        middleOrder.push(left);
        if (left !== right) middleOrder.push(right);
        left += 1;
        right -= 1;
      }

      for (let i = 0; i < Math.min(level, middleOrder.length); i++) {
        revealed.add(middleOrder[i]);
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

  // Genera opzioni quiz con distrattori intelligenti
  const generateQuizOptions = useCallback((correctWord, allWords) => {
    const others = allWords.filter(w => w.term !== correctWord.term);
    
    const withSimilarity = others.map(word => ({
      word,
      similarity: calculateSimilarity(correctWord, word)
    }));
    
    withSimilarity.sort((a, b) => b.similarity - a.similarity);
    
    const topCandidates = withSimilarity.slice(0, Math.min(10, withSimilarity.length));
    const shuffledCandidates = shuffleArray(topCandidates);
    const wrongOptions = shuffledCandidates.slice(0, 3).map(item => item.word);
    
    while (wrongOptions.length < 3) {
      const randomWord = others[Math.floor(Math.random() * others.length)];
      if (!wrongOptions.includes(randomWord)) {
        wrongOptions.push(randomWord);
      }
    }
    
    const options = shuffleArray([correctWord, ...wrongOptions]);
    return options;
  }, []);

  // Filtra le parole in base alla selezione del menu (tutte, tranche 10%, solo sbagliate, solo errori CSV)
  const getFilteredWords = useCallback(() => {
    const reviewTerms = new Set(wordsToReview.map(w => w.term));
    let base = onlyWrongSubset ? words.filter(w => reviewTerms.has(w.term)) : words;
    if (onlyErrorFlag) {
      base = base.filter(w => (w.errorFlag || '').toUpperCase() === 'SI');
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
        const startPerc = chunkPercent * safeChunkIndex;
        const endPerc = safeChunkIndex === numChunks - 1 ? 100 : chunkPercent * (safeChunkIndex + 1);
        const start = Math.floor((startPerc / 100) * group.length);
        const end = safeChunkIndex === numChunks - 1 ? group.length : Math.floor((endPerc / 100) * group.length);
        const slice = group.slice(start, end);
        result.push(...slice);
      });

      // Se la tranche scelta è vuota (es. poche parole per lettera), fallback al set base
      return result.length ? result : base;
    }

    return base;
  }, [words, wordsToReview, subsetMode, chunkPercent, chunkIndex, onlyWrongSubset, onlyErrorFlag]);

  const getWordPool = useCallback(() => shuffleArray(getFilteredWords()), [getFilteredWords]);

  const InstructionsModal = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl border border-slate-700 max-w-xl w-full p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold">Istruzioni</h2>
          <button
            onClick={() => setShowInstructions(false)}
            className="text-slate-400 hover:text-slate-200 text-xl"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 text-sm text-slate-200 leading-relaxed">
          <p>Prima di partire scegli in alto i filtri/tranche: così studi solo il blocco che ti serve. Se lasci “tutte”, userai l’intero database.</p>
          <p><strong>Tab Studio</strong>: qui puoi studiare in modo guidato.</p>
          <div className="pl-4 space-y-2 text-slate-300">
            <p>• <strong>Vista Schede</strong>: elenco delle parole con definizione, etimologia ed esempi. Da qui puoi aggiungere parole alla sezione “Parole da rivedere”.</p>
            <p>• <strong>Vista Flashcard</strong>: vedi solo la parola; clicca per girare e leggere i dettagli, poi decidi se aggiungerla alla sezione “Parole da rivedere”.</p>
          </div>
          <p><strong>Parole da rivedere</strong>: raccoglie gli errori commessi durante il gioco o le parole selezionate durante lo studio. Puoi scaricarle (CSV/testo) per salvarle, e con il CSV completo puoi ricaricare la sessione seguente mantenendo gli errori segnati e filtrare su “Solo sbagliate”/“Solo errori CSV” per ripassare in modo mirato. Quando le impari, puoi rimuoverle dalla sezione “Parole da rivedere”.</p>
          <p><strong>Tab Giochi</strong>: Quiz, Speed, Completa, Memory usano lo stesso set filtrato: perfetti per ripassare dopo lo studio.</p>
        </div>
      </div>
    </div>
);

  // Mostra selezione numero domande
  const selectMode = (mode) => {
    if (mode === 'consultationFlashcard') {
      startConsultationFlashcard();
      return;
    }
    if (mode === 'consultation') {
      startConsultation();
      return;
    }
    if (mode === 'match') {
      startGame(mode, null);
    } else {
      setPendingMode(mode);
      setShowModeSelection(true);
    }
  };

  const startConsultation = () => {
    const pool = getFilteredWords().sort((a, b) =>
      (a.term || '').localeCompare(b.term || '', 'it', { sensitivity: 'base' })
    );
    if (!pool.length) {
      alert('Nessuna parola disponibile per questa selezione (controlla filtro/solo sbagliate).');
      return;
    }
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

  const startConsultationFlashcard = () => {
    const pool = getFilteredWords().sort((a, b) =>
      (a.term || '').localeCompare(b.term || '', 'it', { sensitivity: 'base' })
    );
    if (!pool.length) {
      alert('Nessuna parola disponibile per questa selezione (controlla filtro/solo sbagliate).');
      return;
    }
    setActivePool(pool);
    setShuffledWords(pool);
    setGameMode('consultationFlashcard');
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
    const actualLimit = limit || questionLimit;
    const minNeeded = mode === 'match' ? 6 : 1;
    let pool = getWordPool();

    if (pool.length < minNeeded) {
      alert('Nessuna parola disponibile per questa selezione (controlla filtro/solo sbagliate).');
      setShowModeSelection(false);
      setPendingMode(null);
      return;
    }

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
    setWaitingForContinue(false);
    setShowCorrectAnswer(null);
    
    setActivePool(pool);
    const limitApplied = Math.min(actualLimit || pool.length, pool.length);
    const shuffled = shuffleArray(pool).slice(0, mode === 'match' ? 6 : limitApplied || pool.length);
    setShuffledWords(shuffled);
    
    if (mode === 'quiz' || mode === 'speedQuiz') {
      setQuizOptions(generateQuizOptions(shuffled[0], pool));
      if (mode === 'speedQuiz') {
        setTimeLeft(SPEED_TIME);
        setIsTimerRunning(true);
      }
    } else if (mode === 'match') {
      initMatchGame(shuffled);
    }
  };

  // Inizializza gioco memory/match
  const initMatchGame = (pool) => {
    const source = (pool && pool.length ? pool : getWordPool());
    if (source.length < 6) {
      alert('Servono almeno 6 parole per giocare al Memory con questo filtro.');
      return;
    }
    const selected = shuffleArray(source).slice(0, 6);
    const cards = [];
    selected.forEach((word, idx) => {
      cards.push({ id: `term-${idx}`, content: word.term, type: 'term', pairId: idx });
      // Tronca in modo più intelligente: fino a 80 caratteri, alla fine di una parola
      let truncated = word.definition;
      if (truncated.length > 80) {
        truncated = truncated.substring(0, 80);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 60) {
          truncated = truncated.substring(0, lastSpace) + '...';
        } else {
          truncated = truncated + '...';
        }
      }
      cards.push({ id: `def-${idx}`, content: truncated, type: 'def', pairId: idx });
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
        setQuizOptions(generateQuizOptions(shuffledWords[newIndex], pool));
        if (gameMode === 'speedQuiz') {
          setTimeLeft(SPEED_TIME);
          setIsTimerRunning(true);
        }
      }
    } else {
      setGameMode('results');
    }
  };

  // Gestione risposta corretta
  const handleCorrectAnswer = () => {
    setIsCorrect(true);
    setStreak(streak + 1);
    setMaxStreak(Math.max(maxStreak, streak + 1));
    setGameStats(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));
    setIsTimerRunning(false);
    playSound('good');
    setFoxVariant('happy');
    setFoxAnim(true);
    if (foxAnimTimeout.current) clearTimeout(foxAnimTimeout.current);
    foxAnimTimeout.current = setTimeout(() => {
      setFoxAnim(false);
      setFoxVariant('default');
    }, 900);
    
    // Per le risposte corrette, passa subito alla prossima (veloce)
    setTimeout(nextWord, 800);
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
        return [...prev, { ...correctWord, wrongAnswer: selectedWrongWord?.term || null, errorFlag: 'SI' }];
      }
      return prev;
    });

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
    const correct = shuffledWords[currentIndex].term.toLowerCase();
    const answer = fillBlankInput.toLowerCase().trim();
    
    if (answer === correct || correct.includes(answer) && answer.length > 3) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  };

  // Formatta parole per esportazione
  const formatWordsForExport = (format) => {
    if (format === 'text') {
      return wordsToReview.map(w => 
        `${w.term}${w.accent ? ` (${w.accent})` : ''}\n${w.definition}\n${w.etymology ? `Etimologia: ${w.etymology}\n` : ''}${w.example ? `Esempio: ${w.example}\n` : ''}${w.insertedAt ? `Data inserimento: ${w.insertedAt}\n` : ''}Errori: SI`
      ).join('\n---\n\n');
    } else if (format === 'csv') {
      // CSV completo con tutte le parole e indicazione di quali sono da rivedere
      const header = 'Parola,Accento,Definizione,Etimologia,Esempio,Data_Inserimento,Errori\n';
      const reviewTerms = new Set(wordsToReview.map(w => w.term));
      const rows = words.map(w => 
        `"${w.term}","${w.accent || ''}","${w.definition}","${w.etymology || ''}","${w.example || ''}","${w.insertedAt || ''}","${reviewTerms.has(w.term) ? 'SI' : (w.errorFlag || 'NO')}"`
      ).join('\n');
      return header + rows;
    } else if (format === 'csv_empty') {
      // CSV vuoto con intestazioni
      return 'Parola,Accento,Definizione,Etimologia,Esempio,Data_Inserimento,Errori\n';
    } else if (format === 'list') {
      return wordsToReview.map(w => `• ${w.term}${w.accent ? ` (${w.accent})` : ''}: ${w.definition}`).join('\n');
    }
    return '';
  };

  // Copia negli appunti con feedback
  const copyToClipboard = async (format) => {
    try {
      const text = formatWordsForExport(format);
      await navigator.clipboard.writeText(text);
      setCopyFeedback('✓ Copiato!');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch (err) {
      setCopyFeedback('✗ Errore');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  };

  // Scarica come file
  const downloadFile = (format) => {
    const text = formatWordsForExport(format);
    const extension = format.includes('csv') ? 'csv' : 'txt';
    const filename = format === 'csv_full' ? 'lessico-completo-con-errori.csv' : 'parole-da-rivedere.' + extension;
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

  // Componente per mostrare risposta corretta e pulsante continua
  const CorrectAnswerDisplay = ({ correctWord }) => (
    <div className="mt-6 space-y-4">
      <div className="p-4 bg-cyan-950/30 border border-cyan-900/50 rounded-xl">
        <p className="text-cyan-400 font-bold text-lg mb-2">
          ✅ La risposta corretta era: {correctWord.term}
        </p>
        {correctWord.accent && (
          <p className="text-slate-400 text-sm mb-2">Accento: {correctWord.accent}</p>
        )}
        <p className="text-slate-100 mb-2">{correctWord.definition}</p>
        {correctWord.etymology && (
          <p className="text-slate-400 text-sm italic mb-2">{correctWord.etymology}</p>
        )}
        {correctWord.example && (
          <p className="text-slate-300 text-sm mt-2 p-2 bg-slate-800/30 rounded-lg">
            "{correctWord.example}"
          </p>
        )}
      </div>
      
      <button
        onClick={nextWord}
        className="w-full bg-gradient-to-r from-cyan-900 to-sky-900 hover:from-cyan-800 hover:to-sky-800 text-slate-100 font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 border border-cyan-800/50"
      >
        Continua <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );

  const InfoTooltip = ({ text }) => (
    <span className="relative group inline-flex items-center">
      <HelpCircle className="w-4 h-4 text-slate-500 group-hover:text-slate-200 transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 max-w-[200px] bg-slate-900 text-slate-100 text-[11px] px-2 py-1 rounded-lg border border-slate-700 shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition text-center z-50">
        {text}
      </span>
    </span>
  );

  const SelectionInfoModal = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl border border-slate-700 max-w-xl w-full p-6 text-slate-100 shadow-2xl">
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
          <p><strong>Tranche</strong>: scegli una fetta del database per lettera (10/20/33/50%). Es: 10% prende il primo 10% di ogni lettera; puoi selezionare 1ª, 2ª, ecc. fetta per studiare a blocchi.</p>
          <p><strong>Solo sbagliate</strong>: usa solo le parole che hai aggiunto a “Da rivedere”. Perfetto per ripassare gli errori segnalati in gioco o studio.</p>
          <p><strong>Solo errori CSV</strong>: usa solo le parole marcate “SI” nel CSV. Scarica il CSV degli errori, ricaricalo e spunta qui per ripassare solo quelle, mantenendo lo storico.</p>
          <p><strong>Combinazioni</strong>: prima si applica la tranche (blocchi per lettera), poi le spunte restringono ulteriormente il set selezionato.</p>
        </div>
      </div>
    </div>
  );

  const ReviewInfoModal = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl border border-slate-700 max-w-xl w-full p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold">Sezione “Parole da rivedere”</h2>
          <button
            onClick={() => setShowReviewHelp(false)}
            className="text-slate-400 hover:text-slate-200 text-xl"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-slate-200">
          <p>Qui finiscono le parole sbagliate in gioco o quelle che hai segnato nello studio. Usa “Svuota lista” per ripulire quando le hai imparate.</p>
          <p>Puoi scaricare due formati:</p>
          <p><strong>TXT</strong>: solo elenco delle parole da rivedere/errori.</p>
          <p><strong>CSV completo con errori/da rivedere</strong>: tutte le parole del database con la colonna “Errori” già compilata (SI per le parole da rivedere). Puoi ricaricarlo per ritrovare gli errori marcati e continuare a tracciare i progressi.</p>
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
              src={foxVariant === 'happy' ? LogoFoxHappy : LogoYP}
              alt="Logo"
              className={`h-[84px] w-auto drop-shadow-xl transition-transform ${foxAnim ? 'animate-bounce scale-120' : ''}`}
            />
          </button>
        </div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Giochi di parole</h1>
        <p className="text-slate-400 mb-8">Impara parole nuove giocando!</p>
        
        <label className="block cursor-pointer group">
          <div className="border-2 border-dashed border-slate-600 rounded-2xl p-8 transition-all group-hover:border-cyan-700 group-hover:bg-slate-700/20">
            <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4 group-hover:text-cyan-600 transition-colors" />
            <p className="text-slate-200 font-medium mb-2">Carica il tuo CSV</p>
            <p className="text-slate-500 text-sm">Formato: parola, accento, definizione, etimologia, esempio, data_inserimento, errori(SI/NO)</p>
          </div>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
        </label>

        <div className="mt-6">
          <button
            onClick={loadDemoWords}
            className="w-full bg-slate-800/60 hover:bg-slate-800 text-slate-100 px-4 py-3 rounded-xl border border-slate-700/60 transition-colors"
          >
            Prova demo (20 parole)
          </button>
          <p className="text-slate-500 text-xs mt-2">Se non hai ancora un file tuo, gioca con un set di esempio.</p>

          <button
            onClick={() => downloadFile('csv_empty')}
            className="w-full mt-3 bg-slate-800/60 hover:bg-slate-800 text-slate-100 px-4 py-3 rounded-xl border border-slate-700/60 transition-colors"
          >
            Scarica l'elenco vuoto
          </button>
          <p className="text-slate-500 text-xs mt-2">Scarica il modello vuoto e compila con le tue parole.</p>
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
              aria-label="Logo"
              className="hover:scale-105 transition-transform"
            >
              <img
                src={foxVariant === 'happy' ? LogoFoxHappy : LogoYP}
                alt="Logo"
                className={`h-[74px] w-auto drop-shadow-xl transition-transform ${foxAnim ? 'animate-bounce scale-120' : ''}`}
              />
            </button>
          </div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Giochi di parole</h1>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <p>{words.length} parole caricate</p>
            <div className="relative group">
              <button
                onClick={() => setShowInstructions(true)}
                className="w-5 h-5 rounded-full border border-slate-500 text-slate-300 text-xs leading-none flex items-center justify-center hover:text-cyan-300 hover:border-cyan-500"
                title="Istruzioni"
              >
                i
              </button>
                  <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-32 bg-slate-900 text-slate-100 text-xs rounded-xl p-2 border border-slate-700 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition text-center z-50">
                    Istruzioni
                  </div>
                </div>
              </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/60 p-6 rounded-3xl mb-6 shadow-xl">
            <div className="grid gap-5 lg:gap-6 md:grid-cols-[1.1fr_2fr] items-start">
            <div className="space-y-1">
              <p className="text-slate-200 font-bold text-lg flex items-center gap-2">
                Selezione parole
                <button
                  type="button"
                  onClick={() => setShowSelectionInfo(true)}
                  className="w-5 h-5 rounded-full border border-slate-600 text-slate-300 text-xs flex items-center justify-center hover:text-cyan-300 hover:border-cyan-500"
                  aria-label="Info selezione parole"
                >
                  i
                </button>
              </p>
              <div className="text-slate-500 text-sm leading-snug flex items-center gap-2">
                <span>Scegli la tranche</span>
              </div>
              <p className="text-slate-400 text-sm mt-2">
                Disponibili: {getFilteredWords().length || words.length}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
              <select
                value={subsetMode === 'chunk' ? `chunk-${chunkPercent}` : 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    setSubsetMode('all');
                  } else {
                    const perc = parseInt(val.split('-')[1], 10) || 10;
                    setSubsetMode('chunk');
                    setChunkPercent(perc);
                    setChunkIndex(0);
                  }
                }}
                className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-2xl px-4 py-3 text-sm md:text-base shadow-inner w-full"
              >
                <option value="all">Tutte (casuale)</option>
                <option value="chunk-10">Tranche 10%</option>
                <option value="chunk-20">Tranche 20%</option>
                <option value="chunk-33">Tranche 33%</option>
                <option value="chunk-50">Tranche 50%</option>
              </select>

              {subsetMode === 'chunk' && (
                <select
                  value={chunkIndex}
                  onChange={(e) => setChunkIndex(parseInt(e.target.value, 10))}
                  className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-2xl px-4 py-3 text-sm md:text-base shadow-inner w-full"
                >
                  {Array.from({ length: Math.max(1, Math.floor(100 / chunkPercent)) }).map((_, idx) => (
                    <option key={idx} value={idx}>
                      {idx + 1}° tranche ({idx === Math.floor(100 / chunkPercent) - 1 && chunkPercent === 33 ? 34 : chunkPercent}%)
                    </option>
                  ))}
                </select>
              )}

              <label className="flex items-center justify-between gap-3 text-slate-200 bg-slate-900/70 border border-slate-700 rounded-2xl px-4 py-3 shadow-inner w-full">
                <div className="flex items-center gap-2 text-sm leading-tight">
                  <span>Solo sbagliate</span>
                  <span className="text-xs text-slate-400 ml-1">({wordsToReview.length})</span>
                </div>
                <input
                  type="checkbox"
                  checked={onlyWrongSubset}
                  onChange={(e) => setOnlyWrongSubset(e.target.checked)}
                  className="accent-cyan-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-slate-200 bg-slate-900/70 border border-slate-700 rounded-2xl px-4 py-3 shadow-inner w-full">
                <div className="flex items-center gap-2 text-sm leading-tight">
                  <span>Solo errori CSV</span>
                </div>
                <input
                  type="checkbox"
                  checked={onlyErrorFlag}
                  onChange={(e) => setOnlyErrorFlag(e.target.checked)}
                  className="accent-cyan-500 h-4 w-4"
                />
              </label>

            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-4 mb-6">
          <div className="flex gap-2 p-1 bg-slate-900/60 rounded-2xl border border-slate-700/50">
              <button
                onClick={() => setMenuTab('consultation')}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${menuTab === 'consultation' ? 'bg-orange-300 text-slate-900 shadow-lg scale-[1.02]' : 'text-slate-300 hover:text-orange-200 border border-transparent hover:border-orange-300'}`}
            >
              Studio
            </button>
            <button
              onClick={() => setMenuTab('games')}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${menuTab === 'games' ? 'bg-orange-300 text-slate-900 shadow-lg scale-[1.02]' : 'text-slate-300 hover:text-orange-200 border border-transparent hover:border-orange-300'}`}
            >
              Giochi
            </button>
          </div>
        </div>

        {menuTab === 'consultation' ? (
          <div className="grid gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl flex flex-col gap-3">
          <p className="text-slate-400 text-sm">
            Per studiare una tranche specifica, seleziona i filtri/percentuali in alto; se lasci "tutte", userai l'intero database.
          </p>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-cyan-500" />
              <div>
                <p className="text-slate-200 font-bold text-lg">Studio</p>
                    <p className="text-slate-400 text-sm">Visualizza le parole filtrate</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <select
                    value={studyView}
                    onChange={(e) => setStudyView(e.target.value)}
                    className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="list">Schede (elenco)</option>
                    <option value="flashcard">Flashcard</option>
                  </select>
                  <button
                    onClick={() => studyView === 'flashcard' ? selectMode('consultationFlashcard') : selectMode('consultation')}
                    className="bg-cyan-900 text-slate-100 px-4 py-2 rounded-xl border border-cyan-800/60 hover:bg-cyan-800 text-sm"
                  >
                    Apri
                  </button>
                </div>
              </div>
            </div>
            {wordsToReview.length > 0 && (
              <button
                onClick={() => setShowReviewPanel(true)}
                className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between hover:bg-slate-700/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-900/40 p-2 rounded-xl">
                    <BookOpen className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-slate-200 font-bold">Parole da rivedere</p>
                    <p className="text-slate-500 text-sm">{wordsToReview.length} parole salvate</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <GameModeCard
              icon={<Brain className="w-8 h-8" />}
              title="Flashcard"
              description="Studia le parole una alla volta"
              color="from-slate-600 to-slate-800"
              onClick={() => selectMode('flashcard')}
            />
            <GameModeCard
              icon={<Target className="w-8 h-8" />}
              title="Quiz"
              description="Scegli la definizione corretta"
              color="from-cyan-900 to-cyan-950"
              onClick={() => selectMode('quiz')}
            />
            <GameModeCard
              icon={<Zap className="w-8 h-8" />}
              title="Speed Quiz"
              description="Rispondi prima che scada il tempo!"
              color="from-sky-900 to-slate-900"
              onClick={() => selectMode('speedQuiz')}
            />
            <GameModeCard
              icon={<Sparkles className="w-8 h-8" />}
              title="Completa"
              description="Scrivi la parola dalla definizione"
              color="from-blue-950 to-slate-950"
              onClick={() => selectMode('fillBlank')}
            />
            <GameModeCard
              icon={<Shuffle className="w-8 h-8" />}
              title="Memory Match"
              description="Abbina parole e definizioni"
              color="from-slate-950 to-black"
              onClick={() => selectMode('match')}
            />
            {wordsToReview.length > 0 && (
              <button
                onClick={() => setShowReviewPanel(true)}
                className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between hover:bg-slate-700/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-900/40 p-2 rounded-xl">
                    <BookOpen className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-slate-200 font-bold">Parole da rivedere</p>
                    <p className="text-slate-500 text-sm">{wordsToReview.length} parole salvate</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500" />
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setWords([])}
          className="mt-8 mx-auto block hover:scale-105 transition-transform"
        aria-label="Carica un altro file"
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClickCapture={handleFoxClick}
      >
        <img
          src={foxVariant === 'happy' ? LogoFoxHappy : LogoYP}
          alt="Logo"
          className={`h-[84px] w-auto drop-shadow-lg transition-transform ${foxAnim ? 'animate-bounce scale-120' : ''}`}
        />
      </button>
      </div>
    </div>
  );

  // Card modalità gioco
  const GameModeCard = ({ icon, title, description, color, onClick }) => (
    <button
      onClick={onClick}
      className={`bg-gradient-to-r ${color} p-6 rounded-2xl text-left flex items-center gap-4 transform transition-all hover:scale-105 hover:shadow-lg border border-slate-700/50 active:scale-95 w-full`}
    >
      <div className="bg-slate-200/10 p-3 rounded-xl">{icon}</div>
      <div className="flex-1">
        <h3 className="text-xl font-bold text-slate-100">{title}</h3>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>
      <ArrowRight className="w-6 h-6 text-slate-500" />
    </button>
  );

  // Schermata selezione numero domande
  const QuestionLimitSelection = () => {
    const limits = [5, 10, 20, 50];
    const modeNames = {
      flashcard: 'Flashcard',
      quiz: 'Quiz',
      speedQuiz: 'Speed Quiz',
      fillBlank: 'Completa'
    };
    const totalAvailable = getFilteredWords().length || words.length;
    const noWords = totalAvailable === 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/40 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full text-center border border-slate-700/50">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            {modeNames[pendingMode]}
          </h2>
          <p className="text-slate-400 mb-8">Quante domande vuoi?</p>
          
          {noWords ? (
            <div className="bg-red-900/30 border border-red-800/50 text-red-200 p-4 rounded-xl">
              Nessuna parola disponibile con questo filtro. Torna indietro e verifica “Solo sbagliate”/tranche.
            </div>
          ) : (
            <div className="grid gap-4">
              {limits.map(limit => (
                <button
                  key={limit}
                  onClick={() => startGame(pendingMode, limit)}
                  className="bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/50 p-4 rounded-xl transition-all flex items-center justify-center gap-3"
                  disabled={limit === 0}
                >
                  <span className="text-3xl font-bold text-slate-200">{limit}</span>
                  <span className="text-slate-400">domande</span>
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

  // Pannello parole da rivedere
  const ReviewPanel = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 py-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl max-w-2xl w-full border border-slate-700/50 flex flex-col max-h-[92vh]">
          <div className="p-5 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0 gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-100">📚 Parole da rivedere</h2>
              <button
                type="button"
                onClick={() => setShowReviewHelp(true)}
                className="w-5 h-5 rounded-full border border-slate-600 text-slate-300 text-xs flex items-center justify-center hover:text-cyan-300 hover:border-cyan-500"
                aria-label="Info Parole da rivedere"
              >
                i
              </button>
            </div>
            <p className="text-slate-400 text-sm">{wordsToReview.length} parole</p>
            <button
              onClick={() => setShowReviewPanel(false)}
              className="text-slate-500 hover:text-slate-300 text-2xl"
            >
              ✕
            </button>
          </div>
          
          {wordsToReview.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nessuna parola da rivedere ancora.
            </div>
          ) : (
            <>
              <div className="p-4 overflow-y-auto flex-1 min-h-0">
                {wordsToReview.map((word, idx) => (
                  <div key={idx} className="bg-slate-800/30 rounded-xl p-4 mb-3 border border-slate-700/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-100">{word.term}</h3>
                        {word.accent && (
                          <p className="text-slate-400 text-sm">Accento: {word.accent}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setWordsToReview(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300 text-sm flex-shrink-0"
                      >
                        Rimuovi
                      </button>
                    </div>
                    <p className="text-slate-300 mt-1">{word.definition}</p>
                    {word.etymology && (
                      <p className="text-slate-400 text-sm italic mt-2">{word.etymology}</p>
                    )}
                    {word.example && (
                      <p className="text-slate-300 text-sm mt-2 p-2 bg-slate-800/50 rounded">"{word.example}"</p>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-slate-700/50 space-y-3 flex-shrink-0 bg-slate-900/50">
                {copyFeedback && (
                  <div className="text-center text-cyan-400 font-medium mb-2">
                    {copyFeedback}
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-slate-400 text-sm flex-shrink-0">Scarica:</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="bg-slate-800/70 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm flex-1"
                  >
                    <option value="text">TXT (parole da rivedere/errori)</option>
                    <option value="csv">CSV completo con errori/da rivedere</option>
                  </select>
                  <button
                    onClick={() => downloadFile(exportFormat)}
                    className="bg-cyan-900 hover:bg-cyan-800 text-slate-50 px-4 py-2 rounded-lg border border-cyan-800/60 text-sm"
                  >
                    Scarica
                  </button>
                </div>
                
                <button
                  onClick={() => setWordsToReview([])}
                  className="w-full bg-red-950/30 hover:bg-red-950/50 text-red-400 py-3 rounded-xl transition-colors border border-red-900/50 text-sm"
                >
                  🗑️ Svuota lista
                </button>

                <FoxInline />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Header del gioco
  const GameHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={() => setGameMode(null)}
        className="text-slate-500 hover:text-slate-300 transition-colors"
      >
        ← Menu
      </button>
      <div className="flex items-center gap-4">
        {wordsToReview.length > 0 && (
          <button
            onClick={() => setShowReviewPanel(true)}
            className="bg-cyan-900/30 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-cyan-900/50 transition-colors border border-cyan-800/50"
          >
            <BookOpen className="w-4 h-4 text-cyan-500" />
            <span className="text-cyan-400 font-bold">{wordsToReview.length}</span>
          </button>
        )}
        {gameMode !== 'match' && gameMode !== 'flashcard' && streak > 1 && (
          <div className="bg-sky-900/30 px-3 py-1 rounded-full flex items-center gap-1 animate-pulse border border-sky-800/50">
            <Flame className="w-4 h-4 text-sky-500" />
            <span className="text-sky-400 font-bold">{streak}</span>
          </div>
        )}
        <button
          onClick={() => setSoundOn(!soundOn)}
          className="bg-slate-800/40 px-3 py-1 rounded-full border border-slate-700/60 text-slate-200 hover:text-cyan-300 transition-colors"
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </div>
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
          src={foxVariant === 'happy' ? LogoFoxHappy : LogoYP}
          alt="Logo"
          className={`h-[70px] w-auto transition-transform ${foxAnim ? 'animate-bounce scale-120' : ''}`}
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
            {currentIndex + 1} / {shuffledWords.length}
          </div>

          <div 
            onClick={() => setShowAnswer(!showAnswer)}
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
                {word.etymology && (
                  <p className="text-slate-400 text-sm italic mb-2">{word.etymology}</p>
                )}
                {word.example && (
                  <p className="text-slate-300 text-sm mt-4 p-3 bg-slate-800/30 rounded-lg">
                    "{word.example}"
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={() => { setShowAnswer(false); handleWrongAnswer(null, { autoAdvance: true }); }}
              className="bg-red-950/30 hover:bg-red-950/50 text-red-400 px-8 py-3 rounded-xl flex items-center gap-2 transition-colors border border-red-900/50"
            >
              <X className="w-5 h-5" /> Da rivedere
            </button>
            <button
              onClick={() => { setShowAnswer(false); handleCorrectAnswer(); }}
              className="bg-cyan-950/30 hover:bg-cyan-950/50 text-cyan-400 px-8 py-3 rounded-xl flex items-center gap-2 transition-colors border border-cyan-900/50"
            >
              <Check className="w-5 h-5" /> La so!
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Quiz Mode
  const QuizMode = () => {
    const word = shuffledWords[currentIndex];
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
            <p className="text-slate-500 text-sm mb-2">Qual è la parola per...</p>
            <p className="text-xl text-slate-100">{word.definition}</p>
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
                  <span className="font-medium">{option.term}</span>
                </button>
              ))}
            </div>
          )}

          {isCorrect !== null && !waitingForContinue && (
            <div className={`text-center mt-6 text-2xl font-bold ${isCorrect ? 'text-cyan-400' : 'text-red-400'}`}>
              {isCorrect ? '✨ Corretto!' : `❌ Era: ${word.term}`}
            </div>
          )}
          
          {waitingForContinue && showCorrectAnswer && (
            <CorrectAnswerDisplay correctWord={showCorrectAnswer} />
          )}
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
            <p className="text-xl text-slate-100 mb-4">{word.definition}</p>
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

          {!waitingForContinue && (
            <>
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={fillBlankInput}
                  onChange={(e) => setFillBlankInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isCorrect === null) {
                      checkFillBlank();
                    }
                  }}
                  placeholder="Scrivi la parola..."
                  className="flex-1 bg-slate-700/30 border border-slate-600/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-800"
                  disabled={isCorrect !== null || (hintData && hintData.lost)}
                  autoFocus
                />
                <button
                  onClick={checkFillBlank}
                  disabled={isCorrect !== null || !fillBlankInput.trim() || (hintData && hintData.lost)}
                  className="bg-cyan-900 hover:bg-cyan-800 text-slate-100 px-6 py-3 rounded-xl transition-colors border border-cyan-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verifica
                </button>
              </div>

              <button
                onClick={handleHintClick}
                disabled={isCorrect !== null || (hintData && hintData.lost)}
                className="w-full bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 py-2 rounded-xl transition-colors border border-slate-600/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HelpCircle className="w-4 h-4" />
                {!showHint ? 'Mostra aiuto' : `Aiuto aggiuntivo (${hintLevel + 1})`}
              </button>

              {isCorrect !== null && (
                <div className={`text-center mt-6 text-2xl font-bold ${isCorrect ? 'text-cyan-400' : 'text-red-400'}`}>
                  {isCorrect ? '✨ Corretto!' : `❌ Era: ${word.term}`}
                </div>
              )}
            </>
          )}

          {waitingForContinue && showCorrectAnswer && (
            <CorrectAnswerDisplay correctWord={showCorrectAnswer} />
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
            className="text-slate-500 hover:text-slate-300 transition-colors"
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
            
            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(card)}
                disabled={isMatched}
                className={`p-4 rounded-xl min-h-[140px] max-h-[220px] overflow-hidden transition-all transform flex items-center justify-center ${
                  isMatched
                    ? 'bg-cyan-900/30 text-cyan-300 scale-95 border border-cyan-800/50'
                    : isSelected
                      ? 'bg-cyan-900 text-slate-100 scale-105 border border-cyan-800/50'
                      : 'bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 border border-slate-600/50'
                } ${card.type === 'term' ? 'font-bold text-base' : 'text-sm leading-relaxed'}`}
              >
                <span
                  className="text-center break-words"
                  style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
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
          <img src={LogoFoxHappy} alt="Logo occhi aperti" className="h-[84px] w-auto drop-shadow-xl" />
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
            onClick={() => setShowReviewPanel(true)}
            className="w-full mb-4 bg-sky-950/30 hover:bg-sky-950/50 border border-sky-900/50 text-sky-400 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Vedi {wordsToReview.length} parole da rivedere
          </button>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setGameMode(null)}
            className="flex-1 bg-slate-700/30 hover:bg-slate-700/50 text-slate-200 py-3 rounded-xl transition-colors border border-slate-600/50"
          >
            Menu
          </button>
          <button
            onClick={() => startGame(gameMode === 'results' ? 'quiz' : gameMode)}
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
    if (consultLetter !== 'all') {
      pool = pool.filter(w => (w.term?.[0] || '').toLowerCase() === consultLetter.toLowerCase());
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

        const combined = consultLetter === 'all' && perLetter.length > 0 ? {
          letter: 'Tutte le lettere',
          words: orderWords(perLetter.flatMap(s => s.words)),
          combined: true
        } : null;

      return { sections: [combined, ...perLetter].filter(Boolean), total };
    }, [pool, consultOrder, consultLetter]);

    const filteredCount = total;

    useEffect(() => {
      if (consultOpenLetter && !sections.some(s => s.letter === consultOpenLetter)) {
        setConsultOpenLetter(null);
      }
    }, [sections, consultOpenLetter]);

    const toggleLetter = (letter) => {
      setConsultOpenLetter(prev => (prev === letter ? null : letter));
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              setWordsToReview(prev => {
                if (prev.some(w => w.term === word.term)) {
                  triggerAddedFeedback('duplicate');
                  return prev;
                }
                triggerAddedFeedback('added');
                return [...prev, { ...word, errorFlag: 'SI' }];
              });
              setConsultOpenLetter(letter);
            }}
            className="text-xs px-3 py-1 rounded-full border border-cyan-800/50 bg-cyan-900/40 text-cyan-200 hover:bg-cyan-900/60 transition-all"
          >
            + Da rivedere
          </button>
        </div>
        <p className="text-slate-200 mb-2 leading-relaxed">{word.definition}</p>
        {word.etymology && (
          <p className="text-slate-400 text-sm italic mb-2">{word.etymology}</p>
        )}
        {word.example && (
          <p className="text-slate-300 text-sm mt-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            “{word.example}”
          </p>
        )}
      </div>
    );

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
          <div className="max-w-5xl mx-auto pt-6">
            <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setGameMode(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← Menu
              </button>
            </div>
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-100 mt-2">Consultazione</h2>
                <p className="text-slate-400 text-sm">Parole filtrate: {filteredCount}</p>
                {wordsToReview.length > 0 && (
                  <p className="text-cyan-300 text-xs">Da rivedere: {wordsToReview.length}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={consultLetter}
                  onChange={(e) => setConsultLetter(e.target.value)}
                  className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="all">Tutte le lettere</option>
                  {'abcdefghijklmnopqrstuvwxyz'.split('').map(l => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))}
                </select>
                <select
                  value={consultOrder}
                  onChange={(e) => setConsultOrder(e.target.value)}
                  className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="random">Casuale</option>
                  <option value="alpha">Alfabetico</option>
                </select>
                <button
                  onClick={() => { setConsultLetter('all'); setConsultOrder('random'); }}
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
                    <div className="grid gap-4 md:grid-cols-2 px-4 pb-4">
                      {section.words.map((word, idx) => renderCard(word, idx, section.letter))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Consultation Flashcard Mode
  const ConsultationFlashcardMode = () => {
    let pool = activePool.length ? activePool : getFilteredWords();
    if (consultLetter !== 'all') {
      pool = pool.filter(w => (w.term?.[0] || '').toLowerCase() === consultLetter.toLowerCase());
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

      const combined = consultLetter === 'all' && perLetter.length > 0 ? {
        letter: 'Tutte le lettere',
        words: orderWords(perLetter.flatMap(s => s.words)),
        combined: true
      } : null;

      return { sections: [combined, ...perLetter].filter(Boolean), total };
    }, [pool, consultOrder, consultLetter]);

    const filteredCount = total;

    useEffect(() => {
      if (consultFlashOpenLetter && !sections.some(s => s.letter === consultFlashOpenLetter)) {
        setConsultFlashOpenLetter(null);
      }
    }, [sections, consultFlashOpenLetter]);

    const toggleFlip = (term) => {
      setConsultFlipped(prev => ({ ...prev, [term]: !prev[term] }));
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
        <div className="max-w-5xl mx-auto pt-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setGameMode(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← Menu
              </button>
            </div>
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-100">Consultazione Flashcard</h2>
                <p className="text-slate-400 text-sm">Parole filtrate: {filteredCount}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={consultLetter}
                  onChange={(e) => setConsultLetter(e.target.value)}
                  className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="all">Tutte le lettere</option>
                  {'abcdefghijklmnopqrstuvwxyz'.split('').map(l => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))}
                </select>
                <select
                  value={consultOrder}
                  onChange={(e) => setConsultOrder(e.target.value)}
                  className="bg-slate-900/70 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="random">Casuale</option>
                  <option value="alpha">Alfabetico</option>
                </select>
                <button
                  onClick={() => { setConsultLetter('all'); setConsultOrder('random'); }}
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
              <p className="text-slate-500 text-sm mb-1 px-1">Casuale / tutte le parole — clicca sulla lettera per espandere</p>
              {sections.map(section => (
                <div key={section.letter} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl">
                  <button
                    onClick={() => setConsultFlashOpenLetter(prev => (prev === section.letter ? null : section.letter))}
                    className="w-full flex items-center justify-between px-4 py-3 text-left text-slate-200 font-semibold"
                  >
                    <span className="text-lg">{section.combined ? section.letter : `Lettera ${section.letter}`}</span>
                    <span className="text-sm text-slate-400">({section.words.length})</span>
                  </button>
                  {consultFlashOpenLetter === section.letter && (
                    <div className="grid gap-4 md:grid-cols-2 px-4 pb-4">
                      {section.words.map((word) => {
                        const isFlipped = consultFlipped[word.term];
                        return (
                          <div
                            key={word.term}
                            className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 hover:border-cyan-800/60 transition-colors cursor-pointer"
                            onClick={() => toggleFlip(word.term)}
                          >
                            {!isFlipped ? (
                              <div className="min-h-[120px] flex items-center justify-center">
                                <h3 className="text-2xl font-bold text-slate-100">{word.term}</h3>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h3 className="text-xl font-bold text-slate-100">{word.term}</h3>
                                    {word.accent && (
                                      <p className="text-slate-400 text-sm">Accento: {word.accent}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentLetter = section.letter;
                                      setWordsToReview(prev => {
                                        if (prev.some(w => w.term === word.term)) {
                                          triggerAddedFeedback('duplicate');
                                          return prev;
                                        }
                                        triggerAddedFeedback('added');
                                        return [...prev, { ...word, errorFlag: 'SI' }];
                                      });
                                      setConsultFlashOpenLetter(currentLetter);
                                    }}
                                    className="text-xs bg-cyan-900/40 text-cyan-200 px-3 py-1 rounded-full border border-cyan-800/50 hover:bg-cyan-900/60"
                                  >
                                    + Da rivedere
                                  </button>
                                </div>
                                <p className="text-slate-200 leading-relaxed">{word.definition}</p>
                                {word.etymology && (
                                  <p className="text-slate-400 text-sm italic">{word.etymology}</p>
                                )}
                                {word.example && (
                                  <p className="text-slate-300 text-sm mt-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                    “{word.example}”
                                  </p>
                                )}
                                <p className="text-slate-500 text-xs">Clicca per richiudere</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <FoxInline />
        </div>
      </div>
    );
  };

  // Render principale
  return (
    <>
      {showReviewPanel && <ReviewPanel />}
      {showInstructions && <InstructionsModal />}
      {showReviewHelp && <ReviewInfoModal />}
      {showSelectionInfo && <SelectionInfoModal />}
      {addedFeedback && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-xl shadow-lg border z-50 animate-bounce ${addedFeedback === 'duplicate' ? 'bg-amber-500 text-slate-900 border-amber-600' : 'bg-emerald-500 text-slate-900 border-emerald-600'}`}>
          {addedFeedback === 'duplicate' ? 'Già inserita' : 'Aggiunta ai da rivedere ✓'}
        </div>
      )}
      {words.length === 0 ? <UploadScreen /> :
       showModeSelection ? <QuestionLimitSelection /> :
       !gameMode ? <MainMenu /> :
       gameMode === 'results' ? <ResultsScreen /> :
      gameMode === 'consultation' ? <ConsultationMode /> :
      gameMode === 'consultationFlashcard' ? <ConsultationFlashcardMode /> :
      gameMode === 'flashcard' ? <FlashcardMode /> :
      (gameMode === 'quiz' || gameMode === 'speedQuiz') ? <QuizMode /> :
      gameMode === 'fillBlank' ? <FillBlankMode /> :
      gameMode === 'match' ? <MatchMode /> :
      <MainMenu />}
    </>
  );
}
