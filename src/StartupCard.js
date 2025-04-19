// src/StartupCard.js
import React from 'react';

// Функция для форматирования и отображения собранных средств
const renderFunds = (funds) => {
  // Фильтруем валюты, где собрано больше нуля, или показываем все
  const entries = Object.entries(funds)
    //.filter(([currency, amount]) => amount > 0); // Раскомментируйте, чтобы скрыть нулевые

  if (entries.length === 0) {
    return <span>Пока не собрано</span>;
  }

  return entries.map(([currency, amount], index) => (
    <span key={currency} style={{ marginRight: '10px', display: 'inline-block', whiteSpace: 'nowrap' }}>
       {/* Добавляем разделитель, кроме первого элемента */}
      {/* {index > 0 && ', '} */}
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
      <div className="card-title">{startup.name}</div>
      <div className="card-description">{startup.description}</div>
      <div className="card-funds">
        <strong>Собрано:</strong><br/> {/* Добавляем заголовок и перенос строки */}
        {renderFunds(startup.funds_raised || {})} {/* Передаем объект средств */}
      </div>
    </div>
  );
}

export default StartupCard;
