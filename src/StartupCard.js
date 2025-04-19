// src/StartupCard.js
import React from 'react';

// Функция рендеринга средств остается прежней
const renderFunds = (funds) => {
  // ... (код renderFunds без изменений) ...
  const entries = Object.entries(funds);
  if (entries.length === 0 || entries.every(e => e[1] <=0) ) { // Показать, если все нули или пусто
    return <span>Пока не собрано</span>;
  }
  return entries
    .filter(([_, amount]) => amount > 0) // Показываем только ненулевые балансы
    .map(([currency, amount], index) => (
    <span key={currency} style={{ marginRight: '10px', display: 'inline-block', whiteSpace: 'nowrap' }}>
      <strong style={{ color: '#16a085' }}>{amount.toLocaleString()}</strong> {currency}
    </span>
  ));
};


function StartupCard({ startup, isSelected, onClick }) {
  return (
    <div
      className={`card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="card-header"> {/* Добавляем обертку для заголовка и создателя */}
          <div className="card-title">{startup.name}</div>
          {/* Отображаем имя создателя */}
          <div className="card-creator">от {startup.creator_username || 'Система'}</div>
      </div>
      <div className="card-description">{startup.description}</div>
      <div className="card-funds">
        <strong>Собрано:</strong><br/>
        {renderFunds(startup.funds_raised || {})}
      </div>
    </div>
  );
}

export default StartupCard;
