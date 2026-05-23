import React, { useState, useEffect } from 'react';
import { LENORMAND_CARDS, THEMES } from './constants';
import CardSlot from './components/CardSlot';
import CardSelectModal from './components/CardSelectModal';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Moon, 
  Sun, 
  Sparkles, 
  History, 
  Trash2, 
  Plus, 
  Minus, 
  Save, 
  ChevronRight, 
  BookMarked,
  Info,
  Layers,
  Settings,
  Grid
} from 'lucide-react';

export default function App() {
  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('lenormand_theme') || 'blue-owl';
  });

  // Tab State
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'free'

  // Daily Reading State
  const [dailyCardCount, setDailyCardCount] = useState(3); // 1-9, or 36 for Grand Tableau
  const [dailyCols, setDailyCols] = useState(3); // Number of cards per row
  const [dailyCards, setDailyCards] = useState([null, null, null]);
  const [dailyDate, setDailyDate] = useState('');
  const [dailyMemos, setDailyMemos] = useState({});
  const [dailyMorningNote, setDailyMorningNote] = useState('');
  const [dailyEveningNote, setDailyEveningNote] = useState('');

  // Free Reading State
  const [freeQuestion, setFreeQuestion] = useState('');
  const [freeCardCount, setFreeCardCount] = useState(3);
  const [freeCols, setFreeCols] = useState(3); // Number of cards per row
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

  // Apply Theme class to body
  useEffect(() => {
    const body = document.body;
    body.className = ''; // Reset classes
    body.classList.add(`theme-${theme}`);
    localStorage.setItem('lenormand_theme', theme);
  }, [theme]);

  // Sync journals to LocalStorage
  useEffect(() => {
    localStorage.setItem('lenormand_journals', JSON.stringify(journals));
  }, [journals]);

  // Helper to chunk cards array into rows
  const chunkCards = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  // Adjust daily card count
  const handleDailyCardCountChange = (count) => {
    setDailyCardCount(count);
    
    // Set default columns based on card count
    if (count === 36) {
      setDailyCols(9); // Grand Tableau default is 9x4
    } else {
      setDailyCols(count); // Standard default is 1 row of N cards
    }

    // Resize cards array
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
    
    // Set default columns based on card count
    if (count === 36) {
      setFreeCols(9); // Grand Tableau default is 9x4
    } else {
      setFreeCols(count); // Standard default is 1 row of N cards
    }

    // Resize cards array
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

  // Open Modal for slot
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
      // Clear memo if card is cleared
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

  // Update Memo
  const updateDailyMemo = (index, value) => {
    setDailyMemos(prev => ({
      ...prev,
      [index]: value
    }));
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
        eveningNote: dailyEveningNote
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
      setDailyCols(entry.cols || entry.cardCount);
      setDailyDate(entry.date || '');
      setDailyCards(entry.cards.map(id => id ? LENORMAND_CARDS.find(c => c.id === id) : null));
      setDailyMemos(entry.memos || {});
      setDailyMorningNote(entry.morningNote || '');
      setDailyEveningNote(entry.eveningNote || '');
    } else {
      setFreeQuestion(entry.question || '');
      setFreeCardCount(entry.cardCount);
      setFreeCols(entry.cols || entry.cardCount);
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

  // Clear workspace
  const clearWorkspace = () => {
    if (!window.confirm('현재 작업 영역을 초기화하시겠습니까?')) return;
    if (activeTab === 'daily') {
      setDailyCards(Array(dailyCardCount).fill(null));
      setDailyDate('');
      setDailyMemos({});
      setDailyMorningNote('');
      setDailyEveningNote('');
    } else {
      setFreeQuestion('');
      setFreeCards(Array(freeCardCount).fill(null));
      setFreePrediction('');
      setFreeFeedback('');
    }
  };

  // Get active modal properties
  const activeCardId = activeSlotIndex !== null 
    ? (activeTab === 'daily' ? dailyCards[activeSlotIndex]?.id : freeCards[activeSlotIndex]?.id) 
    : null;

  // Chunked Daily and Free cards
  const dailyRows = chunkCards(dailyCards, dailyCols);
  const freeRows = chunkCards(freeCards, freeCols);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
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
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
              레노먼드 오라클 카드 기록장
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
                background: theme === 'blue-owl' ? 'var(--gold-metallic)' : 'none',
                color: theme === 'blue-owl' ? '#000' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              title="Blue Owl Theme"
            >
              <Moon size={13} />
              Blue
            </button>
            <button
              onClick={() => setTheme('red-owl')}
              style={{
                background: theme === 'red-owl' ? 'var(--gold-metallic)' : 'none',
                color: theme === 'red-owl' ? '#000' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              title="Red Owl Theme"
            >
              <Sparkles size={13} />
              Red
            </button>
            <button
              onClick={() => setTheme('classic-cream')}
              style={{
                background: theme === 'classic-cream' ? 'var(--accent-color)' : 'none',
                color: theme === 'classic-cream' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              title="Classic Cream Theme"
            >
              <Sun size={13} />
              Cream
            </button>
          </div>

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
              fontFamily: 'Cinzel, serif',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              letterSpacing: '0.05em'
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
              fontFamily: 'Cinzel, serif',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              letterSpacing: '0.05em'
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
                    
                    {/* Total Cards Selector (Supports 1-9 AND Grand Tableau) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>총 카드 수:</span>
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

                    {/* Columns Selector (Cards per Row / 포메이션 조절) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>한 줄당 카드 수:</span>
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

                  </div>
                </div>

                {/* Helper info on active Grid alignment */}
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  justifyContent: 'center'
                }}>
                  <Grid size={13} style={{ color: 'var(--text-gold)' }} />
                  <span>
                    포메이션 정보: 총 <b>{dailyCardCount}</b>장의 카드가 가로 <b>{dailyCols}</b>개씩 <b>{Math.ceil(dailyCardCount / dailyCols)}</b>줄로 가운데 정렬 배치됩니다.
                  </span>
                </div>

                {/* Grid of Card Slots (Automatically chunked into Centered Rows!) */}
                <div className="cards-row-container" style={{ padding: '30px 10px' }}>
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
                <button className="gold-button" style={{ height: '36px', padding: '0 16px' }} onClick={punchTime}>
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
                            <span style={{ fontSize: '12px', color: 'var(--text-gold)', fontWeight: 'bold' }}>슬롯 {idx + 1}</span>
                            <span className="serif-font" style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                              {card.id}. {card.nameEn} ({card.nameKo})
                            </span>
                          </div>

                          {/* Recommended Keywords */}
                          <div style={{ 
                            fontSize: '11px', 
                            color: 'var(--text-secondary)', 
                            opacity: 0.6, 
                            fontStyle: 'italic',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Info size={12} />
                            추천 상징: {card.keywords}
                          </div>

                          {/* User custom selected keyword - LARGE */}
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
                  <textarea
                    className="parchment-input"
                    placeholder="하루를 되돌아보고 깨달은 진짜 해석과 반성을 기록해 보세요..."
                    value={dailyEveningNote}
                    onChange={(e) => setDailyEveningNote(e.target.value)}
                  />
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
              <span className="serif-font" style={{ fontSize: '13px', color: 'var(--text-gold)', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
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
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>총 카드 수:</span>
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
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>한 줄당 카드 수:</span>
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

                  </div>
                </div>

                {/* Helper info on active Grid alignment */}
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  justifyContent: 'center'
                }}>
                  <Grid size={13} style={{ color: 'var(--text-gold)' }} />
                  <span>
                    포메이션 정보: 총 <b>{freeCardCount}</b>장의 카드가 가로 <b>{freeCols}</b>개씩 <b>{Math.ceil(freeCardCount / freeCols)}</b>줄로 가운데 정렬 배치됩니다.
                  </span>
                </div>

                {/* Grid of Card Slots (Automatically chunked into Centered Rows!) */}
                <div className="cards-row-container" style={{ padding: '30px 10px' }}>
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
            {/* Header */}
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

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {journals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  아직 저장된 저널 기록이 없습니다.
                </div>
              ) : (
                journals.map((entry) => {
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
                      {/* Top row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span className="symbol-badge" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {entry.type === 'daily' ? '데일리' : '프리 리딩'}
                        </span>
                        <button
                          onClick={(e) => deleteJournal(entry.id, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Title/Date */}
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.type === 'daily' 
                          ? `📅 ${entry.date}`
                          : `❓ ${entry.question}`
                        }
                      </div>

                      {/* Small visual of cards in this record */}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {cardList.map((c, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              fontSize: '11px', 
                              backgroundColor: 'rgba(0,0,0,0.3)', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              border: '1px solid rgba(223,183,108,0.2)',
                              color: c ? 'var(--text-gold)' : 'var(--text-secondary)'
                            }}
                          >
                            {c ? c.nameKo : '빈칸'}
                          </div>
                        ))}
                      </div>

                      {/* Footer time */}
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

    </div>
  );
}
