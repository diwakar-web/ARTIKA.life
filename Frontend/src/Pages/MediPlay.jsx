import { useEffect, useRef, useState, useCallback } from "react";
import "./MediPlay.css";
import Header from "../Components/FixedComponents/Header"
const MEDICINES = [
  { label: "💊", color: "#5DCAA5", points: 10, good: true, name: "Pill" },
  { label: "💉", color: "#85B7EB", points: 15, good: true, name: "Injection" },
  { label: "🩺", color: "#AFA9EC", points: 20, good: true, name: "Stethoscope" },
  { label: "🧪", color: "#FAC775", points: 25, good: true, name: "Vial" },
];
const BADS = [
  { label: "☠️", color: "#F09595", points: -1, good: false, name: "Skull" },
  { label: "🦠", color: "#F5C4B3", points: -1, good: false, name: "Virus" },
];
const JUNK_FOODS = [
  { label: "🍕", color: "#FF9D5C", points: 0, lives: -1, good: false, name: "Pizza" },
  { label: "🍔", color: "#E8A76B", points: 0, lives: -1, good: false, name: "Burger" },
  { label: "🍟", color: "#DAA520", points: 0, lives: -1, good: false, name: "Fries" },
  { label: "🥤", color: "#87CEEB", points: 0, lives: -1, good: false, name: "Soda" },
  { label: "🍪", color: "#D2691E", points: 0, lives: -1, good: false, name: "Cookie" },
  { label: "🍩", color: "#FF69B4", points: 0, lives: -1, good: false, name: "Donut" },
];

const W = 660;
const H = 420;
const BASKET_W = 80;
const BASKET_H = 18;

// Audio context and background music
let audioContext = null;
let backgroundOscillator = null;
let backgroundGain = null;
let isMusicMuted = false;
let isSoundMuted = false;
let backgroundAudio = null;

// Sound effects using Web Audio API
const playSound = (frequency, duration, type = 'sine') => {
  if (isSoundMuted) return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ac.createOscillator();
    const gainNode = ac.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ac.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(0.3, ac.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + duration);
    oscillator.start(ac.currentTime);
    oscillator.stop(ac.currentTime + duration);
  } catch (e) {
    // Silent fail if audio not supported
  }
};

const playMedicineSound = () => playSound(800, 0.1);
const playJunkFoodSound = () => playSound(400, 0.15, 'square');

const startBackgroundMusic = () => {
  if (isMusicMuted) return;
  try {
    if (backgroundAudio && backgroundAudio.paused === false) return; // Already playing
    
    // Create audio element if it doesn't exist
    if (!backgroundAudio) {
      backgroundAudio = new Audio();
      backgroundAudio.volume = 0.3;
      backgroundAudio.loop = true;
      backgroundAudio.src = `/xtremefreddy-game-music-loop-7-145285 (1).mp3`;
    }
    
    backgroundAudio.play().catch(() => {
      // Silently fail if audio can't play
    });
  } catch (e) {
    // Silent fail
  }
};

const stopBackgroundMusic = () => {
  try {
    if (backgroundAudio) {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
    }
  } catch (e) {
    // Silent fail
  }
};

const FANTASTIC_MESSAGES = [
  "🌟 SUPERB! 🌟",
  "✨ FANTASTIC! ✨",
  "🎉 AMAZING! 🎉",
  "💫 INCREDIBLE! 💫",
  "🚀 OUTSTANDING! 🚀",
  "⭐ BRILLIANT! ⭐",
  "💥 EPIC! 💥",
  "🔥 AWESOME! 🔥",
  "✅ EXCELLENT! ✅",
  "🏆 CHAMPION! 🏆",
  "👑 LEGENDARY! 👑",
  "💎 MAGNIFICENT! 💎",
];

const getFantasticMessage = (score) => {
  const msgIndex = Math.floor(score / 200) % FANTASTIC_MESSAGES.length;
  return FANTASTIC_MESSAGES[msgIndex];
};

