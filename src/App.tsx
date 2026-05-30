import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  update, 
  get, 
  push 
} from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";
import { 
  Dice5, 
  Send, 
  Copy, 
  Play, 
  Crown, 
  MessageSquare, 
  Trophy, 
  Sparkles, 
  User, 
  LogOut, 
  Check,
  ChevronRight,
  TrendingUp,
  CornerUpLeft,
  Users,
  Key,
  X
} from "lucide-react";
import { RoomState, RoomData, ChatMessage, Standing } from "./types";

// Firebase App Configuration (provided by user)
const firebaseConfig = {
  apiKey: "AIzaSyAVREmzFgrnE_1NP9Ke-YbtynlS1Ka-HNk",
  authDomain: "iogame-145c9.firebaseapp.com",
  databaseURL: "https://iogame-145c9-default-rtdb.firebaseio.com",
  projectId: "iogame-145c9",
  storageBucket: "iogame-145c9.firebasestorage.app",
  messagingSenderId: "1024963573565",
  appId: "1:1024963573565:web:907f671f3fad2c56443754",
  measurementId: "G-N1J57G3WS6"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const auth = getAuth(firebaseApp);

// Board structures
const ladders: { [key: number]: number } = { 4: 25, 13: 46, 33: 49, 42: 63, 50: 69, 62: 81, 74: 92 };
const snakes: { [key: number]: number } = { 99: 41, 89: 53, 76: 58, 66: 45, 54: 31, 43: 18, 27: 5 };
const colors = [
  '#007AFF', // Blue
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#34C759', // Green
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#30B0C7', // Teal
  '#FFCC00'  // Yellow
];
const colorsBg = [
  'bg-[#007AFF]',
  'bg-[#FF3B30]',
  'bg-[#FF9500]',
  'bg-[#34C759]',
  'bg-[#AF52DE]',
  'bg-[#FF2D55]',
  'bg-[#30B0C7]',
  'bg-[#FFCC00]'
];
const colorsText = [
  'text-[#007AFF]',
  'text-[#FF3B30]',
  'text-[#FF9500]',
  'text-[#34C759]',
  'text-[#AF52DE]',
  'text-[#FF2D55]',
  'text-[#30B0C7]',
  'text-[#FFCC00]'
];
const colorsBorder = [
  'border-[#007AFF]',
  'border-[#FF3B30]',
  'border-[#FF9500]',
  'border-[#34C759]',
  'border-[#AF52DE]',
  'border-[#FF2D55]',
  'border-[#30B0C7]',
  'border-[#FFCC00]'
];

// Deterministic or randomized helpers for player color synchronization
const shuffleArray = (array: number[]) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const getPlayerColorIndex = (pIdx: number | null | undefined, roomData: any) => {
  if (pIdx === null || pIdx === undefined || pIdx === -1) return 0;
  if (roomData && roomData.colorOrder && roomData.colorOrder[pIdx] !== undefined) {
    return roomData.colorOrder[pIdx];
  }
  return pIdx % 8;
};

// 3D Dice rotation angles per standard face
const diceRotations: { [key: number]: string } = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(-90deg) rotateY(0deg)',
  3: 'rotateX(0deg) rotateY(-90deg)',
  4: 'rotateX(0deg) rotateY(90deg)',
  5: 'rotateX(90deg) rotateY(0deg)',
  6: 'rotateX(180deg) rotateY(0deg)'
};

