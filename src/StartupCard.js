// src/StartupCard.js (ПОЛНЫЙ КОД - ИСПРАВЛЕНА ОШИБКА 'loading is not defined')
import React from 'react';

// Функция рендеринга средств (без изменений)
const renderFunds = (funds) => {
    const entries = Object.entries(funds || {}); if (entries.length === 0 || entries.every(e => e[1] <= 0)) { return <span>Пока не собрано</span>; }
    return entries.filter(([_, amount]) => amount >= 0).map(([currency, amount]) => ( // Отображаем и 0
        <span key={currency} style={{ marginRight: '10px', display: 'inline-block', whiteSpace: 'nowrap' }}>
          <strong style={{ color: '#16a085' }}>{amount.toLocaleString()}</strong> {currency}
        </span>
      ));
};

// --- Компонент StartupCard ---
function StartupCard({
    startup,
    currentUserId,
    isAdmin,
    isEditing,
    editingFunds,
    onEditClick,
    onFundsChange,
    onSaveClick,
    onCancelClick,
    isSaving // Идет ли сохранение для ЭТОЙ карточки
}) {

    const canEdit = isAdmin || startup.creator_user_id === currentUserId;
    const isValidUrl = (urlString) => { try { const u = new URL(urlString); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; } };
    const editableCurrencies = ['ETH', 'BTC', 'USDT'];

  return (
    <div className={`card startup-card ${isEditing ? 'editing' : ''}`}>
      <div className="card-header">
          <div className="card-title">{startup.name}</div>
          <div className="card-creator">от {startup.creator_username || 'Система'}</div>
      </div>
      <div className="card-description">{startup.description}</div>

      {/* --- Блок отображения/редактирования средств --- */}
      <div className="card-funds">
        <strong>Собрано:</strong>
        {!isEditing && ( <div className="funds-display">{renderFunds(startup.funds_raised)}</div> )}
        {isEditing && (
            <div className="funds-edit-form">
                {editableCurrencies.map(currency => (
                    <div key={currency} className="fund-input-group">
                        <label htmlFor={`fund-${startup.id}-${currency}`}>{currency}:</label>
                        <input
                            type="text"
                            id={`fund-${startup.id}-${currency}`}
                            value={editingFunds[currency] || ''}
                            onChange={(e) => onFundsChange(currency, e.target.value)}
                            placeholder="0.0"
                            disabled={isSaving}
                        />
                    </div>
                ))}
                <div className="edit-form-buttons">
                    <button onClick={() => onSaveClick(startup.id)} className="button-save" disabled={isSaving}>
                        {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button onClick={onCancelClick} className="button-cancel" disabled={isSaving}>
                        Отмена
                    </button>
                </div>
            </div>
        )}
      </div>
      {/* --- Конец блока средств --- */}

       {/* --- Блок с кнопками действий --- */}
       <div className="card-actions">
            {/* Кнопка Редактировать средства */}
            {canEdit && !isEditing && (
                <button
                    onClick={() => onEditClick(startup)}
                    className="button-edit button-link-secondary"
                    // ---> ИСПРАВЛЕНО: Убрано '|| loading' <---
                    disabled={isSaving}
                >
                    Ред. средства
                </button>
            )}
             {/* Ссылка на OpenSea */}
             {!isEditing && startup.opensea_link && isValidUrl(startup.opensea_link) && (
                <a href={startup.opensea_link} target="_blank" rel="noopener noreferrer" className="opensea-button button-link">
                    Membership Tokens
                </a>
             )}
       </div>
      {/* --- Конец блока действий --- */}
    </div>
  );
}

export default StartupCard;
