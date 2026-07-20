import { useMemo, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { LENORMAND_CARDS } from '../constants';

export default function CardSelectModal({ isOpen, onClose, onSelectCard, currentCardId }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCards = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return LENORMAND_CARDS;
    return LENORMAND_CARDS.filter((card) => (
      card.nameEn.toLowerCase().includes(term)
      || card.nameKo.toLowerCase().includes(term)
      || card.id.toString() === term
      || card.keywords.toLowerCase().includes(term)
    ));
  }, [searchTerm]);

  if (!isOpen) return null;

  const choose = (card) => {
    onSelectCard(card);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-content" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label="레노먼드 카드 선택">
        <div className="modal-header">
          <div>
            <span className="eyebrow">THE THIRTY-SIX SYMBOLS</span>
            <h2>카드 선택</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="카드 선택 닫기"><X size={20} /></button>
        </div>
        <div className="card-picker-toolbar">
          <div className="card-picker-search">
            <Search size={16} />
            <input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="이름, 번호, 상징 키워드 검색" />
          </div>
          <button className="paper-button" type="button" onClick={() => choose(null)}><RefreshCw size={14} /> 비우기</button>
        </div>
        <div className="card-picker-grid-wrap">
          {filteredCards.length ? (
            <div className="card-picker-grid">
              {filteredCards.map((card) => (
                <button className={card.id === currentCardId ? 'card-picker-item selected' : 'card-picker-item'} type="button" key={card.id} onClick={() => choose(card)}>
                  <span className="picker-number">{card.id}</span>
                  <img src={card.imgUrl} alt="" loading="lazy" />
                  <strong>{card.nameKo}</strong>
                  <small>{card.nameEn}</small>
                </button>
              ))}
            </div>
          ) : <p className="empty-copy">검색 조건에 맞는 카드가 없습니다.</p>}
        </div>
      </section>
    </div>
  );
}
