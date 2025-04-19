// src/StartupCard.js (ПОЛНЫЙ КОД с OpenSea Link)
import React from 'react';

// Функция рендеринга средств (без изменений)
const renderFunds = (funds) => {
  const entries = Object.entries(funds || {});
  if (entries.length === 0 || entries.every(e => e[1] <= 0)) {
    return <span>Пока не собрано</span>;
  }
  return entries
    .filter(([_, amount]) => amount > 0)
    .map(([currency, amount]) => (
    <span key={currency} style={{ marginRight: '10px', display: 'inline-block', whiteSpace: 'nowrap' }}>
      <strong style={{ color: '#16a085' }}>{amount.toLocaleString()}</strong> {currency}
    </span>
  ));
};

// --- Компонент StartupCard ---
// Убраны пропсы isSelected и onClick
function StartupCard({ startup }) {

    // Проверка на валидность URL (простая)
    const isValidUrl = (urlString) => {
        try {
            const url = new URL(urlString);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
            return false;
        }
    };

  return (
    // Убран класс 'selected' и обработчик onClick
    <div className="card startup-card">
      <div className="card-header">
          <div className="card-title">{startup.name}</div>
          <div className="card-creator">от {startup.creator_username || 'Система'}</div>
      </div>
      <div className="card-description">{startup.description}</div>
      <div className="card-funds">
        <strong>Собрано:</strong><br/>
        {renderFunds(startup.funds_raised)}
      </div>

      {/* --- НОВЫЙ БЛОК: Ссылка на OpenSea --- */}
      {startup.opensea_link && isValidUrl(startup.opensea_link) && ( // Отображаем только если ссылка есть и валидна
            <div className="card-action-link">
                <a
                    href={startup.opensea_link}
                    target="_blank" // Открыть в новой вкладке
                    rel="noopener noreferrer" // Из соображений безопасности
                    className="opensea-button button-link" // Классы для стилизации
                >
                    Membership Tokens (OpenSea)
                </a>
            </div>
      )}
       {/* --- Конец нового блока --- */}

    </div>
  );
}

export default StartupCard;
