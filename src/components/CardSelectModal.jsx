import { useState, useMemo } from 'react';
import { LENORMAND_CARDS } from '../constants';
import { Search, X, RefreshCw } from 'lucide-react';

export default function CardSelectModal({ isOpen, onClose, onSelectCard, currentCardId }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCards = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return LENORMAND_CARDS;
    
    return LENORMAND_CARDS.filter(card => 
      card.nameEn.toLowerCase().includes(term) ||
      card.nameKo.toLowerCase().includes(term) ||
      card.id.toString() === term ||
      card.keywords.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Sticky Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--text-gold)', margin: 0 }}>
              카드 선택
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              (총 36장)
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} 
            />
            <input
              type="text"
              className="parchment-input"
              style={{ paddingLeft: '38px', height: '40px', fontSize: '14px' }}
              placeholder="이름, 번호 또는 상징 키워드 검색... (예: 기수, 24, 사랑)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button 
            className="gold-button-outline"
            style={{ height: '40px', padding: '0 16px', fontSize: '13px' }}
            onClick={() => {
              onSelectCard(null);
              onClose();
            }}
          >
            <RefreshCw size={14} />
            빈 슬롯으로 비우기
          </button>
        </div>

        {/* Scrollable Card Grid */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {filteredCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              검색 조건에 맞는 카드가 없습니다.
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
              gap: '16px' 
            }}>
              {filteredCards.map((card) => {
                const isSelected = card.id === currentCardId;
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      onSelectCard(card);
                      onClose();
                    }}
                    style={{
                      border: isSelected ? '2px solid var(--text-gold)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--panel-bg-alt)' : 'var(--input-bg)',
                      borderRadius: '6px',
                      padding: '8px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.03)';
                      e.currentTarget.style.borderColor = 'var(--text-gold)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.borderColor = isSelected ? 'var(--text-gold)' : 'var(--border-color)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* ID number badge on top-left of picker card */}
                    <div style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      background: 'rgba(0,0,0,0.65)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-gold)',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      zIndex: 2
                    }}>
                      {card.id}
                    </div>

                    {/* Image frame */}
                    <div style={{
                      width: '100%',
                      aspectRatio: '1 / 1.55',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '8px',
                      backgroundColor: '#070a13',
                      border: '1px solid rgba(223, 183, 108, 0.2)'
                    }}>
                      <img 
                        src={card.imgUrl} 
                        alt={card.nameEn}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                      {card.nameKo}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', marginTop: '2px' }}>
                      {card.nameEn}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