const BEAUTIFUL_QUOTES = [
  "💚 Health is wealth! Keep moving! 💚",
  "✨ Every step forward is a victory! ✨",
  "🌟 You took care of yourself today - that's amazing! 🌟",
  "🏃 Stay active, stay healthy, stay happy! 🏃",
  "💪 Keep pushing toward better health! 💪",
  "🌈 Remember: A healthy mind lives in a healthy body! 🌈",
  "🎯 You're on the path to wellness! Keep it up! 🎯",
  "❤️ Love yourself by choosing what's good for you! ❤️",
  "🌱 Great effort! Health is a lifelong journey! 🌱",
  "✅ Well played! Your commitment to health shows! ✅",
];

const getRandomQuote = () => {
  return BEAUTIFUL_QUOTES[Math.floor(Math.random() * BEAUTIFUL_QUOTES.length)];
};

function getPool(level) {
  // 50-50 mix of junk food and medicine
  if (level >= 5) return [...MEDICINES, ...JUNK_FOODS];
  if (level >= 3) return [...MEDICINES, ...JUNK_FOODS];
  if (level >= 2) return [...MEDICINES, ...JUNK_FOODS];
  if (level >= 1) return [...MEDICINES, ...JUNK_FOODS];
  return MEDICINES;
}

export default function App() {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    status: "idle",
    score: 0,
    lives: 3,
    level: 1,
    hiScore: 0,
    items: [],
    particles: [],
    basketX: W / 2,
    spawnTimer: 0,
    spawnInterval: 120,
    frameId: null,
    flash: null,
    lastSpawnType: null,
    arrowKeys: { left: false, right: false },
    isFantasticMsg: false,
  });

  const [ui, setUi] = useState({
    score: 0,
    lives: 3,
    level: 1,
    hiScore: 0,
    status: "idle",
    msg: "Use Mouse, Arrow Keys (↑↓), or Touch/Swipe to move!",
  });

  const [audioState, setAudioState] = useState({
    musicMuted: false,
    soundMuted: false,
  });

  const syncUi = useCallback(() => {
    const s = stateRef.current;
    setUi({
      score: s.score,
      lives: s.lives,
      level: s.level,
      hiScore: s.hiScore,
      status: s.status,
      msg: s.msg || "",
    });
  }, []);

  const spawnItem = useCallback(() => {
    const s = stateRef.current;
    let type;
    
    // Alternate between medicine and junk food
    const medicinePool = MEDICINES;
    const junkPool = JUNK_FOODS;
    
    if (s.lastSpawnType === 'medicine' || !s.lastSpawnType) {
      type = junkPool[Math.floor(Math.random() * junkPool.length)];
      s.lastSpawnType = 'junk';
    } else {
      type = medicinePool[Math.floor(Math.random() * medicinePool.length)];
      s.lastSpawnType = 'medicine';
    }
    
    s.items.push({
      x: 30 + Math.random() * (W - 60),
      y: -20,
      vy: 2.2 + s.level * 0.3 + Math.random() * 1.5,
      size: 28,
      ...type,
    });
  }, []);

  const emitParticles = useCallback((x, y, color, good) => {
    const s = stateRef.current;
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        alpha: 1,
        color: good ? color : "#F09595",
        r: 3 + Math.random() * 3,
      });
    }
  }, []);

  const drawBasket = useCallback((ctx, x) => {
    const bx = Math.max(BASKET_W / 2, Math.min(W - BASKET_W / 2, x));
    const by = H - 36;
    ctx.save();
    ctx.strokeStyle = "#5DCAA5";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(bx - BASKET_W / 2, by);
    ctx.lineTo(bx - BASKET_W / 2 + 8, by + BASKET_H);
    ctx.lineTo(bx + BASKET_W / 2 - 8, by + BASKET_H);
    ctx.lineTo(bx + BASKET_W / 2, by);
    ctx.closePath();
    ctx.fillStyle = "rgba(93,202,165,0.18)";
    ctx.fill();
    ctx.stroke();
    // cross lines on basket
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(93,202,165,0.35)";
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(bx - BASKET_W / 2 + (BASKET_W / 4) * i, by);
      ctx.lineTo(bx - BASKET_W / 2 + 8 + ((BASKET_W - 16) / 4) * i, by + BASKET_H);
      ctx.stroke();
    }
    ctx.restore();
    return bx;
  }, []);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = stateRef.current;

    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (s.flash) {
      ctx.fillStyle = s.flash;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      s.flash = null;
    }

    // Spawn
    if (s.status === "playing") {
      s.spawnTimer++;
      if (s.spawnTimer >= s.spawnInterval) {
        s.spawnTimer = 0;
        s.spawnInterval = Math.max(30, 70 - s.level * 3);
        spawnItem();
      }
    }

    // Basket
    const bx = drawBasket(ctx, s.basketX);
    const by = H - 36;

    // Items
    s.items = s.items.filter((item) => {
      item.y += item.vy;
      // Collision
      const hit =
        item.y + item.size / 2 >= by &&
        item.y - item.size / 2 <= by + BASKET_H &&
        item.x >= bx - BASKET_W / 2 &&
        item.x <= bx + BASKET_W / 2;

      if (hit) {
        emitParticles(item.x, item.y, item.color, item.good);
        if (item.good) {
          playMedicineSound();
          s.score += item.points * s.level;
          s.flash = "#5DCAA5";
          
          // Show fantastic message every 200 points
          if (s.score > 0 && s.score % 200 === 0) {
            s.msg = `${getFantasticMessage(s.score)} Score: ${s.score}!`;
            s.level = Math.min(10, s.level + 1);
          } else if (Math.random() < 0.3) { // 30% chance to show a quote
            s.msg = getRandomQuote();
          } else {
            s.msg = `+${item.points * s.level} — ${item.name}!`;
          }
          
          if (s.score > s.hiScore) s.hiScore = s.score;
        } else {
          playJunkFoodSound();
          // Handle bad items and junk foods
          if (item.lives) {
            s.lives += item.lives; // Can be negative for junk foods
          } else {
            s.lives--; // Default deduction for other bad items
          }
          s.flash = "#F09595";
          s.msg = item.lives ? `Oops! ${item.name} is bad for health!` : "Oops! Avoid the bad stuff!";
          if (s.lives <= 0) {
            s.status = "gameover";
            s.msg = ""; // Clear message for overlay
            s.lives = 0;
            stopBackgroundMusic();
          }
        }
        syncUi();
        return false;
      }
      if (item.y > H + 30) {
        if (item.good) {
          s.lives = Math.max(0, s.lives - 0);
        }
        return false;
      }

      // Draw item
      ctx.font = `bold ${item.size - 10}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = item.color;
      ctx.fillText(item.label, item.x, item.y);
      return true;
    });

    // Particles
    s.particles = s.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.alpha -= 0.03;
      if (p.alpha <= 0) return false;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    });

    s.frameId = requestAnimationFrame(loop);
  }, [drawBasket, emitParticles, spawnItem, syncUi]);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    const prev = s.hiScore;
    Object.assign(s, {
      status: "playing",
      score: 0,
      lives: 3,
      level: 1,
      hiScore: prev,
      items: [],
      particles: [],
      basketX: W / 2,
      spawnTimer: 0,
      spawnInterval: 120,
      msg: "Catch the medicine!",
      lastSpawnType: null,
      arrowKeys: { left: false, right: false },
    });
    syncUi();
    startBackgroundMusic();
    if (s.frameId) cancelAnimationFrame(s.frameId);
    s.frameId = requestAnimationFrame(loop);
  }, [loop, syncUi]);

  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    stateRef.current.basketX = e.clientX - rect.left;
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches.length > 0) {
      stateRef.current.basketX = e.touches[0].clientX - rect.left;
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    const s = stateRef.current;
    const speed = 18;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      s.arrowKeys.left = true;
      s.basketX = Math.max(BASKET_W / 2, s.basketX - speed);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      s.arrowKeys.right = true;
      s.basketX = Math.min(W - BASKET_W / 2, s.basketX + speed);
    }
  }, []);

  const handleKeyUp = useCallback((e) => {
    const s = stateRef.current;
    if (e.key === "ArrowLeft") {
      s.arrowKeys.left = false;
    } else if (e.key === "ArrowRight") {
      s.arrowKeys.right = false;
    }
  }, []);

  const toggleMusic = useCallback(() => {
    isMusicMuted = !isMusicMuted;
    if (isMusicMuted) {
      stopBackgroundMusic();
    } else {
      startBackgroundMusic();
    }
    setAudioState(prev => ({ ...prev, musicMuted: isMusicMuted }));
  }, []);

  const toggleSound = useCallback(() => {
    isSoundMuted = !isSoundMuted;
    setAudioState(prev => ({ ...prev, soundMuted: isSoundMuted }));
  }, []);

  useEffect(() => {
    const s = stateRef.current;
    s.frameId = requestAnimationFrame(loop);
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    return () => {
      cancelAnimationFrame(s.frameId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [loop, handleKeyDown, handleKeyUp]);

  return (
    <div className="mediplay-page">
      <Header/>
      <div className="app">
      <div className="title-row">
        <h1 className="title">MediPlay</h1>
        <p className="subtitle">Collect medicine. Avoid danger.</p>
        <div className="audio-controls">
          <button 
            className="audio-btn" 
            onClick={toggleMusic}
            title={audioState.musicMuted ? "Unmute Music" : "Mute Music"}
          >
            {audioState.musicMuted ? "🔇 Music" : "🔊 Music"}
          </button>
          <button 
            className="audio-btn" 
            onClick={toggleSound}
            title={audioState.soundMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {audioState.soundMuted ? "🔇 Sound" : "🔊 Sound"}
          </button>
        </div>
      </div>

      <div className="hud">
        <div className="hud-item">
          <span className="hud-label">Score</span>
          <span className="hud-value">{ui.score}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Lives</span>
          <span className="hud-value lives">{"❤️".repeat(Math.max(0, ui.lives))}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Level</span>
          <span className="hud-value accent">{ui.level}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Best</span>
          <span className="hud-value">{ui.hiScore}</span>
        </div>
      </div>

      <div className="canvas-wrap">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="game-canvas"
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          tabIndex={0}
          style={{ outline: "none" }}
        />
        {ui.status === "gameover" && (
          <div className="overlay">
            <div className="overlay-box">
              <p className="over-quote">{getRandomQuote()}</p>
              <h1 className="over-title">💀 Game Over</h1>
              <p className="over-score">Score: {ui.score}</p>
              {ui.score >= ui.hiScore && ui.score > 0 && (
                <p className="over-hi">🏆 New High Score! 🏆</p>
              )}
              <button className="btn" onClick={startGame}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      <div className="bottom-row">
        <p className="msg">{ui.msg}</p>
        {ui.status !== "playing" && (
          <button className="btn" onClick={startGame}>
            {ui.status === "gameover" ? "Play Again" : "Start Game"}
          </button>
        )}
      </div>

      <div className="legend">
        {MEDICINES.map((m) => (
          <span key={m.name} className="legend-item">
            {m.label} <span className="legend-pts">+{m.points}</span>
          </span>
        ))}
        {BADS.map((b) => (
          <span key={b.name} className="legend-item bad">
            {b.label} <span className="legend-pts">miss</span>
          </span>
        ))}
      </div>
    </div>
    </div>
  );
}