export default function App() {
  // Device & Identity State
  const [deviceId, setDeviceId] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [hasEnteredName, setHasEnteredName] = useState<boolean>(false);
  
  // Lobby / Room State
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [lobbyStatusMsg, setLobbyStatusMsg] = useState<string>("Connecting...");
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  
  // Local Visual Game States (for fluid animations)
  const [localPositions, setLocalPositions] = useState<number[]>(Array(8).fill(1));
  const [popTokenIndex, setPopTokenIndex] = useState<number | null>(null);
  const [diceRollValue, setDiceRollValue] = useState<number>(1);
  const [cubeTransform, setCubeTransform] = useState<string>("rotateX(-20deg) rotateY(-20deg)");
  const [isRolling, setIsRolling] = useState<boolean>(false);
  
  // Chat State
  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [activeSwipeIndex, setActiveSwipeIndex] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  
  // Custom Room Code entry at Gateway
  const [customRoomCode, setCustomRoomCode] = useState<string>("");
  const [activeGatewayTab, setActiveGatewayTab] = useState<'host' | 'join'>('host');
  
  // Sound Settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // UI Copy URL trigger feedback
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showLeaderboardPopup, setShowLeaderboardPopup] = useState<boolean>(false);

  // Live Typing tracker array for players [P1, P2, P3, P4]
  const [typingStates, setTypingStates] = useState<boolean[]>([false, false, false, false]);

  // Dynamic visual coordinates override for smooth exact path sliding
  const [overrideCoordinates, setOverrideCoordinates] = useState<{
    [pIdx: number]: { left: string; bottom: string; isSnake?: boolean; isLadder?: boolean; scale?: number };
  }>({});
  const prevPositionsRef = useRef<number[] | null>(null);
  const animatingTargetRef = useRef<{ [key: number]: number }>({});

  const audioCtxRef = useRef<AudioContext | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const prevPlayersCountRef = useRef<number>(0);

  // Initialize Device ID on mount
  useEffect(() => {
    // Authenticate anonymously in case database requires auth context
    signInAnonymously(auth)
      .then((userCred) => {
        console.log("Session authenticated:", userCred.user.uid);
      })
      .catch((err) => {
        console.warn("Could not authenticate anonymously automatically:", err);
      });

    let storedId = localStorage.getItem('sl_deviceId');
    if (!storedId) {
      storedId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('sl_deviceId', storedId);
    }
    setDeviceId(storedId);

    // Read room parameter from browser URL bar if joining instantly
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('room');
    if (urlRoom) {
      // Fast bypass check if we were already in this room previously
      get(ref(db, `rooms/${urlRoom}`)).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val() as RoomData;
          const devicesList = data.devices || [];
          const matchedIndex = devicesList.indexOf(storedId!);
          if (matchedIndex !== -1) {
            setRoomCode(urlRoom);
            setPlayerIndex(matchedIndex);
            setIsHost(matchedIndex === 0);
            setNickname(data.names[matchedIndex]);
            setHasEnteredName(true);
            setLobbyStatusMsg(`Welcome back, ${data.names[matchedIndex]}!`);
          }
        }
      }).catch(() => {});
    }
  }, []);

  // Initialize Sound synthesizer smoothly on first direct user interaction
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'tap' | 'pop' | 'dice' | 'ladder' | 'snake' | 'victory' | 'typing' | 'chat' | 'copy' | 'join') => {
    if (!soundEnabled || !audioCtxRef.current) return;
    try {
      const playCtx = audioCtxRef.current;
      const now = playCtx.currentTime;

      if (type === 'tap') {
        const osc = playCtx.createOscillator();
        const gain = playCtx.createGain();
        osc.connect(gain);
        gain.connect(playCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // soft A4
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'pop') {
        const osc = playCtx.createOscillator();
        const gain = playCtx.createGain();
        osc.connect(gain);
        gain.connect(playCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.1);
        gain.gain.setValueAtTime(0.12, now); // slightly louder steps
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'dice') {
        // Create multiple micro roll clicks to simulate bone rolling beautifully
        for (let i = 0; i < 5; i++) {
          const delay = i * 0.07;
          const osc = playCtx.createOscillator();
          const gain = playCtx.createGain();
          osc.connect(gain);
          gain.connect(playCtx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(140 + Math.random() * 110, now + delay);
          gain.gain.setValueAtTime(0.08, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);
          osc.start(now + delay);
          osc.stop(now + delay + 0.05);
        }
      } else if (type === 'ladder') {
        // Play consecutive ascending sparkly triad chords
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // rising higher C major chord
        notes.forEach((freq, idx) => {
          const delay = idx * 0.06;
          const osc = playCtx.createOscillator();
          const gain = playCtx.createGain();
          osc.connect(gain);
          gain.connect(playCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + delay);
          gain.gain.setValueAtTime(0.09, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
          osc.start(now + delay);
          osc.stop(now + delay + 0.2);
        });
      } else if (type === 'snake') {
        // Descending chromatics with severe vibrato wobble (hissing drop effect)
        for (let i = 0; i < 3; i++) {
          const delay = i * 0.08;
          const osc = playCtx.createOscillator();
          const gain = playCtx.createGain();
          osc.connect(gain);
          gain.connect(playCtx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(450 - i * 80, now + delay);
          osc.frequency.linearRampToValueAtTime(100, now + delay + 0.22);
          gain.gain.setValueAtTime(0.07, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);
          osc.start(now + delay);
          osc.stop(now + delay + 0.22);
        }
      } else if (type === 'victory') {
        // Uplifting major retro win theme melody
        const winMelody = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
        winMelody.forEach((freq, idx) => {
          const delay = idx * 0.09;
          const osc = playCtx.createOscillator();
          const gain = playCtx.createGain();
          osc.connect(gain);
          gain.connect(playCtx.destination);
          osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now + delay);
          gain.gain.setValueAtTime(0.14, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.28);
          osc.start(now + delay);
          osc.stop(now + delay + 0.28);
        });
      } else if (type === 'typing') {
        // High mechanical clock keycap tactile click
        const osc = playCtx.createOscillator();
        const gain = playCtx.createGain();
        osc.connect(gain);
        gain.connect(playCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950 + Math.random() * 300, now);
        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'chat') {
        // Water drops pop-whoosh double bubble frequency slide
        const osc1 = playCtx.createOscillator();
        const osc2 = playCtx.createOscillator();
        const gain = playCtx.createGain();
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(playCtx.destination);
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(320, now);
        osc1.frequency.exponentialRampToValueAtTime(640, now + 0.12);
        osc2.frequency.setValueAtTime(480, now);
        osc2.frequency.exponentialRampToValueAtTime(960, now + 0.12);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.12);
        osc2.stop(now + 0.12);
      } else if (type === 'copy') {
        // Beautiful clean smart crystal notification double beep
        [880, 1109.73].forEach((freq, idx) => {
          const delay = idx * 0.06;
          const osc = playCtx.createOscillator();
          const gain = playCtx.createGain();
          osc.connect(gain);
          gain.connect(playCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + delay);
          gain.gain.setValueAtTime(0.04, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
          osc.start(now + delay);
          osc.stop(now + delay + 0.12);
        });
      } else if (type === 'join') {
        // Warm rich major ambient entrance chime
        const notes = [329.63, 440.00, 554.37]; // E4, A4, C#5 beautiful bright major harmonic
        notes.forEach((freq, idx) => {
          const delay = idx * 0.05;
          const osc = playCtx.createOscillator();
          const gain = playCtx.createGain();
          osc.connect(gain);
          gain.connect(playCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + delay);
          gain.gain.setValueAtTime(0.05, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);
          osc.start(now + delay);
          osc.stop(now + delay + 0.4);
        });
      }
    } catch (e) {
      console.warn("Audio Synthesizer error: ", e);
    }
  };

  // Realtime Database listeners block
  useEffect(() => {
    if (!roomCode) return;

    // Listen to Room game state
    const roomRef = ref(db, `rooms/${roomCode}`);
    const unsubscribeRoom = onValue(roomRef, (snapshot) => {
      const data = snapshot.val() as RoomData;
      if (!data) return;

      setRoomData(data);

      if (data && data.names) {
        if (prevPlayersCountRef.current > 0 && data.names.length > prevPlayersCountRef.current) {
          playSound('join');
        }
        prevPlayersCountRef.current = data.names.length;
      }

      // If the game is playing or finished, synchronize external steps and animate them
      if (data.state === 'playing' || data.state === 'finished') {
        const newPos = data.positions || Array(data.names?.length || 1).fill(1);
        setLocalPositions(newPos);

        let didAnimate = false;

        // Dynamically trigger paths animations if the positions have updated
        if (prevPositionsRef.current) {
          const isReset = newPos.every(p => p === 1);
          if (!isReset) {
            newPos.forEach((val, idx) => {
              const oldVal = prevPositionsRef.current![idx];
              if (oldVal !== undefined && oldVal !== val) {
                if (animatingTargetRef.current[idx] === val) {
                  return;
                }
                didAnimate = true;
                const rollValue = data.lastRoll !== '-' ? Number(data.lastRoll) : undefined;
                animatingTargetRef.current[idx] = val;
                animateTokenTrail(idx, oldVal, val, rollValue).finally(() => {
                  delete animatingTargetRef.current[idx];
                  if (data.state === 'finished' && Object.keys(animatingTargetRef.current).length === 0) {
                    setShowLeaderboardPopup(true);
                  }
                });
              }
            });
          }
        }
        
        // If finished and we are not animating (either just loaded, or positions were same), reveal popup
        if (data.state === 'finished' && !didAnimate && Object.keys(animatingTargetRef.current).length === 0) {
           setShowLeaderboardPopup(true);
        }

        prevPositionsRef.current = [...newPos];

        if (data.lastRoll !== '-') {
          setDiceRollValue(Number(data.lastRoll));
          // Apply rotation matching the active face
          const rotAngle = diceRotations[Number(data.lastRoll)];
          if (rotAngle) setCubeTransform(rotAngle);
        }
        
        if (data.state === 'playing') {
          setShowLeaderboardPopup(false);
        }
      }
    });

    // Listen to typing status directories on RTDB
    const typingRef = ref(db, `rooms/${roomCode}/typing`);
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      const valObj = snapshot.val();
      const arr = Array(20).fill(false);
      if (valObj) {
        Object.entries(valObj).forEach(([k, status]) => {
          const idx = parseInt(k, 10);
          if (idx >= 0 && idx < 20) {
            arr[idx] = !!status;
          }
        });
      }
      setTypingStates(arr);
    });

    // Listen to chat list
    const chatRef = ref(db, `rooms/${roomCode}/chat`);
    const unsubscribeChat = onValue(chatRef, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((childSnap) => {
        const msg = childSnap.val() as ChatMessage;
        messages.push(msg);
      });
      // Sort message stamps
      messages.sort((a,b) => a.time - b.time);
      setChatMessages(messages);
    });

    return () => {
      unsubscribeRoom();
      unsubscribeChat();
      unsubscribeTyping();
    };
  }, [roomCode, playerIndex]);

  // Handle Chat scroll alignment whenever chat list updates
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const isJoinOnlyFromUrl = !!(new URLSearchParams(window.location.search).get('room'));

  const handleGatewaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    initAudio();
    playSound('tap');
    if (!nickname.trim()) return;

    setHasEnteredName(true);

    const urlParams = new URLSearchParams(window.location.search);
    const urlRoom = urlParams.get('room');

    if (isJoinOnlyFromUrl && urlRoom) {
      checkURLAndJoinOrCreate(nickname.trim(), urlRoom.toUpperCase());
    } else if (activeGatewayTab === 'host') {
      createHostLobby(nickname.trim());
    } else {
      const code = customRoomCode.trim().toUpperCase();
      if (!code || code.length < 3) {
        setLobbyStatusMsg("Please enter a valid Room Code!");
        setHasEnteredName(false);
        return;
      }
      checkURLAndJoinOrCreate(nickname.trim(), code);
    }
  };

  const checkURLAndJoinOrCreate = async (userName: string, explicitCode?: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetRoomCode = explicitCode || urlParams.get('room');

    if (targetRoomCode) {
      const targetRoomCodeUpper = targetRoomCode.toUpperCase();
      setLobbyStatusMsg(`Connecting to table [${targetRoomCodeUpper}]...`);
      try {
        const snapshot = await get(ref(db, `rooms/${targetRoomCodeUpper}`));
        
        if (snapshot.exists()) {
          const data = snapshot.val() as RoomData;
          if (data.state === 'lobby' && data.names.length < 8) {
            const index = data.names.length;
            setPlayerIndex(index);
            setIsHost(false);
            setRoomCode(targetRoomCodeUpper);
            
            // Seamlessly update browser URL bar for fast invite sharing!
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + targetRoomCodeUpper;
            window.history.pushState({ path: newUrl }, '', newUrl);

            const updatedNames = [...data.names, userName];
            const updatedDevices = [...(data.devices || []), deviceId];
            const updatedPositions = [...(data.positions || [1])];
            while (updatedPositions.length < updatedNames.length) {
              updatedPositions.push(1);
            }
            const updatedColorOrder = Array.from({ length: updatedNames.length }, (_, i) => i % 8);
            
            await update(ref(db, `rooms/${targetRoomCodeUpper}`), {
              names: updatedNames,
              devices: updatedDevices,
              positions: updatedPositions,
              colorOrder: shuffleArray(updatedColorOrder)
            });
            setLobbyStatusMsg("Successfully joined lobby! Waiting for host to launch...");
          } else if (data.state !== 'lobby') {
            setLobbyStatusMsg("⚠️ This room's game has already started! You cannot join mid-game. Please ask the host to start a new game, or create your own room.");
            setHasEnteredName(false);
          } else {
            setLobbyStatusMsg(`⚠️ This lobby is already full (Max 8 players). Try a different room or create your own!`);
            setHasEnteredName(false);
          }
        } else {
          setLobbyStatusMsg(`Lobby room [${targetRoomCodeUpper}] not found on server. Try hosting instead.`);
          setHasEnteredName(false);
        }
      } catch (err) {
        setLobbyStatusMsg("Network connection error. Try again.");
        setHasEnteredName(false);
      }
    } else {
      createHostLobby(userName);
    }
  };

  const createHostLobby = async (userName: string) => {
    setLobbyStatusMsg("Creating secure lobby...");
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(code);
    setPlayerIndex(0);
    setIsHost(true);

    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + code;
    window.history.pushState({ path: newUrl }, '', newUrl);

    try {
      await set(ref(db, `rooms/${code}`), {
        state: 'lobby',
        names: [userName],
        devices: [deviceId],
        turn: 0,
        positions: [1],
        lastRoll: '-',
        colorOrder: [0]
      });
      setLobbyStatusMsg("Lobby created successfully!");
    } catch (e) {
      setLobbyStatusMsg("Failed to create room on DB. Check credentials.");
      setHasEnteredName(false);
    }
  };

  const startGroupGame = async () => {
    if (!isHost || !roomCode || !roomData) return;
    playSound('tap');
    try {
      const numPlayers = roomData.names.length;
      const initialColors = Array.from({ length: numPlayers }, (_, i) => i % 8);
      
      // Sync DB state to playing
      await update(ref(db, `rooms/${roomCode}`), {
        state: 'playing',
        positions: Array(numPlayers).fill(1),
        colorOrder: shuffleArray(initialColors)
      });
    } catch(e) {
      console.error(e);
    }
  };

  const copyLobbyUrl = () => {
    playSound('copy');
    let shareableUrl = window.location.href;
    if (shareableUrl.includes('ais-dev-')) {
      shareableUrl = shareableUrl.replace('ais-dev-', 'ais-pre-');
    }
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Convert game score position (0-100) to grid coordinates (percent 0-100)
  const getCellCoords = (pos: number, pIdx: number) => {
    // If player hasn't started (pos === 0), display them visually on Cell 1 with slight offsets
    const targetCell = pos === 0 ? 1 : pos;
    const rowIndex = Math.floor((targetCell - 1) / 10);
    let colIndex = (targetCell - 1) % 10;
    if (rowIndex % 2 === 1) {
      colIndex = 9 - colIndex;
    }
    // Base coords
    let leftPct = colIndex * 10;
    let bottomPct = rowIndex * 10;

    // Disperse beautifully in corners and edges of the block to stay neat
    const scatterOffsets = [
      { x: 2, y: 2 },   // Bottom Left
      { x: 14, y: 2 },  // Bottom Right
      { x: 2, y: 14 },  // Top Left
      { x: 14, y: 14 }, // Top Right
      { x: 8, y: 2 },   // Bottom Mid
      { x: 8, y: 14 },  // Top Mid
      { x: 2, y: 8 },   // Left Mid
      { x: 14, y: 8 }   // Right Mid
    ];
    
    // Choose appropriate offsets based on player index to guarantee no overlap
    const offset = scatterOffsets[pIdx % 8] || { x: 8, y: 8 };

    return {
      left: `calc(${leftPct}% + ${offset.x}px)`,
      bottom: `calc(${bottomPct}% + ${offset.y}px)`
    };
  };

  // Base coordinate percentages without scattering (bottom-up, 0-100)
  const getCellBasePercent = (pos: number) => {
    const targetCell = pos === 0 ? 1 : pos;
    const rowIndex = Math.floor((targetCell - 1) / 10);
    let colIndex = (targetCell - 1) % 10;
    if (rowIndex % 2 === 1) {
      colIndex = 9 - colIndex;
    }
    return {
      x: colIndex * 10 + 5,
      y: rowIndex * 10 + 5
    };
  };

  // Trajectory pathway animator for snakes, ladders, and regular walks
  const animateTokenTrail = async (pIdx: number, from: number, to: number, rollValue?: number) => {
    if (from === to) return;

    const scatterOffsets = [
      { x: 2, y: 2 },   // Bottom Left
      { x: 14, y: 2 },  // Bottom Right
      { x: 2, y: 14 },  // Top Left
      { x: 14, y: 14 }, // Top Right
      { x: 8, y: 2 },   // Bottom Mid
      { x: 8, y: 14 },  // Top Mid
      { x: 2, y: 8 },   // Left Mid
      { x: 14, y: 8 }   // Right Mid
    ];
    const offset = scatterOffsets[pIdx % 8] || { x: 8, y: 8 };

    let walkTarget = to;
    let tookLadder = false;
    let tookSnake = false;

    // Use actual roll if available to determine if a ladder or snake was taken at the intermediate landing spot
    const roll = rollValue || (roomData?.lastRoll !== '-' ? Number(roomData?.lastRoll) : 0);
    const expectedLanding = from + roll;

    if (roll >= 1 && roll <= 6 && expectedLanding <= 100) {
      if (ladders[expectedLanding] === to) {
        walkTarget = expectedLanding;
        tookLadder = true;
      } else if (snakes[expectedLanding] === to) {
        walkTarget = expectedLanding;
        tookSnake = true;
      }
    } else {
      // Fallback if no roll is found or matches
      if (to > from) {
        // Check if there is any ladder that ends at 'to' and starts >= from
        Object.entries(ladders).forEach(([startCell, endCell]) => {
          if (endCell === to && from <= Number(startCell) && Number(startCell) - from <= 6) {
            walkTarget = Number(startCell);
            tookLadder = true;
          }
        });
      } else {
        // Check if there is any snake that ends at 'to' and starts >= from
        Object.entries(snakes).forEach(([startCell, endCell]) => {
          if (endCell === to && from <= Number(startCell) && Number(startCell) - from <= 6) {
            walkTarget = Number(startCell);
            tookSnake = true;
          }
        });
      }
    }

    // 1. Walk from 'from' to 'walkTarget' block-by-block
    let current = from;
    while (current !== walkTarget) {
      const next = current < walkTarget ? current + 1 : current - 1;
      const steps = 14;
      const duration = 210; // 210ms total per block
      const p1 = getCellBasePercent(current);
      const p2 = getCellBasePercent(next);

      playSound('pop');

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;
        // Natural micro parabola bounce hop
        const hop = Math.sin(t * Math.PI) * 11;

        setOverrideCoordinates(prev => ({
          ...prev,
          [pIdx]: {
            left: `calc(${x - 5}% + ${offset.x}px)`,
            bottom: `calc(${y - 5}% + ${offset.y + hop}px)`,
            scale: 1.2
          }
        }));
        await delayMs(duration / steps);
      }
      current = next;
    }

    // 2. Perform ladder or snake animation along exact line or curves
    if (tookLadder) {
      playSound('ladder');
      const steps = 32;
      const duration = 950;
      const p1 = getCellBasePercent(walkTarget);
      const p2 = getCellBasePercent(to);

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;
        // Distinct jumping rungs bounce curves
        const hopHeight = Math.abs(Math.sin(t * Math.PI * 4)) * 9;

        setOverrideCoordinates(prev => ({
          ...prev,
          [pIdx]: {
            left: `calc(${x - 5}% + ${offset.x}px)`,
            bottom: `calc(${y - 5}% + ${offset.y + hopHeight}px)`,
            isLadder: true,
            scale: 1.25
          }
        }));
        await delayMs(duration / steps);
      }
    } else if (tookSnake) {
      playSound('snake');
      const steps = 38;
      const duration = 1150;
      const p1 = getCellBasePercent(walkTarget);
      const p2 = getCellBasePercent(to);

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Perfect straight linear interpolation
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;

        setOverrideCoordinates(prev => ({
          ...prev,
          [pIdx]: {
            left: `calc(${x - 5}% + ${offset.x}px)`,
            bottom: `calc(${y - 5}% + ${offset.y}px)`,
            isSnake: true,
            scale: 1.25
          }
        }));
        await delayMs(duration / steps);
      }
    }

    // 3. Clear override so player snaps correctly back to base grid coordinates
    setOverrideCoordinates(prev => {
      const copy = { ...prev };
      delete copy[pIdx];
      return copy;
    });
  };

  // Helper promise to wait for a specific visual duration
  const delayMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Roll dice action
  const handleRollClick = async () => {
    if (isRolling || !roomCode || !roomData || playerIndex !== roomData.turn) return;
    
    setIsRolling(true);
    playSound('dice');

    // Roll number
    const newRoll = Math.floor(Math.random() * 6) + 1;
    setDiceRollValue(newRoll);

    // Apply multiple robust spins for aesthetics
    const randomSpinsX = (Math.floor(Math.random() * 2) + 2) * 360;
    const randomSpinsY = (Math.floor(Math.random() * 2) + 2) * 360;
    const baseRotation = diceRotations[newRoll];
    
    // Parse base rotation coordinates
    const newX = parseInt(baseRotation.match(/rotateX\(([-\d]+)deg\)/)?.[1] || "0") + randomSpinsX;
    const newY = parseInt(baseRotation.match(/rotateY\(([-\d]+)deg\)/)?.[1] || "0") + randomSpinsY;
    setCubeTransform(`rotateX(${newX}deg) rotateY(${newY}deg)`);

    // Wait for the rolling 3D physics animation (1200ms duration)
    setTimeout(async () => {
      const roomRef = ref(db, `rooms/${roomCode}`);
      try {
        const snap = await get(roomRef);
        const data = snap.val() as RoomData;
        
        let positionList = [...data.positions];
        let currentPos = positionList[playerIndex];
        let nextTurnIndex = (data.turn + 1) % data.names.length;
        let walkTarget = currentPos;

        if (currentPos === 0) {
          if (newRoll === 6) {
            walkTarget = 1;
            // 6 grants bonus turn
            nextTurnIndex = playerIndex;
          }
        } else {
          walkTarget = currentPos + newRoll;
          if (walkTarget > 100) {
            // Over-bounce blocks movement
            walkTarget = currentPos;
          } else if (newRoll === 6 && walkTarget < 100) {
            // 6 grants bonus turn
            nextTurnIndex = playerIndex;
          }
        }

        // Calculate final position considering snakes and ladders
        let finalPos = walkTarget;
        if (ladders[walkTarget]) {
          finalPos = ladders[walkTarget];
        } else if (snakes[walkTarget]) {
          finalPos = snakes[walkTarget];
        }

        // Set stable final position
        positionList[playerIndex] = finalPos;
        
        const totalPlayers = data.names.length;
        
        if (finalPos === 100) {
          playSound('victory');
          // If they reached 100, they don't get another turn even if they rolled a 6
          nextTurnIndex = (playerIndex + 1) % totalPlayers;
        }

        let newWinners = data.winners ? [...data.winners] : [];
        if (finalPos === 100 && !newWinners.includes(playerIndex)) {
          newWinners.push(playerIndex);
        }

        const isGameOver = (totalPlayers > 1 && newWinners.length >= totalPlayers - 1) || (totalPlayers === 1 && newWinners.length === 1);

        // Advance turn past players who already won
        if (!isGameOver) {
          let attempts = 0;
          while (positionList[nextTurnIndex] === 100 && attempts < totalPlayers) {
            nextTurnIndex = (nextTurnIndex + 1) % totalPlayers;
            attempts++;
          }
        } else if (totalPlayers > 1) {
          // If game is over, the remaining player automatically becomes the loser (gets appended to winners at the end)
          for (let i = 0; i < totalPlayers; i++) {
            if (!newWinners.includes(i)) {
              newWinners.push(i);
            }
          }
        }

        if (isGameOver) {
          await update(roomRef, {
            positions: positionList,
            state: 'finished',
            lastRoll: newRoll,
            turn: nextTurnIndex,
            winners: newWinners
          });
        } else {
          await update(roomRef, {
            positions: positionList,
            turn: nextTurnIndex,
            lastRoll: newRoll,
            winners: newWinners
          });
        }
      } catch (err) {
        console.error("DB Update error: ", err);
      } finally {
        setIsRolling(false);
      }
    }, 1200);
  };

  // Swipe to reply touch handlers
  const handleTouchStart = (e: React.TouchEvent, msg: ChatMessage, index: number) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setActiveSwipeIndex(index);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent, msg: ChatMessage) => {
    if (!touchStartPos || activeSwipeIndex === null) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartPos.x;
    
    const isSelf = msg.uid === deviceId;
    if (isSelf) {
      // Replying to self: swipe left (negative)
      if (diffX < 0) {
        setSwipeOffset(Math.max(diffX, -70));
      } else {
        setSwipeOffset(0);
      }
    } else {
      // Replying to other: swipe right (positive)
      if (diffX > 0) {
        setSwipeOffset(Math.min(diffX, 70));
      } else {
        setSwipeOffset(0);
      }
    }
  };

  const handleTouchEnd = (index: number, msg: ChatMessage) => {
    if (activeSwipeIndex === index) {
      const isSelf = msg.uid === deviceId;
      if (isSelf && swipeOffset < -40) {
        playSound('pop');
        setReplyingTo(msg);
      } else if (!isSelf && swipeOffset > 40) {
        playSound('pop');
        setReplyingTo(msg);
      }
    }
    setTouchStartPos(null);
    setActiveSwipeIndex(null);
    setSwipeOffset(0);
  };

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomCode) return;
    
    const textToSend = chatInput.trim();
    setChatInput("");

    // Reset typing state on submitting
    if (roomCode && playerIndex !== null) {
      set(ref(db, `rooms/${roomCode}/typing/${playerIndex}`), false);
    }
    
    const replyMeta = replyingTo ? {
      replyToName: replyingTo.name,
      replyToText: replyingTo.text
    } : {};
    
    setReplyingTo(null);
    playSound('chat');
    
    try {
      await push(ref(db, `rooms/${roomCode}/chat`), {
        uid: deviceId,
        name: nickname || "Anonymous",
        text: textToSend,
        time: Date.now(),
        ...replyMeta
      });
    } catch(err) {
      console.warn("Could not dispatch message to real-time database.", err);
    }
  };

  const playAgainReset = async () => {
    if (!isHost || !roomCode) return;
    playSound('tap');
    try {
      const numPlayers = roomData?.names.length || 1;
      const resetColors = Array.from({ length: numPlayers }, (_, i) => i % 8);
      
      await update(ref(db, `rooms/${roomCode}`), {
        state: 'lobby',
        positions: Array(numPlayers).fill(1),
        turn: 0,
        lastRoll: '-',
        winners: [],
        colorOrder: shuffleArray(resetColors)
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Convert grid numbers 1-100 inside cells
  const renderBoardGrid = () => {
    const columns = [];
    for (let r = 9; r >= 0; r--) {
      for (let c = 0; c < 10; c++) {
        // Alternating zigzag numbers calculation (perfectly matching coordinate systems)
        const isRowOdd = r % 2 === 1;
        const cellNum = isRowOdd ? (r * 10) + (9 - c) + 1 : (r * 10) + c + 1;

        let cellBgClass = "";
        let textStyleClass = "";

        if (cellNum === 1) {
          cellBgClass = 'start-cell-premium';
          textStyleClass = 'text-emerald-900 font-extrabold font-sans text-[11px] sm:text-xs tracking-tight';
        } else if (cellNum === 100) {
          cellBgClass = 'win-cell-premium';
          textStyleClass = 'text-amber-950 font-extrabold font-sans text-[11px] sm:text-xs tracking-tight';
        } else {
          cellBgClass = cellNum % 2 === 0 ? 'cell-breathing-even' : 'cell-breathing-odd';
          textStyleClass = 'text-neutral-700 font-extrabold font-mono text-[11px] sm:text-xs';
        }

        if (cellNum === 1) {
          columns.push(
            <div 
              key={cellNum}
              id={`cell-${cellNum}`}
              className={`relative flex flex-col items-center justify-center overflow-hidden select-none hover:scale-[1.01] transition-all duration-300 rounded-bl-[20px] sm:rounded-bl-[24px] rounded-tl-[6px] rounded-tr-[6px] rounded-br-[6px] ${cellBgClass}`}
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-600 border border-emerald-400 shadow-md flex items-center justify-center relative animate-pulse shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
                <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white text-white translate-x-[0.5px]" />
              </div>
            </div>
          );
        } else if (cellNum === 100) {
          columns.push(
            <div 
              key={cellNum}
              id={`cell-${cellNum}`}
              className={`relative flex flex-col items-center justify-center overflow-hidden select-none hover:scale-[1.01] transition-all duration-300 rounded-tl-[20px] sm:rounded-tl-[24px] rounded-tr-[6px] rounded-bl-[6px] rounded-br-[6px] ${cellBgClass}`}
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500 border border-amber-300 shadow-lg flex items-center justify-center relative animate-pulse shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-20"></span>
                <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white fill-white" />
              </div>
            </div>
          );
        } else if (cellNum === 10) {
          columns.push(
            <div 
              key={cellNum}
              id={`cell-${cellNum}`}
              className={`relative flex flex-col items-center justify-center gap-1 p-1 select-none border-[0.5px] border-neutral-200/30 rounded-br-[20px] sm:rounded-br-[24px] rounded-tl-[6px] rounded-tr-[6px] rounded-bl-[6px] text-[10px] sm:text-xs font-bold leading-none transition-all duration-300 ${cellBgClass}`}
            >
              <span className={textStyleClass}>
                {cellNum}
              </span>
            </div>
          );
        } else if (cellNum === 91) {
          columns.push(
            <div 
              key={cellNum}
              id={`cell-${cellNum}`}
              className={`relative flex flex-col items-center justify-center gap-1 p-1 select-none border-[0.5px] border-neutral-200/30 rounded-tr-[20px] sm:rounded-tr-[24px] rounded-tl-[6px] rounded-bl-[6px] rounded-br-[6px] text-[10px] sm:text-xs font-bold leading-none transition-all duration-300 ${cellBgClass}`}
            >
              <span className={textStyleClass}>
                {cellNum}
              </span>
            </div>
          );
        } else {
          columns.push(
            <div 
              key={cellNum}
              id={`cell-${cellNum}`}
              className={`relative flex flex-col items-center justify-center gap-1 p-1 select-none border-[0.5px] border-neutral-200/30 rounded-[6px] text-[10px] sm:text-xs font-bold leading-none transition-all duration-300 ${cellBgClass}`}
            >
              <span className={textStyleClass}>
                {cellNum}
              </span>
            </div>
          );
        }
      }
    }
    return columns;
  };

  // Compute cell centers (percentages 0-100) for clean mathematical responsive SVG vectors
  const getCellCenterPercent = (num: number) => {
    const rIndex = Math.floor((num - 1) / 10);
    let cIndex = (num - 1) % 10;
    if (rIndex % 2 === 1) {
      cIndex = 9 - cIndex;
    }
    // Percentage coords
    const x = cIndex * 10 + 5;
    const y = 100 - (rIndex * 10 + 5);
    return { x, y };
  };

  // Generate vector lines for all ladders and custom curves for snakes
  const renderVectorsOnSvg = () => {
    const lines: React.ReactNode[] = [];

    // Draw Bridges for Ladders (thin and translucent)
    Object.entries(ladders).forEach(([startKey, endValue]) => {
      const sNum = Number(startKey);
      const eNum = Number(endValue);
      const p1 = getCellCenterPercent(sNum);
      const p2 = getCellCenterPercent(eNum);

      // Math calculating ladder offsets (parallel rails)
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return;

      // Normal offset vectors
      const nx = -dy / len;
      const ny = dx / len;
      const offsetAmt = 1.6; // slightly narrower rail separation

      const rx1 = p1.x - nx * offsetAmt;
      const ry1 = p1.y - ny * offsetAmt;
      const rx2 = p2.x - nx * offsetAmt;
      const ry2 = p2.y - ny * offsetAmt;

      const lx1 = p1.x + nx * offsetAmt;
      const ly1 = p1.y + ny * offsetAmt;
      const lx2 = p2.x + nx * offsetAmt;
      const ly2 = p2.y + ny * offsetAmt;

      // Draw Rails
      lines.push(
        <line 
          key={`l-rail-left-${sNum}`} 
          x1={`${rx1}%`} y1={`${ry1}%`} 
          x2={`${rx2}%`} y2={`${ry2}%`} 
          stroke="rgba(52, 199, 89, 0.38)" 
          strokeWidth="1.5" 
          strokeLinecap="round"
        />
      );
      lines.push(
        <line 
          key={`l-rail-right-${sNum}`} 
          x1={`${lx1}%`} y1={`${ly1}%`} 
          x2={`${lx2}%`} y2={`${ly2}%`} 
          stroke="rgba(52, 199, 89, 0.38)" 
          strokeWidth="1.5" 
          strokeLinecap="round"
        />
      );

      // Draw horizontal rung links
      const rungCount = Math.max(3, Math.floor(len / 8));
      for (let i = 1; i < rungCount; i++) {
        const t = i / rungCount;
        const rx = rx1 + (rx2 - rx1) * t;
        const ry = ry1 + (ry2 - ry1) * t;
        const lx = lx1 + (lx2 - lx1) * t;
        const ly = ly1 + (ly2 - ly1) * t;
        lines.push(
          <line 
            key={`l-rung-${sNum}-${i}`} 
            x1={`${rx}%`} y1={`${ry}%`} 
            x2={`${lx}%`} y2={`${ly}%`} 
            stroke="rgba(52, 199, 89, 0.3)" 
            strokeWidth="1.5" 
          />
        );
      }
    });

     // Draw straight snake bodies (straight lines from bite start to drop finish)
     Object.entries(snakes).forEach(([startKey, endValue]) => {
       const sNum = Number(startKey);
       const eNum = Number(endValue);
       const p1 = getCellCenterPercent(sNum); // Mouth/bite (top)
       const p2 = getCellCenterPercent(eNum); // Tail/exit (bottom)
 
       lines.push(
         <line
           key={`snake-body-${sNum}`}
           x1={`${p1.x}%`} y1={`${p1.y}%`}
           x2={`${p2.x}%`} y2={`${p2.y}%`}
           stroke="rgba(239, 68, 68, 0.72)"
           strokeWidth="3.2"
           strokeLinecap="round"
         />
       );
 
       // Draw subtle directional marker dots on the straight line to indicate downward slide
       const dotCount = 5;
       for (let i = 1; i < dotCount; i++) {
         const t = i / dotCount;
         const dotX = p1.x + (p2.x - p1.x) * t;
         const dotY = p1.y + (p2.y - p1.y) * t;
         lines.push(
           <circle
             key={`snake-scale-${sNum}-${i}`}
             cx={`${dotX}%`}
             cy={`${dotY}%`}
             r="1.2"
             fill="#FFB703"
             opacity="0.8"
           />
         );
       }
 
       // Snake tongue/head marker at bite position
       lines.push(
         <circle 
           key={`snake-head-${sNum}`}
           opacity="0.72"
           cx={`${p1.x}%`} 
           cy={`${p1.y}%`} 
           r="3.5" 
           fill="#ef4444" 
           stroke="#FFB703" 
           strokeWidth="1.2"
         />
      );

      // Tail dot (yellow warning rattlesnake tip)
      lines.push(
        <circle 
          key={`snake-tail-${sNum}`}
          cx={`${p2.x}%`} 
          cy={`${p2.y}%`} 
          r="1.2" 
          fill="#FFB703" 
          opacity="0.8"
        />
      );
    });

    return lines;
  };

  const getStandings = (): Standing[] => {
    if (!roomData) return [];
    
    if (roomData.winners && roomData.winners.length > 0) {
      // If we have a winners array, map it exactly as the standing order
      return roomData.winners.map(winnerIdx => ({
        name: roomData.names[winnerIdx],
        pos: roomData.positions[winnerIdx] || 0,
        color: colors[winnerIdx]
      }));
    }

    const standingsList = roomData.names.map((name, i) => ({
      name,
      pos: (roomData.positions && roomData.positions[i]) || 0,
      color: colors[i]
    }));
    // Sort position descending
    return standingsList.sort((a, b) => b.pos - a.pos);
  };

  return (
    <div className="relative min-h-screen py-6 px-4 flex flex-col justify-center items-center">
      {/* Dynamic Aurora fluid layer */}
      <div className="aurora-bg"></div>

      {/* Floating high-contrast Top banner */}
      <header className="w-full max-w-5xl mb-6 flex justify-between items-center bg-white/10 backdrop-blur-xl border border-white/40 px-6 py-3 rounded-2xl shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="bg-black text-white p-2.5 rounded-xl flex items-center justify-center shadow-md animate-pulse">
            <Dice5 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 leading-none">
              Snakes & Ladders
            </h1>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
              Professional Arena
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Logo of the Game in header top right */}
          <img 
            src={`${import.meta.env.BASE_URL}game_logo.png`} 
            alt="Game Logo" 
            className="w-11 h-11 object-cover rounded-full hover:scale-105 transition-transform duration-200 active:scale-95"
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      {/* VIEWPORT AREA COORDINATOR */}
      <main className="w-full max-w-5xl flex-1 flex flex-col justify-center items-center z-20">
        
        {/* VIEW 1: Nickname & Room Lobby Gate */}
        {!hasEnteredName ? (
          <div className="w-full max-w-md p-8 rounded-3xl half-panel text-center">
            {/* Horizontal heading row matching Selector 1 precisely (Person icon + Multiplayer Board title on right side) */}
            <div className="flex items-center gap-4 mb-6 text-left p-4 bg-white/50 border border-white/60 rounded-3xl shadow-sm">
              <User className="w-10 h-10 shrink-0 text-black" style={{ color: '#000000' }} />
              <div className="flex-1">
                <h2 className="text-2xl font-black tracking-tight text-neutral-900 leading-none">
                  Multiplayer Board
                </h2>
                <p className="text-xs text-neutral-500 font-semibold mt-1">
                  {isJoinOnlyFromUrl ? "Joining Shared Game Table" : "Ready to play synced table matches"}
                </p>
              </div>
            </div>

            <form onSubmit={handleGatewaySubmit} className="space-y-5">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 font-mono text-left block mb-2 pl-1">
                  1. Setup Your nickname
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ex: Player, King, Champion"
                  className="w-full px-5 py-3.5 bg-white/50 border border-white/70 outline-none rounded-2xl font-black text-center text-base text-neutral-800 placeholder-neutral-400 focus:bg-white/80 focus:border-neutral-400/50 transition-all shadow-inner"
                  required
                  autoComplete="off"
                />
              </div>

              {/* Only show Pathway Selection if NOT entering directly via shared URL link */}
              {!isJoinOnlyFromUrl && (
                <>
                  {/* Styled tab switcher so page looks dense and visually premium */}
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 font-mono text-left block mb-1.5 pl-1">
                      2. Select pathway
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-black/5 p-1.5 rounded-2xl border border-black/5">
                      <button
                        type="button"
                        onClick={() => { initAudio(); playSound('tap'); setActiveGatewayTab('host'); }}
                        className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          activeGatewayTab === 'host'
                            ? 'bg-white text-black shadow-md font-black'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>Host Game</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { initAudio(); playSound('tap'); setActiveGatewayTab('join'); }}
                        className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          activeGatewayTab === 'join'
                            ? 'bg-white text-black shadow-md font-black'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Join Game</span>
                      </button>
                    </div>
                  </div>

                  {activeGatewayTab === 'host' ? (
                    <div className="p-4 bg-white/40 border border-white/50 rounded-2xl text-left">
                      <div className="flex items-center gap-2 mb-1.5 text-[#FF9500]">
                        <Crown className="w-4 h-4 fill-[#FF9500]/10" />
                        <span className="text-xs font-bold uppercase tracking-wider">Host New Co-op Table</span>
                      </div>
                      <p className="text-[10px] font-semibold text-neutral-500 leading-relaxed">
                        Spawns a clean game session in real-time. Copy the board invite code to instantly play with up to 3 nearby friends.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-white/40 border border-white/50 rounded-2xl text-left space-y-3">
                      <div className="flex items-center gap-2 text-indigo-600">
                        <Key className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Join Existing Table</span>
                      </div>
                      
                      <input
                        type="text"
                        maxLength={4}
                        value={customRoomCode}
                        onChange={(e) => setCustomRoomCode(e.target.value.toUpperCase())}
                        placeholder="ENTER 4-DIGIT CODE"
                        className="w-full px-4 py-2.5 bg-white/60 border border-neutral-300 outline-none rounded-xl font-black text-center text-sm font-mono tracking-widest text-neutral-800 focus:bg-white/90 focus:border-indigo-500 transition-all shadow-inner"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Table Connection Found — shown to all URL-join players unless there's an error */}
              {isJoinOnlyFromUrl && !lobbyStatusMsg.startsWith('⚠️') && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl text-left">
                  <div className="flex items-center gap-2 mb-1 text-emerald-600 font-bold">
                    <Check className="w-4 h-4 shrink-0" />
                    <span className="text-xs uppercase tracking-wider font-black">Table Connection Found!</span>
                  </div>
                  <p className="text-[10px] font-semibold text-neutral-500 leading-relaxed">
                    A game session was detected. Enter your nickname and tap Join to connect.
                  </p>
                </div>
              )}

              {/* Connection Invalid — replaces the green box when game has already started */}
              {lobbyStatusMsg.startsWith('⚠️') && (
                <div className="p-4 bg-red-50/80 border border-red-300/70 rounded-2xl text-left">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-base shrink-0">🚫</span>
                    <p className="text-sm font-black text-red-700 uppercase tracking-wider">Connection Invalid!</p>
                  </div>
                  <p className="text-xs font-semibold text-red-600 leading-relaxed pl-7">
                    {lobbyStatusMsg.replace('⚠️', '').trim()}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-4 text-white font-extrabold rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isJoinOnlyFromUrl 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10'
                    : activeGatewayTab === 'host'
                      ? 'bg-[#FF9500] hover:bg-[#E08300] shadow-[#FF9500]/10'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/10'
                }`}
              >
                <span>
                  {isJoinOnlyFromUrl 
                    ? 'Join Game Room' 
                    : activeGatewayTab === 'host' 
                      ? 'Create Host Lobby' 
                      : 'Join Game Lobby'}
                </span>
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>
        ) : roomData?.state === 'lobby' ? (
          /* VIEW 2: Waiting Room Lobby Panel */
          <div className="w-full max-w-md p-8 rounded-3xl half-panel text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 mb-1">
              Waiting Lobby
            </h2>
            
            {/* Room code representation display */}
            <div className="my-5 py-3.5 px-6 bg-white/30 border border-white/50 rounded-2xl inline-flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider">
                Lobby Key Code
              </span>
              <span className="text-3xl font-black font-mono tracking-widest text-black">
                {roomCode}
              </span>
            </div>

            <p className="text-xs font-semibold text-neutral-600 mb-6">
              {lobbyStatusMsg}
            </p>

            {/* List players in lobby */}
            <div className="space-y-2.5 mb-6 text-left">
              <label className="text-[10px] uppercase font-bold text-neutral-500 font-mono pl-1">
                Connected Competitors ({roomData.names.length}/8)
              </label>
              
              <div className="space-y-2">
                {roomData.names.map((name, idx) => (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center py-3 px-4 bg-white/65 border border-white/80 rounded-2xl font-bold shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="relative flex items-center justify-center shrink-0">
                        <div className={`w-3.5 h-3.5 rounded-full ${colorsBg[getPlayerColorIndex(idx, roomData)]} shadow-sm`} />
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </div>
                      <span className="text-neutral-800">{name}</span>
                      {idx === playerIndex && (
                        <span className="text-[9px] bg-neutral-200 px-1.5 py-0.5 rounded text-neutral-600 uppercase font-bold tracking-wider scale-90">
                          You
                        </span>
                      )}
                    </div>
                    
                    {idx === 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-[#FF9500] uppercase font-bold">
                        <Crown className="w-3.5 h-3.5 fill-[#FF9500]/25" />
                        <span>Host</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  onClick={copyLobbyUrl}
                  className="w-full sm:w-1/2 py-4 bg-white/80 hover:bg-white text-neutral-800 border border-white/90 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-[#34C759]" />
                      <span className="text-[#34C759]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy link</span>
                    </>
                  )}
                </button>

                <a
                  href={`whatsapp://send?text=Join%20my%20Snakes%20%26%20Ladders%20Pro%20game!%20%F0%9F%90%8D%F0%9F%8E%B2%0A%0ATap%20here%20to%20play%3A%20${encodeURIComponent(
                    window.location.href.replace('ais-dev-', 'ais-pre-')
                  )}`}
                  data-action="share/whatsapp/share"
                  className="w-full sm:w-1/2 py-4 bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm shadow-[#25D366]/20 cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span>WhatsApp</span>
                </a>
              </div>

              {isHost ? (
                <button
                  disabled={roomData.names.length < 2}
                  onClick={startGroupGame}
                  className="w-full py-4 bg-[#FF2D55] hover:bg-[#E02447] disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer text-base uppercase tracking-wider"
                >
                  <Play className="w-4.5 h-4.5 fill-current animate-pulseCircle" />
                  <span>Start Game</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-white/10 text-[11px] font-semibold text-neutral-500 leading-relaxed">
                  ⏰ Waiting for host {roomData.names[0]} to start game...
                </div>
              )}
            </div>
          </div>
        ) : (roomData?.state === 'playing' || roomData?.state === 'finished') ? (
          /* VIEW 3: Interactive Split Screen game board + active chat */
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Game view column (7/12) */}
            <div className="lg:col-span-7 flex flex-col p-5 rounded-3xl half-panel">
              
              {/* Dynamic Turn banner */}
              <div className="w-full mb-4 flex justify-between items-center bg-white/50 border border-white/60 p-3.5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2.5 font-bold">
                  <div className={`w-3.5 h-3.5 rounded-full ${colorsBg[getPlayerColorIndex(roomData.turn, roomData)]} animate-pulse`}></div>
                  <span className="text-sm text-neutral-500 font-medium">Active Turn:</span>
                  <span className={`text-base font-extrabold ${colorsText[getPlayerColorIndex(roomData.turn, roomData)]}`}>
                    {roomData.turn === playerIndex ? "Your Turn" : roomData.names[roomData.turn]}
                  </span>
                </div>
                
                <div className="px-3 py-1 bg-white/70 border border-white/90 rounded-full text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
                  ROOM: {roomCode}
                </div>
              </div>

              {/* Apple-style Board Platter with Dynamic Soft RGB Glow */}
              <div 
                className="relative w-full aspect-square max-w-[550px] mx-auto z-10 group shrink-0"
                style={{ aspectRatio: '1 / 1' }}
              >
                {/* Soft RGB Lighting Outer Ambient Aura */}
                <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#FF3B30]/35 via-[#007AFF]/40 via-[#34C759]/35 via-[#FFCC00]/40 to-[#007AFF]/35 rounded-[34px] blur-xl opacity-75 group-hover:opacity-100 group-hover:scale-[1.01] transition-all duration-700 animate-rgb-aurora pointer-events-none -z-10"></div>
                <div className="absolute -inset-4 bg-gradient-to-tr from-[#FF3B30]/10 via-[#007AFF]/15 via-[#34C759]/10 via-[#FFCC00]/15 to-[#007AFF]/10 rounded-[40px] blur-3xl opacity-55 pointer-events-none -z-20 animate-pulse-slow"></div>

                {/* Game board viewport with refined Apple layout */}
                <div className="absolute inset-0 bg-white/85 backdrop-blur-md rounded-[28px] sm:rounded-[32px] p-2 border border-white/60 overflow-hidden shadow-[0_20px_45px_-12px_rgba(0,0,0,0.15),_inset_0_1.5px_1px_rgba(255,255,255,0.7)]">
                  {/* Background aurora within board layer */}
                  <div className="board-aurora"></div>

                  {/* 10x10 alternating block coordinate cells fused with gap-1 */}
                  <div className="relative w-full h-full z-10 grid grid-cols-10 grid-rows-10 gap-1 sm:gap-[5px] pointer-events-none">
                    {renderBoardGrid()}
                  </div>

                  {/* Vector layer drawn mathematically: ladder bars and smooth wavy snake gradients */}
                  <svg 
                    className="absolute inset-[8px] w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none z-20"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      {/* Linear gradient for snakes */}
                      <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EA4335" />
                        <stop offset="50%" stopColor="#FF8A00" />
                        <stop offset="100%" stopColor="#FBBC05" />
                      </linearGradient>
                    </defs>

                    {renderVectorsOnSvg()}
                  </svg>

                  {/* Tokens layer positioning with server-synced walking and snake/ladder animations */}
                  <div className="absolute inset-[8px] w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none z-30">
                  {roomData.names.map((_, idx) => {
                    const localCellScore = localPositions[idx] !== undefined ? localPositions[idx] : 0;
                    const overrideVal = overrideCoordinates[idx];
                    const coords = overrideVal ? { left: overrideVal.left, bottom: overrideVal.bottom } : getCellCoords(localCellScore, idx);
                    
                    const isTheirTurn = roomData.turn === idx;
                    
                    const isSnakeActive = !!overrideVal?.isSnake;
                    const isLadderActive = !!overrideVal?.isLadder;
                    
                    const animationClass = isSnakeActive 
                      ? 'goti-snake-bitten' 
                      : isLadderActive 
                        ? 'goti-ladder-climbing' 
                        : isTheirTurn 
                          ? 'bounce-turner' 
                          : '';

                    const scale = overrideVal?.scale || 1.0;

                    return (
                      <div
                        key={idx}
                        className={`token ${colorsBg[getPlayerColorIndex(idx, roomData)]} ${
                          popTokenIndex === idx ? 'pop-anim' : ''
                        } ${animationClass}`}
                        style={{
                          left: coords.left,
                          bottom: coords.bottom,
                          opacity: 1,
                          transform: `scale(${scale})`,
                          transition: overrideVal 
                            ? 'transform 0.08s linear' 
                            : 'left 0.28s cubic-bezier(0.25, 0.8, 0.25, 1), bottom 0.28s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                        title={roomData.names[idx]}
                      >
                        {/* Token inner design */}
                        <div className="w-full h-full flex items-center justify-center text-[7px] font-black text-white select-none">
                          {idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Lower Controls console */}
              <div className="mt-5 pt-3 border-t border-white/30 flex items-center gap-4 justify-between">
                
                {/* Rolling Controller Trigger */}
                <button
                  id="dice-btn"
                  disabled={isRolling || roomData.state === 'finished' || roomData.turn !== playerIndex}
                  onClick={handleRollClick}
                  className="flex-1 py-4 bg-black disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed hover:bg-neutral-900 text-white font-black text-base rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Dice5 className="w-5 h-5 animate-spin-slow" />
                  <span>Roll Dice</span>
                </button>

                 {/* 3D Physical CSS Dice scene block */}
                 <div className="dice-scene select-none">
                   <div className="dice" style={{ transform: cubeTransform }}>
                     <div className="face front">1</div>
                     <div className="face back">6</div>
                     <div className="face right">3</div>
                     <div className="face left">4</div>
                     <div className="face top">2</div>
                     <div className="face bottom">5</div>
                   </div>
                 </div>

              </div>

            </div>

            {/* Chat column (5/12) */}
            <div className="lg:col-span-5 flex flex-col min-h-[400px] rounded-3xl half-panel">
              <div className="p-4 bg-white/45 border-b border-white/50 backdrop-blur-md flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2 font-bold text-neutral-800">
                  <MessageSquare className="w-4.5 h-4.5 text-neutral-600" />
                  <span className="text-sm">Lobby Room Chat</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 bg-white/50 border border-white/80 px-2 py-0.5 rounded-md">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span>Live</span>
                </div>
              </div>

              {/* Message scroll list */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar max-h-[350px] lg:max-h-none overflow-x-hidden min-h-0">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                    <MessageSquare className="w-8 h-8 stroke-[1.5] mb-2 opacity-50" />
                    <p className="text-xs font-semibold">No messages yet</p>
                    <p className="text-[10px]">Type below to talk with other players</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => {
                    const isSelf = msg.uid === deviceId;
                    return (
                      <div 
                        key={i} 
                        onTouchStart={(e) => handleTouchStart(e, msg, i)}
                        onTouchMove={(e) => handleTouchMove(e, msg)}
                        onTouchEnd={() => handleTouchEnd(i, msg)}
                        style={{
                          transform: activeSwipeIndex === i ? `translateX(${swipeOffset}px)` : 'none',
                          transition: activeSwipeIndex === i ? 'none' : 'transform 0.18s ease-out'
                        }}
                        className={`flex flex-col max-w-[85%] relative transition-all ${
                          isSelf ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        {/* Swipe reply indicator hint (Multi-directional) */}
                        {activeSwipeIndex === i && Math.abs(swipeOffset) > 10 && (
                          <div 
                            className={`absolute top-1/2 -translate-y-1/2 text-emerald-600 flex items-center justify-center bg-white/80 rounded-full p-1 border shadow ${
                              swipeOffset > 0 ? 'left-[-26px]' : 'right-[-26px]'
                            }`}
                            style={{ opacity: Math.min(Math.abs(swipeOffset) / 35, 1) }}
                          >
                            <CornerUpLeft className="w-3.5 h-3.5 animate-bounce" />
                          </div>
                        )}

                        {/* Nickname with turner colored token circle and double click reply */}
                        <div className="flex items-center gap-1.5 px-1 mb-0.5 select-none text-[10px] font-extrabold text-neutral-500">
                          {(() => {
                            const pIdx = roomData?.names.findIndex(n => n.trim().toLowerCase() === msg.name.trim().toLowerCase());
                            const cIdx = getPlayerColorIndex(pIdx, roomData);
                            const colorClass = (pIdx !== undefined && pIdx !== -1) ? colorsText[cIdx] : 'text-neutral-500';
                            const dotBgClass = (pIdx !== undefined && pIdx !== -1) ? colorsBg[cIdx] : 'bg-neutral-400';
                            return (
                              <>
                                <div className="relative flex items-center justify-center shrink-0">
                                  <div className={`w-2.5 h-2.5 rounded-full ${dotBgClass} border border-white/60 shadow-sm`} />
                                  <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                  </span>
                                </div>
                                <span className={`truncate max-w-[110px] font-black ${colorClass}`}>
                                  {msg.name} {isSelf && "(You)"}
                                </span>
                              </>
                            );
                          })()}
                          
                          {/* Desktop friendly Quick Click reply button */}
                          <button
                            type="button"
                            onClick={() => { playSound('pop'); setReplyingTo(msg); }}
                            className="ml-1 text-neutral-400 hover:text-emerald-600 transition-colors p-[2px] rounded cursor-pointer"
                            title="Reply"
                          >
                            <CornerUpLeft className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Chat message balloon */}
                        {(() => {
                          const pIdx = roomData?.names.findIndex(n => n.trim().toLowerCase() === msg.name.trim().toLowerCase());
                          const cIdx = getPlayerColorIndex(pIdx, roomData);
                          
                          // Soft pastel backgrounds with deep soft text colors
                          let bubbleBg = 'bg-white/95 text-neutral-800 border-neutral-200';
                          if (pIdx !== undefined && pIdx !== -1) {
                            if (cIdx === 0) bubbleBg = 'bg-[#E0F2FE]/95 text-[#0369A1] border-[#BAE6FD]';
                            else if (cIdx === 1) bubbleBg = 'bg-[#FEE2E2]/95 text-[#B91C1C] border-[#FECACA]';
                            else if (cIdx === 2) bubbleBg = 'bg-[#FFEDD5]/95 text-[#C2410C] border-[#FED7AA]';
                            else if (cIdx === 3) bubbleBg = 'bg-[#DCFCE7]/95 text-[#15803D] border-[#BBF7D0]';
                            else if (cIdx === 4) bubbleBg = 'bg-[#F3E8FF]/95 text-[#6B21A8] border-[#E9D5FF]';
                            else if (cIdx === 5) bubbleBg = 'bg-[#FCE7F3]/95 text-[#BE185D] border-[#FBCFE8]';
                            else if (cIdx === 6) bubbleBg = 'bg-[#CCFBF1]/95 text-[#0F766E] border-[#99F6E4]';
                            else if (cIdx === 7) bubbleBg = 'bg-[#FEF9C3]/95 text-[#854D0E] border-[#FEF08A]';
                          }

                          const quoteColor = (pIdx !== undefined && pIdx !== -1) ? 'text-neutral-700/85 border-neutral-400/30' : 'text-neutral-500 border-neutral-300';

                          return (
                            <div 
                              className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed border shadow-sm ${bubbleBg} ${
                                isSelf ? 'rounded-tr-none' : 'rounded-tl-none'
                              }`}
                            >
                              {/* Quoted message if replying */}
                              {msg.replyToText && (() => {
                                const rAuthorIdx = roomData?.names.findIndex(n => n.trim().toLowerCase() === msg.replyToName?.trim().toLowerCase());
                                const rColorIdx = getPlayerColorIndex(rAuthorIdx, roomData);
                                const replyTextColorClass = (rAuthorIdx !== undefined && rAuthorIdx !== -1) ? colorsText[rColorIdx] : 'text-neutral-700';
                                const replyBorderColorClass = (rAuthorIdx !== undefined && rAuthorIdx !== -1) ? colorsBorder[rColorIdx] : 'border-neutral-300';
                                return (
                                  <div className={`mb-1.5 border-l-2 pl-2 py-0.5 text-[10px] leading-tight text-left ${replyBorderColorClass}`}>
                                    <span className={`font-bold block shrink-0 ${replyTextColorClass}`}>
                                      ↺ {msg.replyToName}
                                    </span>
                                    <span className={`italic font-bold break-words block ${replyTextColorClass}`}>"{msg.replyToText}"</span>
                                  </div>
                                );
                              })()}
                              <p className="break-words max-w-[200px] sm:max-w-xs">{msg.text}</p>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef}></div>

                {/* Real-time other player Typing indicators animation cards */}
                {roomData?.names.map((nm, idx) => {
                  if (idx === playerIndex || !typingStates[idx]) return null;
                  return (
                    <div 
                      key={`typing-${idx}`} 
                      className="flex items-center gap-2 px-3.5 py-2.5 bg-white/70 backdrop-blur-sm border border-white/95 rounded-2xl max-w-max mr-auto animate-pulse shadow-sm rounded-tl-none select-none"
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${colorsBg[getPlayerColorIndex(idx, roomData)]} shadow-sm shrink-0`} />
                      <span className="text-[10px] font-extrabold text-neutral-500 font-sans">
                        {nm} is writing
                      </span>
                      {/* Bouncing Triple Dot typing animations */}
                      <div className="flex gap-0.5 items-center justify-center shrink-0 ml-1">
                        <span className="w-1 h-1 bg-neutral-400 rounded-full chat-dot chat-dot-1" />
                        <span className="w-1 h-1 bg-neutral-400 rounded-full chat-dot chat-dot-2" />
                        <span className="w-1 h-1 bg-neutral-400 rounded-full chat-dot chat-dot-3" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Reply reference preview container */}
              {replyingTo && (() => {
                const rAuthorIdx = roomData?.names.findIndex(n => n.trim().toLowerCase() === replyingTo.name.trim().toLowerCase());
                const rColorIdx = getPlayerColorIndex(rAuthorIdx, roomData);
                const replyTextColorClass = (rAuthorIdx !== undefined && rAuthorIdx !== -1) ? colorsText[rColorIdx] : 'text-neutral-700';
                return (
                  <div className="px-4 py-2 bg-neutral-50/85 backdrop-blur-sm border-t border-neutral-100 flex items-center justify-between text-xs animate-fade-in text-neutral-800 font-medium">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap pr-2">
                      <CornerUpLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0 animate-pulse" />
                      <span className={`font-black shrink-0 ${replyTextColorClass}`}>
                        Replying to {replyingTo.name}:
                      </span>
                      <span className={`italic font-semibold break-words ${replyTextColorClass}`}>
                        "{replyingTo.text}"
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setReplyingTo(null)}
                      className="p-1 hover:bg-black/5 rounded-full text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })()}

              {/* Chat Input form */}
              <form 
                onSubmit={handleChatSend} 
                className="p-3 bg-white/30 border-t border-white/50 backdrop-blur-md flex gap-2 mt-auto"
              >
                <input
                  type="text"
                  maxLength={100}
                  value={chatInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChatInput(val);
                    playSound('typing'); // Soft mechanical keystroke feedback sound
                    if (roomCode && playerIndex !== null) {
                      set(ref(db, `rooms/${roomCode}/typing/${playerIndex}`), val.trim().length > 0);
                    }
                  }}
                  placeholder="Send tactical message..."
                  className="flex-1 px-4 py-3 text-xs bg-white/60 border border-white/85 rounded-xl font-medium outline-none text-neutral-800 placeholder-neutral-400 focus:bg-white/80 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  className="p-3 bg-black text-white hover:bg-neutral-900 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>

          </div>
        ) : null}

      </main>

      {/* VIEW 4: Interactive Leaderboard Standings popup modal */}
      {roomData?.state === 'finished' && showLeaderboardPopup && (
        <div className="fixed inset-0 bg-neutral-900/10 backdrop-blur-3xl flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          
          {/* Real-time falling Confetti celebratory layer */}
          <div className="celebration-confetti pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 48 }).map((_, cid) => {
              const randomLeft = Math.random() * 100;
              const randomDelay = Math.random() * 2.8;
              const randomDuration = 2.2 + Math.random() * 2.6;
              const randomRotate = Math.random() * 360;
              const colorsList = ["#007AFF", "#FF3B30", "#FF9500", "#34C759", "#FFD700", "#FF2D55"];
              const confBg = colorsList[cid % colorsList.length];
              return (
                <div 
                  key={cid} 
                  className="confetti-piece"
                  style={{
                    left: `${randomLeft}%`,
                    animationDelay: `${randomDelay}s`,
                    animationDuration: `${randomDuration}s`,
                    backgroundColor: confBg,
                    transform: `rotate(${randomRotate}deg)`,
                    borderRadius: cid % 2 === 0 ? '50%' : '1px',
                    width: cid % 3 === 0 ? '7px' : '10px',
                    height: cid % 3 === 0 ? '10px' : '15px'
                  }}
                />
              );
            })}
          </div>

          <div className="w-full max-w-lg rounded-[36px] bg-white/80 backdrop-blur-md border border-white/90 p-8 sm:p-10 text-center shadow-2xl relative z-10 my-8 mx-auto transform scale-100 transition-transform duration-300">
            
            {/* Massive engaging golden trophy header */}
            <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
              {/* Pulsing ring aura */}
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-2xl animate-ping opacity-75"></div>
              <div className="absolute inset-4 bg-yellow-300/30 rounded-full blur-xl animate-pulse"></div>
              
              {/* Metallic high fidelity golden trophy container */}
              <div className="relative z-10 w-28 h-28 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 border-2 border-amber-200 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 hover:rotate-3 transition-transform duration-200 cursor-pointer"
                   onMouseEnter={() => playSound('victory')}
                   onClick={() => playSound('victory')}
              >
                <Trophy className="w-16 h-16 text-white drop-shadow-[0_4px_8px_rgba(180,100,0,0.4)] animate-bounce" />
              </div>

              {/* Little floating side starts */}
              <div className="absolute top-2 left-2 text-yellow-400 text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>★</div>
              <div className="absolute top-3 right-3 text-yellow-400 text-base animate-bounce" style={{ animationDelay: '0.4s' }}>★</div>
              <div className="absolute bottom-4 left-0 text-amber-500 text-lg animate-bounce" style={{ animationDelay: '0.6s' }}>★</div>
              <div className="absolute bottom-5 right-1 text-amber-500 text-xl animate-bounce" style={{ animationDelay: '0.1s' }}>★</div>
            </div>

            <h2 className="text-3xl font-black text-neutral-900 tracking-tight leading-none uppercase">
              Championship Final
            </h2>
            <p className="text-sm text-neutral-400 font-bold mt-1.5 mb-8 tracking-wider uppercase">
              🏅 Official Standing Podiums
            </p>

            {/* Dynamic Sorters lists without raw score outputs */}
            <div className="space-y-3 text-left mb-8">
              {getStandings().map((player, standingIndex, arr) => {
                // Pre-calculated beautiful ranks badges
                let rankLabel = "4th Rank";
                let badgeStyle = "bg-neutral-50 border-neutral-200 text-neutral-600";
                let rankNumber = "4th";
                
                const isLoser = standingIndex === arr.length - 1 && arr.length > 1;

                if (standingIndex === 0) {
                  rankLabel = "🏆 GRAND CHAMPION";
                  badgeStyle = "bg-gradient-to-r from-yellow-100 to-amber-50/70 border-yellow-300 shadow-sm text-amber-800 scale-102 font-black ring-2 ring-yellow-400/20";
                  rankNumber = "Winner";
                } else if (isLoser) {
                  rankLabel = "LOSER";
                  badgeStyle = "bg-red-50/80 border-red-200/80 text-red-600 font-bold opacity-80";
                  rankNumber = "Loser";
                } else if (standingIndex === 1) {
                  rankLabel = "🥈 RUNNER UP (2nd)";
                  badgeStyle = "bg-neutral-100/80 border-neutral-300 text-neutral-800 font-extrabold";
                  rankNumber = "2nd";
                } else if (standingIndex === 2) {
                  rankLabel = "🥉 3rd Place";
                  badgeStyle = "bg-amber-100/20 border-amber-200/80 text-amber-900 font-extrabold";
                  rankNumber = "3rd";
                } else if (standingIndex === 3) {
                  rankLabel = "🏅 4th Place";
                  badgeStyle = "bg-neutral-50/50 border-neutral-200/80 text-neutral-500 font-bold";
                  rankNumber = "4th";
                }

                return (
                  <div 
                    key={standingIndex}
                    className={`flex items-center justify-between p-4.5 border rounded-2xl transition-all duration-150 hover:translate-x-1 ${badgeStyle}`}
                  >
                    <div className="flex items-center gap-3 text-base">
                      <span className="font-black text-lg w-8 tracking-tight shrink-0 text-neutral-400">{standingIndex + 1}#</span>
                      <span 
                        className="w-3.5 h-3.5 rounded-full shadow-inner shrink-0" 
                        style={{ backgroundColor: player.color }}
                      ></span>
                      <span className="truncate max-w-[160px] font-black tracking-tight">{player.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs uppercase tracking-tight font-black">
                      <span className="px-2.5 py-1 bg-white/75 rounded-lg border border-black/5 shadow-2xs">{rankNumber}</span>
                      {standingIndex === 0 && (
                        <Crown className="w-5 h-5 text-amber-500 fill-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {isHost ? (
              <button
                onClick={playAgainReset}
                className="w-full py-4.5 bg-[#FF2D55] hover:bg-[#E02447] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 active:scale-95 shadow-md hover:shadow-lg transition-all cursor-pointer text-base uppercase tracking-wider"
              >
                <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-200" />
                <span>Play Again</span>
              </button>
            ) : (
              <p className="p-4 bg-neutral-100 rounded-2xl text-xs text-neutral-500 font-bold uppercase tracking-wider">
                ⏰ Waiting for host {roomData.names[0]} to reset the table...
              </p>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
