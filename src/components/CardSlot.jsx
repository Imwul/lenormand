import { Edit2, Trash2 } from 'lucide-react';

export default function CardSlot({ card, index, onSelect }) {
  const clearCard = (event) => {
    event.stopPropagation();
    onSelect(null);
  };

  const changeCard = (event) => {
    event.stopPropagation();
    onSelect();
  };

  return (
    <div className="card-slot-outer" onClick={() => onSelect()} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onSelect()} aria-label={card ? `${index + 1}번 ${card.nameKo} 카드 변경` : `${index + 1}번 카드 선택`}>
      <div className="card-slot-inner">
        {card ? (
          <div className="card-face card-front">
            <span className="card-index">{index + 1}</span>
            <img src={card.imgUrl} alt={`${card.id}. ${card.nameEn} (${card.nameKo})`} />
            <div className="card-actions">
              <button type="button" onClick={changeCard} title="카드 변경" aria-label="카드 변경"><Edit2 size={16} /></button>
              <button className="danger" type="button" onClick={clearCard} title="카드 비우기" aria-label="카드 비우기"><Trash2 size={16} /></button>
            </div>
          </div>
        ) : (
          <div className="card-face card-back-placeholder">
            <span className="card-index">{index + 1}</span>
            <span className="card-back-symbol" aria-hidden="true">✦</span>
            <strong>POSITION {index + 1}</strong>
            <span>클릭하여 카드 선택</span>
          </div>
        )}
      </div>
    </div>
  );
}
