// src/StartupCard.js (ПОЛНЫЙ КОД - с Модерацией Стартапов и контактами создателя)
import React from 'react';

// Функция рендеринга средств
const renderFunds = (funds) => {
    const entries = Object.entries(funds || {});
    if (entries.length === 0 || entries.every(e => e[1] <= 0)) { return <span>Пока не собрано</span>; }
    return entries.filter(([_, amount]) => amount >= 0).map(([currency, amount]) => (
        <span key={currency} style={{ marginRight: '10px', display: 'inline-block', whiteSpace: 'nowrap' }}>
          <strong style={{ color: '#16a085' }}>{amount.toLocaleString()}</strong> {currency}
        </span>
      ));
};

// Принимаем пропсы onApprove, onReject
function StartupCard({
    startup,
    currentUserId,
    isAdmin,
    isEditing, // Для редактирования средств
    editingFunds,
    onEditClick,
    onFundsChange,
    onSaveClick,
    onCancelClick,
    isSaving,   // Для редактирования средств
    onApprove,  // Функция одобрения стартапа
    onReject    // Функция отклонения стартапа
}) {

    const isOwner = startup.creator_user_id === currentUserId;
    const canEditFunds = isAdmin || isOwner; // Кто может редактировать средства

    // Обработчик клика "Отклонить"
    const handleRejectClick = () => {
        const reason = window.prompt("Укажите причину отклонения стартапа:");
        if (reason && reason.trim()) {
            onReject(startup.id, reason.trim());
        } else if (reason !== null) {
            alert("Необходимо указать причину отклонения.");
        }
    };

    // Рендеринг значка статуса (текстового)
    const renderStatusBadge = () => {
        // Используем те же классы CSS, что и для вакансий/митапов
        if (startup.status === 'pending') {
            return <span className="status-badge status-pending">На рассмотрении</span>;
        }
        if (startup.status === 'rejected' && isOwner) {
            return <span className="status-badge status-rejected">Отклонен</span>;
        }
         if (startup.status === 'approved' && isOwner) {
             return <span className="status-badge status-approved">Одобрен</span>;
         }
        return null;
    };

    // Проверка валидности URL
    const isValidUrl = (urlString) => { try { const u = new URL(urlString); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; } };

    // Валюты для редактирования средств
    const editableCurrencies = ['ETH', 'BTC', 'USDT'];

  return (
    // Используем класс startup-card
    <div className={`card startup-card ${isEditing ? 'editing' : ''}`}>
      {/* Шапка */}
      <div className="card-header">
          {/* Контейнер для заголовка и статуса */}
          <div className="startup-title-status">
              <div className="card-title">{startup.name}</div>
              {renderStatusBadge()} {/* Рендерим статус */}
          </div>
          {/* Контейнер для информации о создателе */}
          <div className="startup-creator-details"> {/* Новый общий контейнер */}
                <span className="card-creator">от {startup.creator_username || 'Система'}</span>
                {/* Контейнер ТОЛЬКО для ссылок контактов */}
                {(startup.creator_telegram || startup.creator_resume_link) && ( // Показываем контейнер, только если есть хотя бы одна ссылка
                    <div className="creator-contact-links">
                        {startup.creator_telegram && (
                            <a href={`https://t.me/${startup.creator_telegram.substring(1)}`} target="_blank" rel="noopener noreferrer" className='creator-contact creator-telegram' title={`Telegram: ${startup.creator_telegram}`}>
                                {/* Иконка TG */} {startup.creator_telegram}
                            </a>
                        )}
                        {startup.creator_resume_link && (
                            <a href={startup.creator_resume_link} target="_blank" rel="noopener noreferrer" className='creator-contact creator-resume' title="Резюме создателя">
                                {/* Иконка CV */} Резюме
                            </a>
                        )}
                    </div>
                )}
          </div>
      </div>

      {/* Детали показываем если одобрен ИЛИ админ/владелец */}
      {(startup.status === 'approved' || isAdmin || isOwner) && (
          <>
                {/* Причина отклонения (только для владельца) */}
                {startup.status === 'rejected' && isOwner && startup.rejection_reason && (
                    <div className="startup-section rejection-reason">
                        <h4>Причина отклонения:</h4>
                        <p>{startup.rejection_reason}</p>
                    </div>
                )}

                {/* Описание */}
                <div className="startup-section card-description">{startup.description}</div>

                {/* Средства (отображение или форма редактирования) */}
                <div className="startup-section card-funds">
                    <strong>Собрано:</strong>
                    {!isEditing && ( <div className="funds-display">{renderFunds(startup.funds_raised)}</div> )}
                    {isEditing && (
                        <div className="funds-edit-form">
                            {editableCurrencies.map(currency => (
                                <div key={currency} className="fund-input-group">
                                    <label htmlFor={`fund-${startup.id}-${currency}`}>{currency}:</label>
                                    <input type="text" id={`fund-${startup.id}-${currency}`} value={editingFunds[currency] || ''} onChange={(e) => onFundsChange(currency, e.target.value)} placeholder="0.0" disabled={isSaving} />
                                </div>
                            ))}
                            <div className="edit-form-buttons">
                                <button onClick={() => onSaveClick(startup.id)} className="button-save" disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Сохранить'}</button>
                                <button onClick={onCancelClick} className="button-cancel" disabled={isSaving}>Отмена</button>
                            </div>
                        </div>
                    )}
                </div>
            </>
       )}


       {/* Кнопки действий внизу */}
       <div className="card-actions startup-actions">
            {/* Кнопки модерации для Админа (только для pending) */}
            {isAdmin && startup.status === 'pending' && (
                <div className="admin-actions">
                    <button onClick={() => onApprove(startup.id)} className="button-approve">Одобрить</button>
                    <button onClick={handleRejectClick} className="button-reject">Отклонить</button>
                </div>
            )}

            {/* Кнопка Редактировать средства (для админа/владельца, если не в режиме ред.) */}
            {canEditFunds && !isEditing && ( // Не блокируем по статусу
                <button onClick={() => onEditClick(startup)} className="button-edit button-link-secondary" disabled={isSaving}>
                    Ред. средства
                </button>
            )}

             {/* Ссылка на OpenSea (только для одобренных и если не в режиме ред. средств) */}
             {startup.status === 'approved' && !isEditing && startup.opensea_link && isValidUrl(startup.opensea_link) && (
                <a href={startup.opensea_link} target="_blank" rel="noopener noreferrer" className="opensea-button button-link">
                    Membership Tokens
                </a>
             )}
       </div>
    </div>
  );
}

export default StartupCard;
