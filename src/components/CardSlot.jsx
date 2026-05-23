import React from 'react';
import { Sparkles, Trash2, Edit2 } from 'lucide-react';

export default function CardSlot({ card, index, onSelect }) {
  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
  };

  return (
    <div className="card-slot-outer" onClick={onSelect}>
      <div className="card-slot-inner">
        {card ? (
          /* Card Front (Filled State) */
          <div className="card-face card-front" style={{ position: 'relative' }}>
            <img 
              src={card.imgUrl} 
              alt={`${card.id}. ${card.nameEn} (${card.nameKo})`} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            
            {/* Slot index overlay */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-gold)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
              zIndex: 3
            }}>
              {index + 1}
            </div>

            {/* Quick Actions (Hover overlay) */}
            <div 
              className="hover-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                opacity: 0,
                transition: 'opacity 0.2s ease',
                zIndex: 4
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0';
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  gap: '8px',
                  transform: 'translateY(10px)',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                  }}
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-gold)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                    transition: 'all 0.2s'
                  }}
                  title="카드 변경"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--border-color)';
                    e.currentTarget.style.color = '#000';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.85)';
                    e.currentTarget.style.color = 'var(--text-gold)';
                  }}
                >
                  <Edit2 size={16} />
                </button>
                
                <button
                  onClick={handleClear}
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                    transition: 'all 0.2s'
                  }}
                  title="카드 비우기"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ef4444';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.85)';
                    e.currentTarget.style.color = '#f87171';
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Card Back (Empty Placeholder State) */
          <div className="card-face card-back-placeholder">
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: 'var(--panel-bg-alt)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              opacity: 0.8
            }}>
              {index + 1}
            </div>

            {/* Custom Mystical Owl Silhouette SVG */}
            <svg 
              className="card-owl-icon"
              viewBox="0 0 100 100"
            >
              {/* Branch */}
              <path d="M 20 80 Q 50 78 80 80" strokeLinecap="round" />
              {/* Owl Body shape */}
              <path d="M 35 35 Q 50 20 65 35 Q 70 55 60 75 L 40 75 Q 30 55 35 35 Z" fill="none" />
              {/* Ears / Horns */}
              <path d="M 38 28 L 32 18 L 43 24" />
              <path d="M 62 28 L 68 18 L 57 24" />
              {/* Eyes */}
              <circle cx="43" cy="38" r="6" />
              <circle cx="43" cy="38" r="1.5" fill="var(--border-color)" />
              <circle cx="57" cy="38" r="6" />
              <circle cx="57" cy="38" r="1.5" fill="var(--border-color)" />
              {/* Beak */}
              <path d="M 50 41 L 48 48 L 52 48 Z" />
              {/* Wings */}
              <path d="M 34 40 Q 25 55 38 70" />
              <path d="M 66 40 Q 75 55 62 70" />
              {/* Feet */}
              <path d="M 43 75 L 42 79" />
              <path d="M 45 75 L 45 79" />
              <path d="M 55 75 L 54 79" />
              <path d="M 57 75 L 57 79" />
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span className="serif-font" style={{ fontSize: '13px', color: 'var(--text-gold)', fontWeight: 600, letterSpacing: '0.05em' }}>
                슬롯 {index + 1}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                클릭하여 선택
              </span>
            </div>
            
            <div style={{
              position: 'absolute',
              bottom: '12px',
              opacity: 0.3
            }}>
              <Sparkles size={14} style={{ color: 'var(--border-color)' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
