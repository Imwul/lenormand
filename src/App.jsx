import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  Calendar,
  Clock,
  Cloud,
  FileDown,
  FileUp,
  Grid3X3,
  History,
  Layers3,
  LogIn,
  LogOut,
  Minus,
  Moon,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { LENORMAND_CARDS, getLenormandCombo } from './constants';
import { auth, db, googleProvider } from './firebase';
import CardSlot from './components/CardSlot';
import CardSelectModal from './components/CardSelectModal';

const MAX_CARDS = 36;

const safeReadJournals = () => {
  try {
    const saved = localStorage.getItem('lenormand_journals');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const safeReadDeletedIds = () => {
  try {
    return JSON.parse(localStorage.getItem('lenormand_deleted_journal_ids') || '[]');
  } catch {
    return [];
  }
};

const resizeCards = (cards, count) => {
  const next = cards.slice(0, count);
  while (next.length < count) next.push(null);
  return next;
};

const rowsForLegacyEntry = (entry) => {
  if (Array.isArray(entry.rows) && entry.rows.length) return entry.rows;
  if (entry.cardCount === 36) return [8, 8, 8, 8, 4];
  const total = entry.cardCount || entry.cards?.length || 3;
  const cols = Math.max(1, entry.cols || total);
  const rows = [];
  let remaining = total;
  while (remaining > 0) {
    rows.push(Math.min(cols, remaining));
    remaining -= cols;
  }
  return rows;
};

const indexedRows = (cards, rows) => {
  let start = 0;
  return rows.map((count) => {
    const result = { start, cards: cards.slice(start, start + count) };
    start += count;
    return result;
  });
};

const makePair = (cards) => {
  const filled = cards.map((card, index) => ({ card, index })).filter(({ card }) => card);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    firstIndex: filled[0]?.index ?? '',
    secondIndex: filled[1]?.index ?? '',
    note: '',
  };
};

const cardFromId = (id) => LENORMAND_CARDS.find((card) => card.id === id) || null;

const mergeJournals = (localEntries = [], cloudEntries = [], deletedIds = []) => {
  const deleted = new Set(deletedIds);
  const byId = new Map();
  [...cloudEntries, ...localEntries].forEach((entry, index) => {
    const key = entry?.id || `legacy-${entry?.timestamp || index}-${JSON.stringify(entry)}`;
    if (!deleted.has(entry?.id)) byId.set(key, entry);
  });
  return [...byId.values()].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
};

function ChoicePills({ label, value, onChange, options }) {
  return (
    <div className="choice-group">
      <span className="choice-label">{label}</span>
      <div className="choice-pills">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            className={value === option.value ? 'choice-pill active' : 'choice-pill'}
            onClick={() => onChange(value === option.value ? '' : option.value)}
          >
            <span aria-hidden="true">{option.symbol}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RowLayoutEditor({ rows, setRows, cards, setCards, onOpenCard, onClearCard, onShuffle, isShuffling }) {
  const total = rows.reduce((sum, count) => sum + count, 0);
  const boardRows = indexedRows(cards, rows);

  const applyRows = (nextRows) => {
    const cleaned = nextRows.map((count) => Math.max(1, Math.min(12, Number(count) || 1)));
    const nextTotal = cleaned.reduce((sum, count) => sum + count, 0);
    if (!cleaned.length || nextTotal > MAX_CARDS) return;
    setRows(cleaned);
    setCards((current) => resizeCards(current, nextTotal));
  };

  const changeRow = (index, delta) => {
    const next = [...rows];
    next[index] += delta;
    applyRows(next);
  };

  const setTotal = (count) => {
    applyRows(count === 36 ? [8, 8, 8, 8, 4] : [count]);
  };

  const presets = [
    { label: '한 줄', rows: [Math.min(total, 12)] },
    { label: '십자 5장', rows: [1, 3, 1] },
    { label: '3 × 3', rows: [3, 3, 3] },
    { label: '그랜드 테블루', rows: [8, 8, 8, 8, 4] },
  ];

  return (
    <section className="ink-panel spread-panel" data-testid="spread-editor">
      <div className="section-heading spread-heading">
        <div>
          <span className="eyebrow">THE FORMATION</span>
          <h2><Layers3 size={20} /> 카드 배치</h2>
        </div>
        <button className="ink-button red" type="button" onClick={onShuffle} disabled={isShuffling}>
          <Sparkles size={15} /> {isShuffling ? '카드를 섞는 중…' : '셔플 & 무작위 뽑기'}
        </button>
      </div>

      <div className="layout-toolbar">
        <label className="field-inline">
          <span>빠른 카드 수</span>
          <select value={total} onChange={(event) => setTotal(Number(event.target.value))}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>{count}장</option>
            ))}
            <option value="36">36장</option>
          </select>
        </label>
        <div className="preset-list" aria-label="카드 배치 프리셋">
          {presets.map((preset) => (
            <button className="paper-button" type="button" key={preset.label} onClick={() => applyRows(preset.rows)}>
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="row-editor" data-testid="row-editor">
        <div className="row-editor-copy">
          <Grid3X3 size={17} />
          <span>각 행의 카드 수를 따로 정할 수 있습니다. 모든 행은 자동으로 가운데 정렬됩니다.</span>
        </div>
        <div className="row-controls">
          {rows.map((count, index) => (
            <div className="row-control" key={`row-${index}`}>
              <span>{index + 1}행</span>
              <button type="button" aria-label={`${index + 1}행 카드 줄이기`} onClick={() => changeRow(index, -1)} disabled={count <= 1}>
                <Minus size={13} />
              </button>
              <strong>{count}</strong>
              <button type="button" aria-label={`${index + 1}행 카드 늘리기`} onClick={() => changeRow(index, 1)} disabled={total >= MAX_CARDS || count >= 12}>
                <Plus size={13} />
              </button>
              {rows.length > 1 && (
                <button className="remove-row" type="button" aria-label={`${index + 1}행 삭제`} onClick={() => applyRows(rows.filter((_, rowIndex) => rowIndex !== index))}>
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
          <button className="paper-button add-row" type="button" onClick={() => applyRows([...rows, 1])} disabled={total >= MAX_CARDS}>
            <Plus size={14} /> 행 추가
          </button>
        </div>
      </div>

      <div className={total === 36 ? 'card-board grand-tableau-grid' : 'card-board'}>
        {boardRows.map((row, rowIndex) => (
          <div className="card-board-row" key={`board-${rowIndex}`} data-row-count={row.cards.length}>
            {row.cards.map((card, columnIndex) => {
              const globalIndex = row.start + columnIndex;
              return (
                <CardSlot
                  key={globalIndex}
                  card={card}
                  index={globalIndex}
                  onSelect={(emptyCard) => emptyCard === null ? onClearCard(globalIndex) : onOpenCard(globalIndex)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function CardKeywordNotes({ cards, memos, setMemos }) {
  const filled = cards.map((card, index) => ({ card, index })).filter(({ card }) => card);
  return (
    <section className="ink-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SYMBOLS & KEYWORDS</span>
          <h2>카드별 키워드 해석</h2>
        </div>
      </div>
      {!filled.length ? (
        <p className="empty-copy">카드를 선택하면 카드별 해석 칸이 나타납니다.</p>
      ) : (
        <div className="keyword-list">
          {filled.map(({ card, index }) => (
            <article className="keyword-card" key={`${card.id}-${index}`}>
              <img src={card.imgUrl} alt="" />
              <div className="keyword-copy">
                <div className="keyword-title">
                  <span>POSITION {index + 1}</span>
                  <strong>{card.id}. {card.nameKo} · {card.nameEn}</strong>
                </div>
                <p>{card.keywords}</p>
                <input
                  className="paper-input keyword-input"
                  value={memos[index] || ''}
                  onChange={(event) => setMemos((current) => ({ ...current, [index]: event.target.value }))}
                  placeholder="이 리딩에서 이 카드가 뜻하는 핵심을 적어보세요."
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PairingNotes({ cards, items, setItems }) {
  const filled = cards.map((card, index) => ({ card, index })).filter(({ card }) => card);
  const update = (id, patch) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const addPair = () => setItems((current) => [...current, makePair(cards)]);

  return (
    <section className="ink-panel pairing-panel" data-testid="pairing-notes">
      <div className="section-heading pairing-heading">
        <div>
          <span className="eyebrow">CARD COMBINATIONS</span>
          <h2>카드 조합 해석</h2>
          <p>위에서 선택한 카드 두 장을 골라, 함께 읽을 때 떠오르는 의미를 자유롭게 기록하세요.</p>
        </div>
        <button className="ink-button" type="button" onClick={addPair} disabled={filled.length < 2}>
          <Plus size={15} /> 조합 추가
        </button>
      </div>

      {!items.length ? (
        <button className="pairing-empty" type="button" onClick={addPair} disabled={filled.length < 2}>
          <Plus size={22} />
          <span>{filled.length < 2 ? '카드를 두 장 이상 선택하면 조합을 기록할 수 있습니다.' : '첫 카드 조합 해석을 추가하세요.'}</span>
        </button>
      ) : (
        <div className="pairing-list">
          {items.map((item, index) => {
            const firstCard = cards[item.firstIndex];
            const secondCard = cards[item.secondIndex];
            const suggestion = firstCard && secondCard ? getLenormandCombo(firstCard, secondCard) : '';
            return (
              <article className="pairing-row" key={item.id}>
                <div className="pairing-number">{String(index + 1).padStart(2, '0')}</div>
                <div className="pairing-fields">
                  <div className="pair-selects">
                    <label>
                      <span>첫 번째 카드</span>
                      <select value={item.firstIndex} onChange={(event) => update(item.id, { firstIndex: event.target.value === '' ? '' : Number(event.target.value) })}>
                        <option value="">카드 선택</option>
                        {filled.map(({ card, index: cardIndex }) => (
                          <option key={`first-${cardIndex}`} value={cardIndex} disabled={cardIndex === item.secondIndex}>
                            {cardIndex + 1}번 · {card.nameKo}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="pair-mark">×</span>
                    <label>
                      <span>두 번째 카드</span>
                      <select value={item.secondIndex} onChange={(event) => update(item.id, { secondIndex: event.target.value === '' ? '' : Number(event.target.value) })}>
                        <option value="">카드 선택</option>
                        {filled.map(({ card, index: cardIndex }) => (
                          <option key={`second-${cardIndex}`} value={cardIndex} disabled={cardIndex === item.firstIndex}>
                            {cardIndex + 1}번 · {card.nameKo}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {suggestion && <p className="combo-suggestion"><strong>참고 해석</strong> {suggestion}</p>}
                  <textarea
                    className="paper-input"
                    value={item.note}
                    onChange={(event) => update(item.id, { note: event.target.value })}
                    placeholder="두 카드가 서로의 의미를 어떻게 바꾸거나 강화하는지 적어보세요."
                  />
                </div>
                <button className="icon-button danger" type="button" aria-label={`${index + 1}번째 조합 삭제`} onClick={() => setItems((current) => current.filter((pair) => pair.id !== item.id))}>
                  <Trash2 size={16} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function HistoryDetail({ entry, currentCardIds, onLoad, onDelete }) {
  const cards = (entry.cards || []).map(cardFromId);
  const period = entry.period === 'night' ? '취침 전 리딩' : '아침 리딩';
  const primary = entry.primaryNote ?? entry.morningNote ?? '';
  const secondary = entry.secondaryNote ?? entry.eveningNote ?? '';
  const combinations = entry.combinations || [];
  const generalMemo = entry.generalMemo || '';

  return (
    <div className="history-detail">
      <div className="history-detail-actions">
        <button className="paper-button" type="button" onClick={() => onLoad(entry)}>이 기록을 작업창에 불러오기</button>
        <button className="icon-button danger" type="button" aria-label="기록 삭제" onClick={() => onDelete(entry.id)}><Trash2 size={16} /></button>
      </div>
      <div className="history-detail-title">
        <span className="eyebrow">{entry.type === 'daily' ? period : 'FREE READING'}</span>
        <h3>{entry.type === 'daily' ? entry.date : entry.question}</h3>
        <small>{entry.timestamp}</small>
      </div>
      <div className="history-card-strip">
        {cards.map((card, index) => card ? (
          <div className={currentCardIds.has(card.id) ? 'history-card-chip match' : 'history-card-chip'} key={`${card.id}-${index}`}>
            <img src={card.imgUrl} alt="" />
            <span>{index + 1}. {card.nameKo}</span>
          </div>
        ) : null)}
      </div>
      {Object.keys(entry.memos || {}).length > 0 && (
        <div className="history-note-block">
          <strong>카드별 키워드</strong>
          {Object.entries(entry.memos).map(([index, note]) => note ? <p key={index}><b>{Number(index) + 1}번</b> {note}</p> : null)}
        </div>
      )}
      {entry.type === 'daily' ? (
        <>
          {primary && <div className="history-note-block"><strong>{entry.period === 'night' ? '오늘의 인상적인 장면' : '아침의 예측'}</strong><p>{primary}</p></div>}
          {secondary && <div className="history-note-block"><strong>{entry.period === 'night' ? '카드와 하루의 일치도' : '하루 회고'}</strong><p>{secondary}</p></div>}
        </>
      ) : (
        <>
          {entry.prediction && <div className="history-note-block"><strong>스프레드 해석</strong><p>{entry.prediction}</p></div>}
          {entry.feedback && <div className="history-note-block"><strong>결과와 피드백</strong><p>{entry.feedback}</p></div>}
        </>
      )}
      {combinations.filter((pair) => pair.note).length > 0 && (
        <div className="history-note-block">
          <strong>카드 조합 해석</strong>
          {combinations.map((pair, index) => pair.note ? (
            <p key={pair.id || index}>
              <b>{cards[pair.firstIndex]?.nameKo || '?'} × {cards[pair.secondIndex]?.nameKo || '?'}</b> {pair.note}
            </p>
          ) : null)}
        </div>
      )}
      {generalMemo && <div className="history-note-block"><strong>자유 메모</strong><p>{generalMemo}</p></div>}
    </div>
  );
}

function HistoryDrawer({ open, onClose, journals, currentCards, onLoad, onDelete }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [sameCardOnly, setSameCardOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const currentCardIds = useMemo(() => new Set(currentCards.filter(Boolean).map((card) => card.id)), [currentCards]);

  const records = useMemo(() => journals.map((entry) => {
    const ids = new Set((entry.cards || []).filter(Boolean));
    const overlap = [...currentCardIds].filter((id) => ids.has(id));
    return { entry, overlap };
  }).filter(({ entry, overlap }) => {
    if (type !== 'all' && entry.type !== type) return false;
    if (sameCardOnly && currentCardIds.size > 0 && overlap.length === 0) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    const cardText = (entry.cards || []).map(cardFromId).filter(Boolean).map((card) => `${card.nameKo} ${card.nameEn} ${card.keywords}`).join(' ');
    const text = [entry.date, entry.question, entry.primaryNote, entry.secondaryNote, entry.morningNote, entry.eveningNote, entry.prediction, entry.feedback, entry.generalMemo, cardText, ...(entry.combinations || []).map((pair) => pair.note)].join(' ').toLowerCase();
    return text.includes(needle);
  }).sort((a, b) => b.overlap.length - a.overlap.length), [journals, currentCardIds, query, type, sameCardOnly]);

  const selected = journals.find((entry) => entry.id === selectedId);
  const matchingCount = records.filter(({ overlap }) => overlap.length > 0).length;

  return (
    <aside className={open ? 'history-drawer open' : 'history-drawer'} aria-hidden={!open} data-testid="history-drawer">
      <div className="drawer-header">
        <div>
          <span className="eyebrow">VISIBLE MEMORY</span>
          <h2><History size={19} /> 과거 기록 비교</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="과거 기록 닫기"><X size={20} /></button>
      </div>
      <p className="drawer-intro">작업창을 그대로 둔 채 이전 해석을 펼쳐 비교할 수 있습니다.</p>
      <div className="history-search">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="카드, 날짜, 질문, 메모 검색" />
      </div>
      <div className="history-filters">
        {[
          ['all', '전체'],
          ['daily', '데일리'],
          ['free', '프리'],
        ].map(([value, label]) => (
          <button type="button" key={value} className={type === value ? 'active' : ''} onClick={() => setType(value)}>{label}</button>
        ))}
      </div>
      <label className="match-toggle">
        <input type="checkbox" checked={sameCardOnly} onChange={(event) => setSameCardOnly(event.target.checked)} disabled={!currentCardIds.size} />
        <span>현재 카드와 겹치는 기록만 보기</span>
        <b>{currentCardIds.size ? matchingCount : 0}</b>
      </label>

      <div className="history-scroll">
        {selected ? (
          <>
            <button className="back-to-list" type="button" onClick={() => setSelectedId(null)}>← 기록 목록으로</button>
            <HistoryDetail entry={selected} currentCardIds={currentCardIds} onLoad={onLoad} onDelete={(id) => { onDelete(id); setSelectedId(null); }} />
          </>
        ) : records.length ? (
          <div className="history-list">
            {records.map(({ entry, overlap }) => {
              const cards = (entry.cards || []).map(cardFromId).filter(Boolean);
              return (
                <button className="history-record" type="button" key={entry.id} onClick={() => setSelectedId(entry.id)}>
                  <div className="history-record-top">
                    <span>{entry.type === 'daily' ? (entry.period === 'night' ? '취침 전' : '데일리') : '프리 리딩'}</span>
                    {overlap.length > 0 && <b>{overlap.length}장 일치</b>}
                  </div>
                  <strong>{entry.type === 'daily' ? entry.date : entry.question}</strong>
                  <div className="mini-card-list">
                    {cards.slice(0, 7).map((card, index) => (
                      <span className={currentCardIds.has(card.id) ? 'match' : ''} key={`${card.id}-${index}`}>{card.nameKo}</span>
                    ))}
                    {cards.length > 7 && <span>+{cards.length - 7}</span>}
                  </div>
                  <small>{entry.timestamp}</small>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="empty-copy">조건에 맞는 기록이 없습니다.</p>
        )}
      </div>
    </aside>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('daily');
  const [dailyPeriod, setDailyPeriod] = useState('morning');
  const [dailyDate, setDailyDate] = useState('');
  const [dailyRows, setDailyRows] = useState([3]);
  const [dailyCards, setDailyCards] = useState([null, null, null]);
  const [dailyMemos, setDailyMemos] = useState({});
  const [dailyCombinations, setDailyCombinations] = useState([]);
  const [dailyPrimaryNote, setDailyPrimaryNote] = useState('');
  const [dailySecondaryNote, setDailySecondaryNote] = useState('');
  const [dailyGeneralMemo, setDailyGeneralMemo] = useState('');
  const [dailyMood, setDailyMood] = useState('');
  const [dailySatisfaction, setDailySatisfaction] = useState('');

  const [freeQuestion, setFreeQuestion] = useState('');
  const [freeRows, setFreeRows] = useState([3]);
  const [freeCards, setFreeCards] = useState([null, null, null]);
  const [freeMemos, setFreeMemos] = useState({});
  const [freeCombinations, setFreeCombinations] = useState([]);
  const [freePrediction, setFreePrediction] = useState('');
  const [freeFeedback, setFreeFeedback] = useState('');
  const [freeGeneralMemo, setFreeGeneralMemo] = useState('');

  const [journals, setJournals] = useState(safeReadJournals);
  const [deletedJournalIds, setDeletedJournalIds] = useState(safeReadDeletedIds);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [isShufflingDaily, setIsShufflingDaily] = useState(false);
  const [isShufflingFree, setIsShufflingFree] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [isAutoSync, setIsAutoSync] = useState(() => {
    const stored = localStorage.getItem('is_auto_sync');
    return stored === null ? true : stored === 'true';
  });
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncMessage, setSyncMessage] = useState('로그인하면 기기 간 기록을 동기화합니다.');
  const [syncReady, setSyncReady] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(() => localStorage.getItem('last_synced_time') || '');
  const [saveNotice, setSaveNotice] = useState('');
  const journalsRef = useRef(journals);
  const deletedJournalIdsRef = useRef(deletedJournalIds);
  const lastWrittenPayloadRef = useRef('');

  const currentCards = activeTab === 'daily' ? dailyCards : freeCards;
  const currentCard = activeSlotIndex === null ? null : currentCards[activeSlotIndex];

  useEffect(() => {
    document.body.className = 'theme-archive';
    localStorage.removeItem('lenormand_theme');
  }, []);

  useEffect(() => {
    journalsRef.current = journals;
    localStorage.setItem('lenormand_journals', JSON.stringify(journals));
  }, [journals]);

  useEffect(() => {
    deletedJournalIdsRef.current = deletedJournalIds;
    localStorage.setItem('lenormand_deleted_journal_ids', JSON.stringify(deletedJournalIds));
  }, [deletedJournalIds]);

  useEffect(() => {
    localStorage.setItem('is_auto_sync', String(isAutoSync));
  }, [isAutoSync]);

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (user) => {
      setGoogleUser(user);
      setSyncReady(false);
      if (!user) {
        setSyncStatus('idle');
        setSyncMessage('로그인하면 기기 간 기록을 동기화합니다.');
      }
    });
  }, []);

  useEffect(() => {
    if (!googleUser || !db) return undefined;
    let cancelled = false;
    const connectCloud = async () => {
      try {
        setSyncStatus('syncing');
        setSyncMessage('클라우드 기록을 안전하게 합치는 중…');
        const cloudRef = doc(db, 'saves', googleUser.uid);
        const snapshot = await getDoc(cloudRef);
        const cloudPayload = snapshot.exists() ? snapshot.data().lenormand_journals : '';
        const cloudDeletedIds = snapshot.exists() ? (snapshot.data().lenormand_deletedIds || []) : [];
        const mergedDeletedIds = [...new Set([...deletedJournalIdsRef.current, ...cloudDeletedIds])];
        const cloudEntries = cloudPayload ? JSON.parse(cloudPayload) : [];
        const merged = mergeJournals(journalsRef.current, cloudEntries, mergedDeletedIds);
        const mergedPayload = JSON.stringify(merged);
        if (cancelled) return;
        if (mergedPayload !== JSON.stringify(journalsRef.current)) setJournals(merged);
        if (JSON.stringify(mergedDeletedIds) !== JSON.stringify(deletedJournalIdsRef.current)) setDeletedJournalIds(mergedDeletedIds);
        const now = new Date().toISOString();
        await setDoc(cloudRef, { lenormand_journals: mergedPayload, lenormand_deletedIds: mergedDeletedIds, lenormand_updatedAt: now }, { merge: true });
        if (cancelled) return;
        lastWrittenPayloadRef.current = mergedPayload;
        const label = new Date(now).toLocaleString();
        setLastSyncedTime(label);
        localStorage.setItem('last_synced_time', label);
        setSyncReady(true);
        setSyncStatus('synced');
        setSyncMessage(`${merged.length}개의 기록이 최신 상태입니다.`);
      } catch (error) {
        if (cancelled) return;
        setSyncStatus('error');
        setSyncMessage(`동기화 연결 실패: ${error.message}`);
      }
    };
    connectCloud();
    return () => { cancelled = true; };
  }, [googleUser]);

  useEffect(() => {
    if (!googleUser || !db || !syncReady) return undefined;
    const cloudRef = doc(db, 'saves', googleUser.uid);
    return onSnapshot(cloudRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const cloudPayload = snapshot.data().lenormand_journals || '[]';
      const cloudDeletedIds = snapshot.data().lenormand_deletedIds || [];
      const mergedDeletedIds = [...new Set([...deletedJournalIdsRef.current, ...cloudDeletedIds])];
      if (cloudPayload === lastWrittenPayloadRef.current && JSON.stringify(mergedDeletedIds) === JSON.stringify(deletedJournalIdsRef.current)) return;
      try {
        const merged = mergeJournals(journalsRef.current, JSON.parse(cloudPayload), mergedDeletedIds);
        const mergedPayload = JSON.stringify(merged);
        lastWrittenPayloadRef.current = cloudPayload;
        if (JSON.stringify(mergedDeletedIds) !== JSON.stringify(deletedJournalIdsRef.current)) setDeletedJournalIds(mergedDeletedIds);
        if (mergedPayload !== JSON.stringify(journalsRef.current)) setJournals(merged);
        setSyncStatus('synced');
        setSyncMessage('다른 기기의 변경 사항을 반영했습니다.');
      } catch (error) {
        setSyncStatus('error');
        setSyncMessage(`클라우드 기록을 읽지 못했습니다: ${error.message}`);
      }
    }, (error) => {
      setSyncStatus('error');
      setSyncMessage(`실시간 동기화 오류: ${error.message}`);
    });
  }, [googleUser, syncReady]);

  useEffect(() => {
    if (!isAutoSync || !googleUser || !db || !syncReady) return undefined;
    const payload = JSON.stringify(mergeJournals(journals, [], deletedJournalIds));
    if (payload === lastWrittenPayloadRef.current && !deletedJournalIds.length) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        setSyncStatus('syncing');
        setSyncMessage('변경 사항을 저장하는 중…');
        const now = new Date().toISOString();
        await setDoc(doc(db, 'saves', googleUser.uid), { lenormand_journals: payload, lenormand_deletedIds: deletedJournalIds, lenormand_updatedAt: now }, { merge: true });
        lastWrittenPayloadRef.current = payload;
        const label = new Date(now).toLocaleString();
        setLastSyncedTime(label);
        localStorage.setItem('last_synced_time', label);
        setSyncStatus('synced');
        setSyncMessage(`${journals.length}개의 기록이 최신 상태입니다.`);
      } catch (error) {
        setSyncStatus('error');
        setSyncMessage(`자동 저장 실패: ${error.message}`);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [journals, deletedJournalIds, isAutoSync, googleUser, syncReady]);

  const openCard = (index) => {
    setActiveSlotIndex(index);
    setIsModalOpen(true);
  };

  const clearCard = (index, mode) => {
    const setCards = mode === 'daily' ? setDailyCards : setFreeCards;
    const setMemos = mode === 'daily' ? setDailyMemos : setFreeMemos;
    const setCombinations = mode === 'daily' ? setDailyCombinations : setFreeCombinations;
    setCards((cards) => cards.map((card, cardIndex) => cardIndex === index ? null : card));
    setMemos((memos) => {
      const next = { ...memos };
      delete next[index];
      return next;
    });
    setCombinations((pairs) => pairs.filter((pair) => pair.firstIndex !== index && pair.secondIndex !== index));
  };

  const selectCard = (card) => {
    if (activeSlotIndex === null) return;
    const setCards = activeTab === 'daily' ? setDailyCards : setFreeCards;
    setCards((cards) => cards.map((current, index) => index === activeSlotIndex ? card : current));
  };

  const shuffle = (mode) => {
    const cards = mode === 'daily' ? dailyCards : freeCards;
    const setCards = mode === 'daily' ? setDailyCards : setFreeCards;
    const setBusy = mode === 'daily' ? setIsShufflingDaily : setIsShufflingFree;
    setBusy(true);
    const shuffled = [...LENORMAND_CARDS].sort(() => Math.random() - 0.5).slice(0, cards.length);
    window.setTimeout(() => {
      setCards(shuffled);
      setBusy(false);
    }, 260);
  };

  const stampTime = () => {
    const now = new Date();
    const date = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(now);
    setDailyDate(date);
  };

  const saveJournal = () => {
    const timestamp = new Date().toLocaleString();
    if (activeTab === 'daily') {
      const hasContent = dailyCards.some(Boolean) || dailyPrimaryNote || dailySecondaryNote || dailyGeneralMemo;
      if (!hasContent) return window.alert('저장할 카드나 메모가 없습니다.');
      const entry = {
        id: Date.now().toString(),
        timestamp,
        type: 'daily',
        period: dailyPeriod,
        date: dailyDate || new Date().toLocaleString(),
        cardCount: dailyCards.length,
        rows: dailyRows,
        cols: Math.max(...dailyRows),
        cards: dailyCards.map((card) => card?.id || null),
        memos: dailyMemos,
        combinations: dailyCombinations,
        primaryNote: dailyPrimaryNote,
        secondaryNote: dailySecondaryNote,
        morningNote: dailyPrimaryNote,
        eveningNote: dailySecondaryNote,
        generalMemo: dailyGeneralMemo,
        mood: dailyMood,
        satisfaction: dailySatisfaction,
      };
      setJournals((current) => [entry, ...current]);
    } else {
      const hasContent = freeCards.some(Boolean) || freeQuestion || freePrediction || freeFeedback || freeGeneralMemo;
      if (!hasContent) return window.alert('저장할 카드나 메모가 없습니다.');
      const entry = {
        id: Date.now().toString(),
        timestamp,
        type: 'free',
        question: freeQuestion || '무제 질문',
        cardCount: freeCards.length,
        rows: freeRows,
        cols: Math.max(...freeRows),
        cards: freeCards.map((card) => card?.id || null),
        memos: freeMemos,
        combinations: freeCombinations,
        prediction: freePrediction,
        feedback: freeFeedback,
        generalMemo: freeGeneralMemo,
      };
      setJournals((current) => [entry, ...current]);
    }
    setSaveNotice('기록을 저장했습니다. 오른쪽 과거 기록에서 바로 비교할 수 있습니다.');
  };

  const loadJournal = (entry) => {
    if (!window.confirm('현재 작성 중인 내용을 이 과거 기록으로 바꿀까요?')) return;
    const cards = (entry.cards || []).map(cardFromId);
    if (entry.type === 'daily') {
      setActiveTab('daily');
      setDailyPeriod(entry.period || 'morning');
      setDailyDate(entry.date || '');
      setDailyRows(rowsForLegacyEntry(entry));
      setDailyCards(cards);
      setDailyMemos(entry.memos || {});
      setDailyCombinations(entry.combinations || []);
      setDailyPrimaryNote(entry.primaryNote ?? entry.morningNote ?? '');
      setDailySecondaryNote(entry.secondaryNote ?? entry.eveningNote ?? '');
      setDailyGeneralMemo(entry.generalMemo || '');
      setDailyMood(entry.mood || '');
      setDailySatisfaction(entry.satisfaction || '');
    } else {
      setActiveTab('free');
      setFreeQuestion(entry.question || '');
      setFreeRows(rowsForLegacyEntry(entry));
      setFreeCards(cards);
      setFreeMemos(entry.memos || {});
      setFreeCombinations(entry.combinations || []);
      setFreePrediction(entry.prediction || '');
      setFreeFeedback(entry.feedback || '');
      setFreeGeneralMemo(entry.generalMemo || '');
    }
  };

  const deleteJournal = (id) => {
    if (window.confirm('이 기록을 삭제할까요?')) {
      setJournals((current) => current.filter((entry) => entry.id !== id));
      setDeletedJournalIds((current) => current.includes(id) ? current : [...current, id]);
    }
  };

  const clearWorkspace = () => {
    if (!window.confirm('현재 작업창의 내용을 모두 비울까요?')) return;
    if (activeTab === 'daily') {
      setDailyCards(Array(dailyRows.reduce((sum, count) => sum + count, 0)).fill(null));
      setDailyDate('');
      setDailyMemos({});
      setDailyCombinations([]);
      setDailyPrimaryNote('');
      setDailySecondaryNote('');
      setDailyGeneralMemo('');
      setDailyMood('');
      setDailySatisfaction('');
    } else {
      setFreeQuestion('');
      setFreeCards(Array(freeRows.reduce((sum, count) => sum + count, 0)).fill(null));
      setFreeMemos({});
      setFreeCombinations([]);
      setFreePrediction('');
      setFreeFeedback('');
      setFreeGeneralMemo('');
    }
  };

  const login = async () => {
    try {
      setSyncStatus('syncing');
      setSyncMessage('구글 로그인 창을 여는 중…');
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setSyncStatus('error');
      const message = error.code === 'auth/unauthorized-domain'
        ? '현재 사이트 주소가 Firebase 승인 도메인에 등록되지 않았습니다.'
        : error.message;
      setSyncMessage(`로그인 실패: ${message}`);
      window.alert(`로그인에 실패했습니다: ${message}`);
    }
  };

  const logout = async () => {
    await signOut(auth);
    lastWrittenPayloadRef.current = '';
  };

  const syncToCloud = async () => {
    if (!googleUser || !db) return window.alert('먼저 구글 계정으로 로그인해 주세요.');
    try {
      setSyncStatus('syncing');
      setSyncMessage('현재 기록을 클라우드에 올리는 중…');
      const now = new Date().toISOString();
      const payload = JSON.stringify(journals);
      await setDoc(doc(db, 'saves', googleUser.uid), { lenormand_journals: payload, lenormand_deletedIds: deletedJournalIds, lenormand_updatedAt: now }, { merge: true });
      lastWrittenPayloadRef.current = payload;
      const label = new Date(now).toLocaleString();
      setLastSyncedTime(label);
      localStorage.setItem('last_synced_time', label);
      setSyncStatus('synced');
      setSyncMessage(`${journals.length}개의 기록을 백업했습니다.`);
      window.alert('현재 기록을 클라우드에 백업했습니다.');
    } catch (error) {
      setSyncStatus('error');
      window.alert(`동기화에 실패했습니다: ${error.message}`);
    }
  };

  const restoreFromCloud = async () => {
    if (!googleUser || !db) return window.alert('먼저 구글 계정으로 로그인해 주세요.');
    if (!window.confirm('클라우드 기록으로 현재 기록 목록을 바꿀까요?')) return;
    try {
      const snapshot = await getDoc(doc(db, 'saves', googleUser.uid));
      if (!snapshot.exists() || !snapshot.data().lenormand_journals) return window.alert('클라우드 백업이 없습니다.');
      const cloudDeletedIds = snapshot.data().lenormand_deletedIds || [];
      setDeletedJournalIds(cloudDeletedIds);
      setJournals(mergeJournals([], JSON.parse(snapshot.data().lenormand_journals), cloudDeletedIds));
      setSyncStatus('synced');
      setSyncMessage('클라우드 백업을 불러왔습니다.');
    } catch (error) {
      setSyncStatus('error');
      window.alert(`불러오기에 실패했습니다: ${error.message}`);
    }
  };

  const exportData = () => {
    const href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(journals, null, 2))}`;
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `lenormand-journal-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
  };

  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('형식 오류');
        if (window.confirm('가져온 기록으로 현재 기록 목록을 바꿀까요?')) setJournals(data);
      } catch {
        window.alert('올바른 레노먼드 기록 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
  };

  const morningMode = dailyPeriod === 'morning';

  return (
    <div className={isHistoryOpen ? 'app-shell history-open' : 'app-shell'}>
      <header className="site-header">
        <div className="brand-block">
          <div className="brand-seal"><BookMarked size={25} /></div>
          <div>
            <span className="brand-kicker">AD QUAERENDUM · 기록하고 다시 묻기</span>
            <h1>Lenormand Journal</h1>
          </div>
        </div>
        <div className="header-actions">
          {googleUser ? (
            <button className="paper-button sync-chip" type="button" onClick={() => setIsSettingsOpen(true)} data-testid="cloud-account-button">
              <span className={`sync-dot ${syncStatus}`} aria-hidden="true" />
              <Cloud size={15} />
              <span>{googleUser.displayName || googleUser.email}</span>
              <small>{syncStatus === 'syncing' ? '동기화 중' : syncStatus === 'error' ? '확인 필요' : '동기화됨'}</small>
            </button>
          ) : (
            <button className="paper-button google-login" type="button" onClick={login} data-testid="google-login-button">
              <LogIn size={15} /> 구글 로그인 · 동기화
            </button>
          )}
          <button className="paper-button settings-trigger" type="button" onClick={() => setIsSettingsOpen(true)}><Settings size={15} /> 설정</button>
          <button className={isHistoryOpen ? 'ink-button active' : 'ink-button'} type="button" onClick={() => setIsHistoryOpen((open) => !open)} data-testid="history-toggle">
            <History size={16} /> 과거 기록 {journals.length}
          </button>
          <button className="paper-button danger-text" type="button" onClick={clearWorkspace}>작업창 비우기</button>
        </div>
      </header>

      <main className="main-content">
        <section className="hero-intro">
          <div className="hero-mark">✦</div>
          <div>
            <span className="eyebrow">A PRIVATE ARCHIVE OF SIGNS</span>
            <h2>카드를 뽑고, 삶에서 되풀이되는 상징을 기록하세요.</h2>
            <p>오늘의 해석과 과거의 같은 카드를 한 화면에서 나란히 읽는 개인 레노먼드 아카이브.</p>
          </div>
        </section>

        <nav className="reading-tabs" aria-label="리딩 종류">
          <button type="button" className={activeTab === 'daily' ? 'active' : ''} onClick={() => setActiveTab('daily')}>
            <span>01</span><strong>Daily Reading</strong><small>데일리 리딩</small>
          </button>
          <button type="button" className={activeTab === 'free' ? 'active' : ''} onClick={() => setActiveTab('free')}>
            <span>02</span><strong>Free Reading</strong><small>프리 리딩</small>
          </button>
        </nav>

        {activeTab === 'daily' ? (
          <div className="workspace-stack" data-testid="daily-workspace">
            <section className="period-switch ink-panel">
              <div>
                <span className="eyebrow">WHEN ARE YOU READING?</span>
                <h2>이 리딩을 언제 보고 있나요?</h2>
                <p>시간대를 고르면 하루 기록의 질문과 순서가 자연스럽게 바뀝니다.</p>
              </div>
              <div className="period-options">
                <button type="button" className={morningMode ? 'active' : ''} onClick={() => setDailyPeriod('morning')} data-testid="period-morning">
                  <Sun size={20} /><strong>아침에</strong><span>오늘의 흐름을 먼저 읽어요</span>
                </button>
                <button type="button" className={!morningMode ? 'active' : ''} onClick={() => setDailyPeriod('night')} data-testid="period-night">
                  <Moon size={20} /><strong>자기 전에</strong><span>지나온 하루와 카드를 맞춰봐요</span>
                </button>
              </div>
            </section>

            <section className="date-strip">
              <Calendar size={17} />
              <label htmlFor="reading-date">리딩 날짜와 시간</label>
              <input id="reading-date" value={dailyDate} onChange={(event) => setDailyDate(event.target.value)} placeholder="날짜와 시간을 적어주세요" />
              <button className="paper-button" type="button" onClick={stampTime}><Clock size={14} /> 지금</button>
            </section>

            <RowLayoutEditor
              rows={dailyRows}
              setRows={setDailyRows}
              cards={dailyCards}
              setCards={setDailyCards}
              onOpenCard={openCard}
              onClearCard={(index) => clearCard(index, 'daily')}
              onShuffle={() => shuffle('daily')}
              isShuffling={isShufflingDaily}
            />
            <CardKeywordNotes cards={dailyCards} memos={dailyMemos} setMemos={setDailyMemos} />
            <PairingNotes cards={dailyCards} items={dailyCombinations} setItems={setDailyCombinations} />

            <section className="daily-notes-grid">
              <article className="ink-panel note-panel">
                <span className="eyebrow">{morningMode ? 'MORNING FORECAST' : 'THE DAY REMEMBERED'}</span>
                <h2>{morningMode ? '오늘의 흐름을 어떻게 예상하나요?' : '오늘 하루의 가장 인상적인 장면은 무엇이었나요?'}</h2>
                <p>{morningMode ? '카드 사이의 연결을 따라 오늘 펼쳐질 분위기와 가능성을 적어보세요.' : '마음에 오래 남은 사건이나 감정부터 적고, 어떤 카드와 이어지는지 살펴보세요.'}</p>
                {!morningMode && (
                  <ChoicePills
                    label="하루의 기분"
                    value={dailyMood}
                    onChange={setDailyMood}
                    options={[
                      { value: 'good', symbol: '●', label: '좋았어요' },
                      { value: 'normal', symbol: '◐', label: '무난했어요' },
                      { value: 'bad', symbol: '○', label: '힘들었어요' },
                    ]}
                  />
                )}
                <textarea className="paper-input tall" value={dailyPrimaryNote} onChange={(event) => setDailyPrimaryNote(event.target.value)} placeholder={morningMode ? '오늘의 흐름과 예상되는 장면을 적어보세요.' : '오늘 하루 중 오래 남은 장면을 적어보세요.'} />
              </article>
              <article className="ink-panel note-panel">
                <span className="eyebrow">{morningMode ? 'EVENING RETURN' : 'READING REVIEW'}</span>
                <h2>{morningMode ? '하루가 지난 뒤, 카드는 어떻게 현실이 되었나요?' : '카드는 오늘의 경험을 얼마나 잘 비추었나요?'}</h2>
                <p>{morningMode ? '나중에 돌아와 실제 사건과 아침의 해석을 비교해 보세요.' : '처음 보이지 않았던 카드의 의미와 리딩에 대한 만족도를 함께 남겨보세요.'}</p>
                <ChoicePills
                  label="리딩 만족도"
                  value={dailySatisfaction}
                  onChange={setDailySatisfaction}
                  options={[
                    { value: 'good', symbol: '◎', label: '잘 맞았어요' },
                    { value: 'normal', symbol: '△', label: '일부 맞았어요' },
                    { value: 'bad', symbol: '×', label: '다시 볼래요' },
                  ]}
                />
                <textarea className="paper-input tall" value={dailySecondaryNote} onChange={(event) => setDailySecondaryNote(event.target.value)} placeholder={morningMode ? '실제로 펼쳐진 일과 새롭게 알게 된 해석을 적어보세요.' : '카드와 하루가 맞닿은 지점, 아쉬웠던 해석을 적어보세요.'} />
              </article>
            </section>

            <section className="ink-panel memo-panel">
              <span className="eyebrow">MARGINALIA</span>
              <h2>자유 메모</h2>
              <p>정해진 질문에 들어맞지 않는 생각, 꿈, 우연, 나중에 확인할 단서를 자유롭게 남겨두세요.</p>
              <textarea className="paper-input tall" value={dailyGeneralMemo} onChange={(event) => setDailyGeneralMemo(event.target.value)} placeholder="떠오르는 것을 형식 없이 적어보세요." />
            </section>

            <div className="save-row">
              <button className="ink-button red large" type="button" onClick={saveJournal}><Save size={18} /> 데일리 리딩 저장</button>
              {saveNotice && <span className="save-notice" role="status">{saveNotice}</span>}
            </div>
          </div>
        ) : (
          <div className="workspace-stack" data-testid="free-workspace">
            <section className="inquiry-panel ink-panel">
              <span className="eyebrow">THE INQUIRY</span>
              <label htmlFor="free-question">무엇을 묻고 싶나요?</label>
              <input id="free-question" value={freeQuestion} onChange={(event) => setFreeQuestion(event.target.value)} placeholder="질문을 한 문장으로 적어보세요." />
            </section>
            <RowLayoutEditor
              rows={freeRows}
              setRows={setFreeRows}
              cards={freeCards}
              setCards={setFreeCards}
              onOpenCard={openCard}
              onClearCard={(index) => clearCard(index, 'free')}
              onShuffle={() => shuffle('free')}
              isShuffling={isShufflingFree}
            />
            <CardKeywordNotes cards={freeCards} memos={freeMemos} setMemos={setFreeMemos} />
            <PairingNotes cards={freeCards} items={freeCombinations} setItems={setFreeCombinations} />
            <section className="daily-notes-grid">
              <article className="ink-panel note-panel">
                <span className="eyebrow">INTERPRETATION</span>
                <h2>나의 스프레드 해석</h2>
                <p>질문, 카드의 위치, 조합을 한 흐름으로 묶어 답을 적어보세요.</p>
                <textarea className="paper-input tall" value={freePrediction} onChange={(event) => setFreePrediction(event.target.value)} placeholder="리딩에서 읽은 답과 앞으로의 가능성을 적어보세요." />
              </article>
              <article className="ink-panel note-panel">
                <span className="eyebrow">AFTERWARDS</span>
                <h2>결과와 피드백</h2>
                <p>시간이 지난 뒤 실제 결과와 처음의 해석을 비교해 보세요.</p>
                <textarea className="paper-input tall" value={freeFeedback} onChange={(event) => setFreeFeedback(event.target.value)} placeholder="무엇이 맞았고 무엇을 새롭게 이해했는지 적어보세요." />
              </article>
            </section>
            <section className="ink-panel memo-panel">
              <span className="eyebrow">MARGINALIA</span>
              <h2>자유 메모</h2>
              <p>질문과 직접 관계없어 보여도 남겨둘 가치가 있는 생각과 단서를 기록하세요.</p>
              <textarea className="paper-input tall" value={freeGeneralMemo} onChange={(event) => setFreeGeneralMemo(event.target.value)} placeholder="떠오르는 것을 형식 없이 적어보세요." />
            </section>
            <div className="save-row">
              <button className="ink-button red large" type="button" onClick={saveJournal}><Save size={18} /> 프리 리딩 저장</button>
              {saveNotice && <span className="save-notice" role="status">{saveNotice}</span>}
            </div>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <strong>Lenormand Journal · Private Reading Archive</strong>
        <span>E quindi uscimmo a riveder le stelle.</span>
      </footer>

      <HistoryDrawer
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        journals={journals}
        currentCards={currentCards}
        onLoad={loadJournal}
        onDelete={deleteJournal}
      />

      <CardSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectCard={selectCard}
        currentCardId={currentCard?.id || null}
      />

      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <section className="modal-content settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><span className="eyebrow">ARCHIVE MANAGEMENT</span><h2>설정 및 데이터 관리</h2></div>
              <button className="icon-button" type="button" onClick={() => setIsSettingsOpen(false)}><X size={20} /></button>
            </div>
            <div className="settings-body">
              <section>
                <h3>클라우드 동기화</h3>
                {googleUser ? (
                  <>
                    <p><Cloud size={15} /> {googleUser.email}</p>
                    <p className="muted">{syncMessage}{lastSyncedTime ? ` · 최근 ${lastSyncedTime}` : ''}</p>
                    <label className="checkbox-line"><input type="checkbox" checked={isAutoSync} onChange={(event) => setIsAutoSync(event.target.checked)} /> 기록 변경 시 자동 백업</label>
                    <div className="settings-actions">
                      <button className="ink-button" type="button" onClick={syncToCloud}>지금 올리기</button>
                      <button className="paper-button" type="button" onClick={restoreFromCloud}>백업 불러오기</button>
                      <button className="paper-button" type="button" onClick={logout}><LogOut size={14} /> 로그아웃</button>
                    </div>
                  </>
                ) : (
                  <button className="ink-button" type="button" onClick={login}><LogIn size={15} /> 구글 계정으로 로그인</button>
                )}
              </section>
              <section>
                <h3>기록 파일</h3>
                <p className="muted">모든 과거 기록을 JSON 파일로 보관하거나 다시 가져올 수 있습니다.</p>
                <div className="settings-actions">
                  <button className="ink-button" type="button" onClick={exportData}><FileDown size={15} /> 내보내기</button>
                  <label className="paper-button file-button"><FileUp size={15} /> 가져오기<input type="file" accept=".json" onChange={importData} /></label>
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
