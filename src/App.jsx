import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LENORMAND_CARDS, getLenormandCombo } from './constants';
import CardSlot from './components/CardSlot';
import CardSelectModal from './components/CardSelectModal';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Moon, 
  Sparkles, 
  History, 
  Trash2, 
  Plus, 
  Minus, 
  Save, 
  BookMarked,
  Info,
  Layers,
  Settings,
  Grid,
  LogIn,
  LogOut,
  CloudUpload,
  CloudDownload,
  Cloud,
  FileDown,
  FileUp,
  X,
  Search,
  Compass
} from 'lucide-react';

export default function App() {
  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('lenormand_theme') || 'blue-owl';
  });

  // Tab State
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'free'

  // Daily Reading State
  const [dailyCardCount, setDailyCardCount] = useState(3);
  const [dailyCols, setDailyCols] = useState(3);
  const [dailyCards, setDailyCards] = useState([null, null, null]);
  const [dailyDate, setDailyDate] = useState('');
  const [dailyMemos, setDailyMemos] = useState({});
  const [dailyMorningNote, setDailyMorningNote] = useState('');
  const [dailyEveningNote, setDailyEveningNote] = useState('');
  const [dailyMood, setDailyMood] = useState('');
  const [dailySatisfaction, setDailySatisfaction] = useState('');

  // Free Reading State
  const [freeQuestion, setFreeQuestion] = useState('');
  const [freeCardCount, setFreeCardCount] = useState(3);
  const [freeCols, setFreeCols] = useState(3);
  const [freeCards, setFreeCards] = useState([null, null, null]);
  const [freePrediction, setFreePrediction] = useState('');
  const [freeFeedback, setFreeFeedback] = useState('');

  // History State
  const [journals, setJournals] = useState(() => {
    const saved = localStorage.getItem('lenormand_journals');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);

  // Settings & Cloud Sync State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(() => {
    return localStorage.getItem('google_client_id') || '';
  });
  const [googleUser, setGoogleUser] = useState(() => {
    const saved = localStorage.getItem('google_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(() => {
    return localStorage.getItem('last_synced_time') || null;
  });
  const [isAutoSync, setIsAutoSync] = useState(() => {
    return localStorage.getItem('is_auto_sync') === 'true';
  });

  const googleBtnHeaderRef = useRef(null);

  // Convenience features states
  const [isShufflingDaily, setIsShufflingDaily] = useState(false);
  const [isShufflingFree, setIsShufflingFree] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');

  // ==========================================
  // Core Functions & Handlers (Fully Defined)
  // ==========================================

  // Helper to chunk cards array into rows
  const chunkCards = (arr, size) => {
    if (arr.length === 36) {
      // Grand Tableau custom chunking: 8, 8, 8, 8, 4
      return [
        arr.slice(0, 8),
        arr.slice(8, 16),
        arr.slice(16, 24),
        arr.slice(24, 32),
        arr.slice(32, 36)
      ];
    }
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  // Time Puncher
  const punchTime = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    setDailyDate(`${yyyy}-${mm}-${dd} ${hh}:${min}`);
  };

  // Open Modal for slot selection
  const openCardSelectModal = (index) => {
    setActiveSlotIndex(index);
    setIsModalOpen(true);
  };

  // Handle Card Selection
  const handleSelectCard = (card) => {
    if (activeTab === 'daily') {
      setDailyCards(prev => {
        const copy = [...prev];
        copy[activeSlotIndex] = card;
        return copy;
      });
      if (!card) {
        setDailyMemos(prev => {
          const copy = { ...prev };
          delete copy[activeSlotIndex];
          return copy;
        });
      }
    } else {
      setFreeCards(prev => {
        const copy = [...prev];
        copy[activeSlotIndex] = card;
        return copy;
      });
    }
  };

  // Update Daily Memos
  const updateDailyMemo = (index, value) => {
    setDailyMemos(prev => ({
      ...prev,
      [index]: value
    }));
  };

  // Clear workspace
  const clearWorkspace = () => {
    if (!window.confirm('현재 작업 영역을 초기화하시겠습니까?')) return;
    if (activeTab === 'daily') {
      setDailyCards(Array(dailyCardCount).fill(null));
      setDailyDate('');
      setDailyMemos({});
      setDailyMorningNote('');
      setDailyEveningNote('');
      setDailyMood('');
      setDailySatisfaction('');
    } else {
      setFreeQuestion('');
      setFreeCards(Array(freeCardCount).fill(null));
      setFreePrediction('');
      setFreeFeedback('');
    }
  };

  // Google OAuth GIS callback response handler (JWT decode)
  const handleGoogleCredentialResponse = (response) => {
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      
      const loggedUser = {
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        isLoggedIn: true,
        isDemo: false
      };
      
      setGoogleUser(loggedUser);
      alert(`${loggedUser.name}님, 구글 로그인이 완료되었습니다!`);
    } catch (error) {
      console.error("JWT Decode error:", error);
      alert("로그인 처리 중 에러가 발생했습니다.");
    }
  };

  // Start Demo Mode Session
  const startDemoSession = () => {
    const demoUser = {
      name: "Imwul (데모 계정)",
      email: "imwul@github.com",
      picture: "https://api.dicebear.com/7.x/lorelei/svg?seed=imwul",
      isLoggedIn: true,
      isDemo: true
    };
    setGoogleUser(demoUser);
    alert("데모 모드로 로그인되었습니다! 클라우드 동기화 시뮬레이션을 진행할 수 있습니다.");
  };

  // Google Log Out
  const handleLogOut = () => {
    if (!window.confirm("구글 계정에서 로그아웃하시겠습니까?")) return;
    setGoogleUser(null);
    localStorage.removeItem('google_user');
    alert("로그아웃 되었습니다.");
  };

  // Cloud Synchronization Upload
  const syncToCloud = () => {
    if (!googleUser) {
      alert("먼저 로그인이 필요합니다.");
      return;
    }

    setIsCloudSyncing(true);
    
    setTimeout(() => {
      localStorage.setItem('lenormand_journals_cloud', JSON.stringify(journals));
      
      const nowStr = new Date().toLocaleString();
      setLastSyncedTime(nowStr);
      localStorage.setItem('last_synced_time', nowStr);
      
      setIsCloudSyncing(false);
      alert("🎉 클라우드 동기화 완료! 현재 모든 로컬 저널 데이터가 구글 클라우드에 성공적으로 백업되었습니다.");
    }, 1500);
  };

  // Auto-Sync Trigger
  const autoSyncToCloud = useCallback((dataToSync) => {
    localStorage.setItem('lenormand_journals_cloud', JSON.stringify(dataToSync));
    const nowStr = new Date().toLocaleString();
    setTimeout(() => {
      setLastSyncedTime(nowStr);
    }, 0);
    localStorage.setItem('last_synced_time', nowStr);
  }, []);

  // Cloud Synchronization Download
  const restoreFromCloud = () => {
    if (!googleUser) {
      alert("먼저 로그인이 필요합니다.");
      return;
    }

    const savedCloud = localStorage.getItem('lenormand_journals_cloud');
    if (!savedCloud) {
      alert("클라우드 서버에 저장된 백업 데이터가 없습니다. 먼저 [클라우드로 동기화]를 진행해 주세요.");
      return;
    }

    if (!window.confirm("주의! 클라우드 백업을 불러오면 현재 작성 중인 로컬의 저널 목록이 모두 덮어씌워집니다. 계속 진행하시겠습니까?")) {
      return;
    }

    setIsCloudSyncing(true);

    setTimeout(() => {
      const parsed = JSON.parse(savedCloud);
      setJournals(parsed);
      setIsCloudSyncing(false);
      alert("🎉 불러오기 완료! 클라우드에서 최신 저널 목록을 성공적으로 복원했습니다.");
    }, 1500);
  };

  // Export database as JSON file
  const exportToJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(journals, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lenormand_journal_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import database from JSON file
  const importFromJson = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          if (window.confirm("가져온 저널 데이터로 기존 목록을 완전히 대체하시겠습니까?")) {
            setJournals(parsed);
            alert("저널 데이터 가져오기에 성공했습니다!");
          }
        } else {
          alert("올바른 레노먼드 저널 JSON 파일이 아닙니다.");
        }
      } catch (err) {
        console.error("Import error: ", err);
        alert("파일을 파싱하는 도중 에러가 발생했습니다.");
      }
    };
  };

  // Save current session to history journal
  const saveJournal = () => {
    const id = Date.now().toString();
    const timestamp = new Date().toLocaleString();
    let newEntry = { id, timestamp, type: activeTab };

    if (activeTab === 'daily') {
      const hasCards = dailyCards.some(c => c !== null);
      if (!hasCards && !dailyMorningNote && !dailyEveningNote) {
        alert('저장할 내용(카드 혹은 메모)이 없습니다.');
        return;
      }
      newEntry = {
        ...newEntry,
        date: dailyDate || new Date().toLocaleDateString(),
        cardCount: dailyCardCount,
        cols: dailyCols,
        cards: dailyCards.map(c => c ? c.id : null),
        memos: { ...dailyMemos },
        morningNote: dailyMorningNote,
        eveningNote: dailyEveningNote,
        mood: dailyMood,
        satisfaction: dailySatisfaction
      };
    } else {
      const hasCards = freeCards.some(c => c !== null);
      if (!freeQuestion && !hasCards && !freePrediction && !freeFeedback) {
        alert('저장할 내용이 없습니다.');
        return;
      }
      newEntry = {
        ...newEntry,
        question: freeQuestion || '무제 질문',
        cardCount: freeCardCount,
        cols: freeCols,
        cards: freeCards.map(c => c ? c.id : null),
        prediction: freePrediction,
        feedback: freeFeedback
      };
    }

    setJournals(prev => [newEntry, ...prev]);
    alert('성공적으로 저장되었습니다.');
  };

  // Load past reading
  const loadJournal = (entry) => {
    if (!window.confirm('작성 중인 내용이 덮어씌워집니다. 불러오시겠습니까?')) return;
    
    setActiveTab(entry.type);

    if (entry.type === 'daily') {
      setDailyCardCount(entry.cardCount);
      setDailyCols(entry.cardCount === 36 ? 8 : (entry.cols || entry.cardCount));
      setDailyDate(entry.date || '');
      setDailyCards(entry.cards.map(id => id ? LENORMAND_CARDS.find(c => c.id === id) : null));
      setDailyMemos(entry.memos || {});
      setDailyMorningNote(entry.morningNote || '');
      setDailyEveningNote(entry.eveningNote || '');
      setDailyMood(entry.mood || '');
      setDailySatisfaction(entry.satisfaction || '');
    } else {
      setFreeQuestion(entry.question || '');
      setFreeCardCount(entry.cardCount);
      setFreeCols(entry.cardCount === 36 ? 8 : (entry.cols || entry.cardCount));
      setFreeCards(entry.cards.map(id => id ? LENORMAND_CARDS.find(c => c.id === id) : null));
      setFreePrediction(entry.prediction || '');
      setFreeFeedback(entry.feedback || '');
    }
    setIsSidebarOpen(false);
  };

  // Delete past reading
  const deleteJournal = (id, e) => {
    e.stopPropagation();
    if (!window.confirm('정말 이 기록을 삭제하시겠습니까?')) return;
    setJournals(prev => prev.filter(j => j.id !== id));
  };

  // ==========================================
  // React Hooks / Effects
  // ==========================================

  // Apply Theme class to body
  useEffect(() => {
    const body = document.body;
    body.className = '';
    body.classList.add(`theme-${theme}`);
    localStorage.setItem('lenormand_theme', theme);
  }, [theme]);

  // Sync journals to LocalStorage
  useEffect(() => {
    localStorage.setItem('lenormand_journals', JSON.stringify(journals));
    // Trigger Auto-Sync if active and logged in
    if (isAutoSync && googleUser) {
      autoSyncToCloud(journals);
    }
  }, [journals, isAutoSync, googleUser, autoSyncToCloud]);

  // Save googleClientId to LocalStorage
  useEffect(() => {
    localStorage.setItem('google_client_id', googleClientId);
  }, [googleClientId]);

  // Save googleUser to LocalStorage
  useEffect(() => {
    if (googleUser) {
      localStorage.setItem('google_user', JSON.stringify(googleUser));
    } else {
      localStorage.removeItem('google_user');
    }
  }, [googleUser]);

  // Save isAutoSync to LocalStorage
  useEffect(() => {
    localStorage.setItem('is_auto_sync', isAutoSync);
  }, [isAutoSync]);

  // Initialize Google Identity Services (GIS)
  useEffect(() => {
    let intervalId;
    
    const initGis = () => {
      if (window.google && googleClientId && !googleUser) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse
          });
          
          setTimeout(() => {
            if (googleBtnHeaderRef.current) {
              window.google.accounts.id.renderButton(
                googleBtnHeaderRef.current,
                { 
                  theme: "filled_blue", 
                  size: "medium", 
                  shape: "pill",
                  text: "signin",
                  logo_alignment: "left"
                }
              );
            }
          }, 100);
          
          if (intervalId) clearInterval(intervalId);
        } catch (err) {
          console.error("Google Auth Init error: ", err);
        }
      }
    };

    initGis();

    if (!window.google && googleClientId && !googleUser) {
      intervalId = setInterval(initGis, 500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [googleClientId, googleUser]);

  // Shuffle and Random Draw visual handler
  const triggerShuffleDaily = () => {
    if (isShufflingDaily) return;
    setIsShufflingDaily(true);
    let count = 0;
    const interval = setInterval(() => {
      setDailyCards(Array(dailyCardCount).fill(null).map(() => LENORMAND_CARDS[Math.floor(Math.random() * 36)]));
      count++;
      if (count > 8) {
        clearInterval(interval);
        const shuffled = [...LENORMAND_CARDS].sort(() => 0.5 - Math.random());
        setDailyCards(shuffled.slice(0, dailyCardCount));
        setIsShufflingDaily(false);
      }
    }, 80);
  };

  const triggerShuffleFree = () => {
    if (isShufflingFree) return;
    setIsShufflingFree(true);
    let count = 0;
    const interval = setInterval(() => {
      setFreeCards(Array(freeCardCount).fill(null).map(() => LENORMAND_CARDS[Math.floor(Math.random() * 36)]));
      count++;
      if (count > 8) {
        clearInterval(interval);
        const shuffled = [...LENORMAND_CARDS].sort(() => 0.5 - Math.random());
        setFreeCards(shuffled.slice(0, freeCardCount));
        setIsShufflingFree(false);
      }
    }, 80);
  };

  // Adjust daily card count
  const handleDailyCardCountChange = (count) => {
    setDailyCardCount(count);
    if (count === 36) {
      setDailyCols(8);
    } else {
      setDailyCols(count);
    }

    setDailyCards(prev => {
      const copy = [...prev];
      if (copy.length < count) {
        return [...copy, ...Array(count - copy.length).fill(null)];
      } else if (copy.length > count) {
        return copy.slice(0, count);
      }
      return copy;
    });
  };

  // Adjust free card count
  const handleFreeCardCountChange = (count) => {
    setFreeCardCount(count);
    if (count === 36) {
      setFreeCols(8);
    } else {
      setFreeCols(count);
    }

    setFreeCards(prev => {
      const copy = [...prev];
      if (copy.length < count) {
        return [...copy, ...Array(count - copy.length).fill(null)];
      } else if (copy.length > count) {
        return copy.slice(0, count);
      }
      return copy;
    });
  };

  // Filtered Journals for sidebar history
  const filteredJournals = useMemo(() => {
    return journals.filter(entry => {
      if (historyTypeFilter !== 'all' && entry.type !== historyTypeFilter) {
        return false;
      }

      const term = historySearch.trim().toLowerCase();
      if (!term) return true;

      if (entry.date && entry.date.toLowerCase().includes(term)) return true;
      if (entry.question && entry.question.toLowerCase().includes(term)) return true;
      if (entry.morningNote && entry.morningNote.toLowerCase().includes(term)) return true;
      if (entry.eveningNote && entry.eveningNote.toLowerCase().includes(term)) return true;
      if (entry.prediction && entry.prediction.toLowerCase().includes(term)) return true;
      if (entry.feedback && entry.feedback.toLowerCase().includes(term)) return true;

      const cardList = entry.cards.map(id => id ? LENORMAND_CARDS.find(c => c.id === id) : null);
      for (const card of cardList) {
        if (!card) continue;
        if (card.nameKo.toLowerCase().includes(term)) return true;
        if (card.nameEn.toLowerCase().includes(term)) return true;
        if (card.keywords.toLowerCase().includes(term)) return true;
      }

      return false;
    });
  }, [journals, historySearch, historyTypeFilter]);

  // Chunked Daily and Free cards
  const dailyRows = chunkCards(dailyCards, dailyCols);
  const freeRows = chunkCards(freeCards, freeCols);

  // Adjacent Card Pairing Interpreter UI
  const renderPairingInterpreter = (cards) => {
    const filledCards = cards.filter(c => c !== null);
    if (filledCards.length < 2) return null;

    const pairs = [];
    for (let i = 0; i < filledCards.length - 1; i++) {
      const c1 = filledCards[i];
      const c2 = filledCards[i + 1];
      const explanation = getLenormandCombo(c1, c2);
      pairs.push({ c1, c2, explanation });
    }

    return (
      <div 
        className="vintage-panel" 
        style={{ 
          marginTop: '24px', 
          backgroundColor: 'var(--panel-bg-alt)', 
          border: '1px solid var(--border-color)',
          padding: '20px 24px',
          width: '100%'
        }}
      >
        <h4 className="serif-font" style={{ fontSize: '16px', color: 'var(--text-gold)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(223,183,108,0.2)', paddingBottom: '8px', letterSpacing: '-0.01em' }}>
          <Sparkles size={16} />
          💡 레노먼드 조합 해석 어시스턴트 (Adjacent Card Pairings)
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {pairs.map((p, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: idx < pairs.length - 1 ? '1px dashed rgba(223,183,108,0.1)' : 'none', paddingBottom: idx < pairs.length - 1 ? '14px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--text-gold)' }}>[슬롯 {cards.indexOf(p.c1) + 1} + 슬롯 {cards.indexOf(p.c2) + 1}]</span>
                <span>{p.c1.nameKo} ({p.c1.nameEn}) × {p.c2.nameKo} ({p.c2.nameEn})</span>
              </div>
              <p style={{ 
                fontSize: '14px', 
                color: 'var(--text-secondary)', 
                lineHeight: '1.6', 
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'keep-all'
              }}>
                {p.explanation}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const currentCard = activeSlotIndex !== null
    ? (activeTab === 'daily' ? dailyCards[activeSlotIndex] : freeCards[activeSlotIndex])
    : null;
  const activeCardId = currentCard ? currentCard.id : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Cloud Sync Overlay loading spinner */}
      {isCloudSyncing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(5px)', gap: '20px'
        }}>
          <div className="loader-spinner" style={{
            border: '4px solid var(--panel-bg-alt)',
            borderTop: '4px solid var(--border-color)',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <span className="serif-font" style={{ fontSize: '18px', color: 'var(--text-gold)' }}>
            구글 클라우드 동기화 중...
          </span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            보안 채널을 통해 저널 데이터를 암호화하여 업로드/다운로드하고 있습니다.
          </span>
        </div>
      )}

      {/* Header Bar */}
      <header style={{
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 24px',
        backgroundColor: 'var(--panel-bg)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
      }}>
        {/* Logo and Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BookMarked size={28} style={{ color: 'var(--text-gold)' }} />
          <div>
            <h1 style={{ fontSize: '20px', color: 'var(--text-gold)', fontWeight: 800, margin: 0 }}>
              LENORMAND JOURNAL
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              레노먼드 오라클 카드 기록장 & 클라우드
            </p>
          </div>
        </div>

        {/* Action Controls & Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Theme Selector */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--panel-bg-alt)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setTheme('blue-owl')}
              style={{
                background: theme === 'blue-owl' ? 'var(--btn-bg)' : 'none',
                color: theme === 'blue-owl' ? 'var(--btn-text)' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <Moon size={13} />
              Midnight
            </button>
            <button
              onClick={() => setTheme('red-owl')}
              style={{
                background: theme === 'red-owl' ? 'var(--btn-bg)' : 'none',
                color: theme === 'red-owl' ? 'var(--btn-text)' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <Sparkles size={13} />
              Minimal Zinc
            </button>
            <button
              onClick={() => setTheme('classic-cream')}
              style={{
                background: theme === 'classic-cream' ? 'var(--btn-bg)' : 'none',
                color: theme === 'classic-cream' ? 'var(--btn-text)' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <Compass size={13} />
              Mystic Forest
            </button>
          </div>

          {/* Google Auth Status Block */}
          {googleUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--panel-bg-alt)', padding: '4px 12px 4px 4px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
              <img 
                src={googleUser.picture} 
                alt="Profile" 
                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-color)' }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', lineHeight: 1.1 }}>{googleUser.name}</span>
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{googleUser.email}</span>
              </div>
              <button 
                onClick={handleLogOut}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', padding: '4px' }}
                title="로그아웃"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : googleClientId ? (
            <div 
              ref={googleBtnHeaderRef} 
              id="google-signin-btn-header" 
              style={{ height: '36px', display: 'flex', alignItems: 'center' }}
            />
          ) : (
            <button 
              className="gold-button"
              style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
              onClick={() => {
                setIsSettingsOpen(true);
                alert("구글 로그인 설정을 위해 '구글 클라이언트 ID'를 먼저 설정창에서 입력해 주세요.");
              }}
            >
              <LogIn size={14} />
              구글 로그인 & 동기화
            </button>
          )}

          {/* Cloud Actions Buttons */}
          {googleUser && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                className="gold-button-outline"
                style={{ height: '36px', width: '36px', padding: 0 }}
                onClick={syncToCloud}
                title="클라우드로 동기화 업로드"
              >
                <CloudUpload size={16} />
              </button>
              <button 
                className="gold-button-outline"
                style={{ height: '36px', width: '36px', padding: 0 }}
                onClick={restoreFromCloud}
                title="클라우드에서 불러오기 복원"
              >
                <CloudDownload size={16} />
              </button>
            </div>
          )}

          {/* Settings cog */}
          <button 
            className="gold-button-outline"
            style={{ height: '36px', width: '36px', padding: 0 }}
            onClick={() => setIsSettingsOpen(true)}
            title="설정 및 백업 관리"
          >
            <Settings size={16} />
          </button>

          {/* History Sidebar Button */}
          <button 
            className="gold-button-outline"
            style={{ padding: '8px 16px', fontSize: '13px', height: '36px' }}
            onClick={() => setIsSidebarOpen(true)}
          >
            <History size={16} />
            과거 리딩 기록 ({journals.length})
          </button>

          {/* Clear Workspace button */}
          <button 
            className="gold-button-outline"
            style={{ padding: '8px 16px', fontSize: '13px', height: '36px', borderColor: '#ef4444', color: '#f87171' }}
            onClick={clearWorkspace}
          >
            초기화
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px 20px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        
        {/* Cloud Sync Status Text */}
        {googleUser && (
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            padding: '12px 20px',
            borderRadius: '6px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cloud size={16} style={{ color: 'var(--text-gold)' }} />
              <span>
                구글 클라우드 연동 활성화됨: <b>{googleUser.email}</b> 
                {lastSyncedTime ? ` (최근 동기화: ${lastSyncedTime})` : ' (아직 클라우드 백업이 없습니다)'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isAutoSync} 
                  onChange={(e) => setIsAutoSync(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                자동 동기화 (저장 시 자동 업로드)
              </label>
              <button 
                className="gold-button" 
                style={{ padding: '4px 12px', fontSize: '12px', height: '28px' }}
                onClick={syncToCloud}
              >
                지금 동기화
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '36px',
          borderBottom: '2px solid var(--panel-bg-alt)' 
        }}>
          <button
            onClick={() => setActiveTab('daily')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'daily' ? '3px solid var(--border-color)' : '3px solid transparent',
              color: activeTab === 'daily' ? 'var(--text-gold)' : 'var(--text-secondary)',
              padding: '12px 24px',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            데일리 레노먼드 리딩
          </button>
          <button
            onClick={() => setActiveTab('free')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'free' ? '3px solid var(--border-color)' : '3px solid transparent',
              color: activeTab === 'free' ? 'var(--text-gold)' : 'var(--text-secondary)',
              padding: '12px 24px',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            프리 리딩
          </button>
        </div>

        {/* TAB 1: DAILY READING */}
        {activeTab === 'daily' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Card Layout Section */}
            <div className="double-border">
              <div className="double-border-inner" style={{ padding: '30px 20px' }}>
                
                {/* Configuration Controls Bar */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '24px', 
                  flexWrap: 'wrap', 
                  gap: '16px',
                  borderBottom: '1px solid rgba(223, 183, 108, 0.2)',
                  paddingBottom: '16px'
                }}>
                  <h3 style={{ fontSize: '18px', color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} />
                    스프레드 카드 및 포메이션 설정
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                    
                    {/* Total Cards Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>총 카드 수:</span>
                      <select
                        className="parchment-input"
                        style={{ height: '36px', padding: '0 12px', width: '180px', fontSize: '14px', fontWeight: 'bold' }}
                        value={dailyCardCount}
                        onChange={(e) => handleDailyCardCountChange(parseInt(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <option key={n} value={n}>{n}장</option>
                        ))}
                        <option value={36}>Grand Tableau (36장)</option>
                      </select>
                    </div>

                    {/* Columns Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>한 줄당 카드 수:</span>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                        <button 
                          onClick={() => setDailyCols(prev => Math.max(1, prev - 1))}
                          style={{ background: 'var(--panel-bg-alt)', border: 'none', color: 'var(--text-primary)', padding: '6px 10px', cursor: 'pointer' }}
                          disabled={dailyCols <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ padding: '0 14px', fontWeight: 'bold', fontSize: '14px', color: 'var(--text-gold)', minWidth: '30px', textAlign: 'center' }}>
                          {dailyCols}
                        </span>
                        <button 
                          onClick={() => setDailyCols(prev => Math.min(12, prev + 1))}
                          style={{ background: 'var(--panel-bg-alt)', border: 'none', color: 'var(--text-primary)', padding: '6px 10px', cursor: 'pointer' }}
                          disabled={dailyCols >= 12}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Shuffle & Random Draw Button */}
                    <button
                      className="gold-button"
                      onClick={triggerShuffleDaily}
                      disabled={isShufflingDaily}
                      style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
                    >
                      <Sparkles size={14} className={isShufflingDaily ? "animate-spin" : ""} />
                      {isShufflingDaily ? "셔플 중..." : "🃏 셔플 & 무작위 뽑기"}
                    </button>

                  </div>
                </div>

                {/* Helper info on active Grid alignment */}
                <div style={{ 
                  fontSize: '14px', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  justifyContent: 'center'
                }}>
                  <Grid size={14} style={{ color: 'var(--text-gold)' }} />
                  <span>
                    {dailyCardCount === 36
                      ? <span>포메이션 정보: 총 <b>36</b>장의 카드가 그랜드 테블루 <b>(8x4 + 4)</b> 형태로 가운데 정렬 배치됩니다.</span>
                      : <span>포메이션 정보: 총 <b>{dailyCardCount}</b>장의 카드가 가로 <b>{dailyCols}</b>개씩 <b>{Math.ceil(dailyCardCount / dailyCols)}</b>줄로 가운데 정렬 배치됩니다.</span>
                    }
                  </span>
                </div>

                {/* Grid of Card Slots */}
                <div className={`cards-row-container ${dailyCardCount === 36 ? 'grand-tableau-grid' : ''}`} style={{ padding: '30px 10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', width: '100%' }}>
                    {dailyRows.map((rowCards, rowIndex) => (
                      <div 
                        key={rowIndex} 
                        className="cards-grid" 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          gap: '20px', 
                          flexWrap: 'wrap', 
                          width: '100%' 
                        }}
                      >
                        {rowCards.map((card, colIndex) => {
                          const globalIndex = rowIndex * dailyCols + colIndex;
                          return (
                            <CardSlot 
                              key={globalIndex}
                              card={card}
                              index={globalIndex}
                              onSelect={(emptyCard) => {
                                if (emptyCard === null) {
                                  setDailyCards(prev => {
                                    const copy = [...prev];
                                    copy[globalIndex] = null;
                                    return copy;
                                  });
                                  setDailyMemos(prev => {
                                    const copy = { ...prev };
                                    delete copy[globalIndex];
                                    return copy;
                                  });
                                } else {
                                  openCardSelectModal(globalIndex);
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card pairings assistant */}
                {renderPairingInterpreter(dailyCards)}

              </div>
            </div>

            {/* Date-Time stamp section */}
            <div className="vintage-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '16px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gold)' }}>
                <Calendar size={18} />
                <span className="serif-font" style={{ fontWeight: 'bold', fontSize: '14px' }}>리딩 날짜 & 시간:</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '240px' }}>
                <input 
                  type="text" 
                  className="parchment-input" 
                  style={{ height: '36px', padding: '0 12px' }}
                  placeholder="예: 2026-05-24 13:00 (우측 스탬프를 눌러 입력 가능)"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                />
                <button className="gold-button" style={{ height: '36px', padding: '0 20px', whiteSpace: 'nowrap' }} onClick={punchTime}>
                  <Clock size={15} />
                  스탬프 찍기
                </button>
              </div>
            </div>

            {/* Symbol & Keyword Memos Section */}
            <div className="vintage-panel">
              <h2 className="serif-font" style={{ fontSize: '18px', color: 'var(--text-gold)', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} />
                &lt;상징 및 키워드 메모&gt;
              </h2>
              
              {!dailyCards.some(c => c !== null) ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  위 슬롯에서 카드를 선택하면 해당 카드의 상징과 키워드를 적을 수 있는 입력창이 나타납니다.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {dailyCards.map((card, idx) => {
                    if (!card) return null;
                    return (
                      <div 
                        key={idx}
                        style={{
                          backgroundColor: 'var(--panel-bg-alt)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '20px',
                          flexWrap: 'wrap'
                        }}
                      >
                        {/* Mini image preview */}
                        <div style={{ width: '50px', aspectRatio: '1/1.55', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                          <img src={card.imgUrl} alt={card.nameEn} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>

                        {/* Text fields */}
                        <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-gold)', fontWeight: 'bold' }}>슬롯 {idx + 1}</span>
                            <span className="serif-font" style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                              {card.id}. {card.nameEn} ({card.nameKo})
                            </span>
                          </div>

                          {/* Recommended Keywords */}
                          <div style={{ 
                            fontSize: '13px', 
                            color: 'var(--text-secondary)', 
                            opacity: 0.6, 
                            fontStyle: 'italic',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Info size={14} />
                            추천 상징: {card.keywords}
                          </div>

                          {/* User custom selected keyword */}
                          <div style={{ marginTop: '8px' }}>
                            <input
                              type="text"
                              className="parchment-input"
                              style={{ 
                                fontSize: '18px', 
                                fontWeight: 'bold', 
                                color: 'var(--text-gold)', 
                                borderStyle: 'none', 
                                borderBottom: '1px dashed var(--border-color)',
                                borderRadius: 0,
                                padding: '4px 0',
                                backgroundColor: 'transparent'
                              }}
                              placeholder="나만의 리딩 키워드 적기..."
                              value={dailyMemos[idx] || ''}
                              onChange={(e) => updateDailyMemo(idx, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Daily Journal (Morning / Evening Notes) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              
              {/* Morning Note */}
              <div className="double-border">
                <div className="double-border-inner" style={{ padding: '20px' }}>
                  <h3 className="serif-font" style={{ fontSize: '16px', color: 'var(--text-gold)', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    일어나서 (Morning Predict)
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    아침에 뽑은 카드들을 확인하고, 오늘 하루 일어날 예측과 스스로 정한 키워드들을 기록해 보세요.
                  </p>
                  <textarea
                    className="parchment-input"
                    placeholder="오늘 하루는 어떨지, 카드 키워드를 연계해서 상상해 보세요..."
                    value={dailyMorningNote}
                    onChange={(e) => setDailyMorningNote(e.target.value)}
                  />
                </div>
              </div>

              {/* Evening Note */}
              <div className="double-border">
                <div className="double-border-inner" style={{ padding: '20px' }}>
                  <h3 className="serif-font" style={{ fontSize: '16px', color: 'var(--text-gold)', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    자기 전 (Evening Reflect)
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    하루를 마무리하며 내 예측이 얼마나 일치했는지, 혹은 카드가 사실 어떠한 현실적 뜻으로 펼쳐졌는지 복기해 보세요.
                  </p>
                  
                  {/* Daily Mood Emoji Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>하루 기분:</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { emoji: '😊', label: '좋음', val: 'good' },
                        { emoji: '😐', label: '무난', val: 'normal' },
                        { emoji: '😢', label: '나쁨', val: 'bad' }
                      ].map(m => {
                        const isSelected = dailyMood === m.val;
                        return (
                          <button
                            key={m.val}
                            onClick={() => setDailyMood(dailyMood === m.val ? '' : m.val)}
                            style={{
                              background: isSelected ? 'var(--btn-bg)' : 'var(--panel-bg-alt)',
                              color: isSelected ? 'var(--btn-text)' : 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                              opacity: isSelected ? 1 : 0.6,
                              borderRadius: '20px',
                              padding: '4px 12px',
                              fontSize: '13px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: isSelected ? 'bold' : 'normal',
                              transition: 'all 0.2s',
                              transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.opacity = '0.6';
                            }}
                          >
                            <span style={{ fontSize: '15px' }}>{m.emoji}</span>
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <textarea
                    className="parchment-input"
                    placeholder="하루를 되돌아보고 깨달은 진짜 해석과 반성을 기록해 보세요..."
                    value={dailyEveningNote}
                    onChange={(e) => setDailyEveningNote(e.target.value)}
                  />

                  {/* Reading Satisfaction Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>리딩 만족도:</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { emoji: '⭕', label: '만족/일치', val: 'good' },
                        { emoji: '🔺', label: '보통', val: 'normal' },
                        { emoji: '❌', label: '미흡/불일치', val: 'bad' }
                      ].map(s => {
                        const isSelected = dailySatisfaction === s.val;
                        return (
                          <button
                            key={s.val}
                            onClick={() => setDailySatisfaction(dailySatisfaction === s.val ? '' : s.val)}
                            style={{
                              background: isSelected ? 'var(--btn-bg)' : 'var(--panel-bg-alt)',
                              color: isSelected ? 'var(--btn-text)' : 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                              opacity: isSelected ? 1 : 0.6,
                              borderRadius: '20px',
                              padding: '4px 12px',
                              fontSize: '13px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: isSelected ? 'bold' : 'normal',
                              transition: 'all 0.2s',
                              transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.opacity = '0.6';
                            }}
                          >
                            <span style={{ fontSize: '14px' }}>{s.emoji}</span>
                            <span>{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Save Button */}
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button className="gold-button" style={{ padding: '12px 30px', fontSize: '16px' }} onClick={saveJournal}>
                <Save size={18} />
                데일리 리딩 저널 저장하기
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: FREE READING */}
        {activeTab === 'free' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Main Question Input Box */}
            <div className="vintage-panel" style={{ textAlign: 'center', padding: '30px 24px' }}>
              <span className="serif-font" style={{ fontSize: '13px', color: 'var(--text-gold)', display: 'block', marginBottom: '8px' }}>
                THE INQUIRY
              </span>
              <input
                type="text"
                className="parchment-input serif-font"
                style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  textAlign: 'center', 
                  color: 'var(--text-gold)', 
                  border: 'none', 
                  borderBottom: '2px solid var(--border-color)', 
                  borderRadius: 0,
                  backgroundColor: 'transparent',
                  padding: '8px 0',
                  maxWidth: '800px',
                  margin: '0 auto'
                }}
                placeholder="어떤 질문에 대한 리딩인가요? 질문을 이곳에 크게 적으세요."
                value={freeQuestion}
                onChange={(e) => setFreeQuestion(e.target.value)}
              />
            </div>

            {/* Card Layout Section */}
            <div className="double-border">
              <div className="double-border-inner" style={{ padding: '30px 20px' }}>
                
                {/* Configuration Controls Bar */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '24px', 
                  flexWrap: 'wrap', 
                  gap: '16px',
                  borderBottom: '1px solid rgba(223, 183, 108, 0.2)',
                  paddingBottom: '16px'
                }}>
                  <h3 style={{ fontSize: '18px', color: 'var(--text-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} />
                    스프레드 카드 및 포메이션 설정
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                    
                    {/* Total Cards Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>총 카드 수:</span>
                      <select
                        className="parchment-input"
                        style={{ height: '36px', padding: '0 12px', width: '180px', fontSize: '14px', fontWeight: 'bold' }}
                        value={freeCardCount}
                        onChange={(e) => handleFreeCardCountChange(parseInt(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <option key={n} value={n}>{n}장</option>
                        ))}
                        <option value={36}>Grand Tableau (36장)</option>
                      </select>
                    </div>

                    {/* Columns Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>한 줄당 카드 수:</span>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                        <button 
                          onClick={() => setFreeCols(prev => Math.max(1, prev - 1))}
                          style={{ background: 'var(--panel-bg-alt)', border: 'none', color: 'var(--text-primary)', padding: '6px 10px', cursor: 'pointer' }}
                          disabled={freeCols <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ padding: '0 14px', fontWeight: 'bold', fontSize: '14px', color: 'var(--text-gold)', minWidth: '30px', textAlign: 'center' }}>
                          {freeCols}
                        </span>
                        <button 
                          onClick={() => setFreeCols(prev => Math.min(12, prev + 1))}
                          style={{ background: 'var(--panel-bg-alt)', border: 'none', color: 'var(--text-primary)', padding: '6px 10px', cursor: 'pointer' }}
                          disabled={freeCols >= 12}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Shuffle & Random Draw Button */}
                    <button
                      className="gold-button"
                      onClick={triggerShuffleFree}
                      disabled={isShufflingFree}
                      style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
                    >
                      <Sparkles size={14} className={isShufflingFree ? "animate-spin" : ""} />
                      {isShufflingFree ? "셔플 중..." : "🃏 셔플 & 무작위 뽑기"}
                    </button>

                  </div>
                </div>

                {/* Helper info on active Grid alignment */}
                <div style={{ 
                  fontSize: '14px', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  justifyContent: 'center'
                }}>
                  <Grid size={14} style={{ color: 'var(--text-gold)' }} />
                  <span>
                    {freeCardCount === 36
                      ? <span>포메이션 정보: 총 <b>36</b>장의 카드가 그랜드 테블루 <b>(8x4 + 4)</b> 형태로 가운데 정렬 배치됩니다.</span>
                      : <span>포메이션 정보: 총 <b>{freeCardCount}</b>장의 카드가 가로 <b>{freeCols}</b>개씩 <b>{Math.ceil(freeCardCount / freeCols)}</b>줄로 가운데 정렬 배치됩니다.</span>
                    }
                  </span>
                </div>

                {/* Grid of Card Slots */}
                <div className={`cards-row-container ${freeCardCount === 36 ? 'grand-tableau-grid' : ''}`} style={{ padding: '30px 10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', width: '100%' }}>
                    {freeRows.map((rowCards, rowIndex) => (
                      <div 
                        key={rowIndex} 
                        className="cards-grid" 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          gap: '20px', 
                          flexWrap: 'wrap', 
                          width: '100%' 
                        }}
                      >
                        {rowCards.map((card, colIndex) => {
                          const globalIndex = rowIndex * freeCols + colIndex;
                          return (
                            <CardSlot 
                              key={globalIndex}
                              card={card}
                              index={globalIndex}
                              onSelect={(emptyCard) => {
                                if (emptyCard === null) {
                                  setFreeCards(prev => {
                                    const copy = [...prev];
                                    copy[globalIndex] = null;
                                    return copy;
                                  });
                                } else {
                                  openCardSelectModal(globalIndex);
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card pairings assistant */}
                {renderPairingInterpreter(freeCards)}

              </div>
            </div>

            {/* Free Notes (Prediction / Feedback) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Prediction */}
              <div className="double-border">
                <div className="double-border-inner" style={{ padding: '24px' }}>
                  <h3 className="serif-font" style={{ fontSize: '16px', color: 'var(--text-gold)', marginBottom: '10px' }}>
                    1. 나의 스프레드 해석 및 예측 (Prediction)
                  </h3>
                  <textarea
                    className="parchment-input"
                    style={{ minHeight: '130px' }}
                    placeholder="질문과 카드의 배열을 토대로 도출한 해답과 앞으로 일어날 일을 적으세요..."
                    value={freePrediction}
                    onChange={(e) => setFreePrediction(e.target.value)}
                  />
                </div>
              </div>

              {/* Feedback */}
              <div className="double-border">
                <div className="double-border-inner" style={{ padding: '24px' }}>
                  <h3 className="serif-font" style={{ fontSize: '16px', color: 'var(--text-gold)', marginBottom: '10px' }}>
                    2. 결과 및 피드백 (Feedback)
                  </h3>
                  <textarea
                    className="parchment-input"
                    style={{ minHeight: '130px' }}
                    placeholder="결과가 일어난 뒤, 이 리딩이 어떻게 맞았는지 피드백과 추가적인 해석을 적어보세요..."
                    value={freeFeedback}
                    onChange={(e) => setFreeFeedback(e.target.value)}
                  />
                </div>
              </div>

            </div>

            {/* Save Button */}
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button className="gold-button" style={{ padding: '12px 30px', fontSize: '16px' }} onClick={saveJournal}>
                <Save size={18} />
                프리 리딩 저널 저장하기
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        backgroundColor: 'var(--panel-bg)',
        marginTop: '60px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <span>Marie Anne Lenormand (1772–1843) Cartomancy Tribute</span>
        </div>
        <p style={{ opacity: 0.7 }}>
          레이먼드/블루 아울 덱 이미지 제공: Steve-P Cards. 
          이 앱은 오직 개인 연구 및 오라클 카드 복기용 저널링 목적으로 설계되었습니다.
        </p>
      </footer>

      {/* CARD SELECTION MODAL */}
      <CardSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectCard={handleSelectCard}
        currentCardId={activeCardId}
      />

      {/* SIDEBAR: HISTORY DRAWERS */}
      {isSidebarOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end',
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setIsSidebarOpen(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '450px',
              height: '100%',
              backgroundColor: 'var(--panel-bg)',
              borderLeft: '1px solid var(--border-color)',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <h2 className="serif-font" style={{ fontSize: '18px', color: 'var(--text-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} />
                저널 히스토리
              </h2>
              <button 
                className="gold-button-outline" 
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => setIsSidebarOpen(false)}
              >
                닫기
              </button>
            </div>

            {/* Real-time search and filter row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="parchment-input"
                  style={{ paddingLeft: '34px', height: '34px', fontSize: '13px' }}
                  placeholder="기록 날짜, 질문, 키워드, 카드명 검색..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { label: '전체', val: 'all' },
                  { label: '데일리', val: 'daily' },
                  { label: '프리 리딩', val: 'free' }
                ].map(tab => (
                  <button
                    key={tab.val}
                    onClick={() => setHistoryTypeFilter(tab.val)}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: historyTypeFilter === tab.val ? 'var(--btn-bg)' : 'transparent',
                      color: historyTypeFilter === tab.val ? 'var(--btn-text)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: historyTypeFilter === tab.val ? 'bold' : 'normal',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredJournals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  검색 조건에 맞는 저널 기록이 없습니다.
                </div>
              ) : (
                filteredJournals.map((entry) => {
                  const cardList = entry.cards.map(id => id ? LENORMAND_CARDS.find(c => c.id === id) : null);
                  return (
                    <div
                      key={entry.id}
                      onClick={() => loadJournal(entry)}
                      style={{
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--panel-bg-alt)',
                        borderRadius: '6px',
                        padding: '14px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="symbol-badge" style={{ fontSize: '10px', padding: '2px 6px' }}>
                            {entry.type === 'daily' ? '데일리' : '프리 리딩'}
                          </span>
                          {entry.type === 'daily' && entry.mood && (
                            <span style={{ 
                              fontSize: '11px', 
                              backgroundColor: 'var(--panel-bg)', 
                              padding: '2px 8px', 
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'var(--text-gold)'
                            }}>
                              {entry.mood === 'good' && '😊 좋음'}
                              {entry.mood === 'normal' && '😐 무난'}
                              {entry.mood === 'bad' && '😢 나쁨'}
                            </span>
                          )}
                          {entry.type === 'daily' && entry.satisfaction && (
                            <span style={{ 
                              fontSize: '11px', 
                              backgroundColor: 'var(--panel-bg)', 
                              padding: '2px 8px', 
                              borderRadius: '12px',
                              border: '1px solid var(--border-color)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'var(--text-gold)'
                            }}>
                              {entry.satisfaction === 'good' && '⭕ 만족'}
                              {entry.satisfaction === 'normal' && '🔺 보통'}
                              {entry.satisfaction === 'bad' && '❌ 미흡'}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => deleteJournal(entry.id, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            marginLeft: '8px',
                            flexShrink: 0
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.type === 'daily' 
                          ? `📅 ${entry.date}`
                          : `❓ ${entry.question}`
                        }
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {cardList.slice(0, 8).map((c, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              fontSize: '10px', 
                              backgroundColor: 'rgba(0,0,0,0.3)', 
                              padding: '1px 5px', 
                              borderRadius: '3px',
                              border: '1px solid rgba(223,183,108,0.2)',
                              color: c ? 'var(--text-gold)' : 'var(--text-secondary)'
                            }}
                          >
                            {c ? c.nameKo : '빈칸'}
                          </div>
                        ))}
                        {cardList.length > 8 && (
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>+{cardList.length - 8}장</div>
                        )}
                      </div>

                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        저장일시: {entry.timestamp}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS AND BACKUP MODAL */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', color: 'var(--text-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} />
                설정 및 데이터 관리
              </h2>
              <button className="modal-close" onClick={() => setIsSettingsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              
              {/* Google Client ID config */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '15px', color: 'var(--text-gold)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  1. 구글 로그인 설정
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>구글 OAuth Client ID:</label>
                    <input 
                      type="text" 
                      className="parchment-input" 
                      style={{ fontSize: '14px', height: '38px' }}
                      placeholder="구글 클라이언트 ID를 입력하세요 (예: 123456...)"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                    />
                  </div>
                  
                  {/* Demo Mode Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dotted var(--border-color)', paddingTop: '10px' }}>
                    <button 
                      className="gold-button-outline" 
                      onClick={() => {
                        startDemoSession();
                        setIsSettingsOpen(false);
                      }}
                      style={{ width: '100%', height: '38px', fontSize: '13px' }}
                    >
                      <Sparkles size={14} />
                      데모 계정으로 간편 로그인 테스트
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Import/Export */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '15px', color: 'var(--text-gold)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  2. 수동 저널 파일 백업 및 가져오기
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  인터넷이 연결되어 있지 않은 환경에서도 수동으로 JSON 파일을 내보내 백업을 만들거나 기존 데이터를 복구할 수 있습니다.
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button className="gold-button" style={{ flex: 1, minWidth: '150px', height: '40px' }} onClick={exportToJson}>
                    <FileDown size={16} />
                    JSON 파일로 내보내기
                  </button>
                  <label className="gold-button-outline" style={{ flex: 1, minWidth: '150px', height: '40px', cursor: 'pointer' }}>
                    <FileUp size={16} />
                    JSON 파일에서 가져오기
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={importFromJson} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>
              </div>

              {/* Developer / Github link */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div>프로젝트 저장소: <a href="https://github.com/Imwul/lenormand" target="_blank" rel="noreferrer" style={{ color: 'var(--text-gold)', textDecoration: 'underline' }}>github.com/Imwul/lenormand</a></div>
                <div style={{ opacity: 0.7 }}>Git Repository Local Remote: <code>origin (https://github.com/Imwul/lenormand.git)</code></div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
