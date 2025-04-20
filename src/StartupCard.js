// src/StartupCard.js (ПОЛНЫЙ КОД - Отображение и Редактирование Этапов)

import React, { useState } from 'react';
import { STARTUP_STAGES, getStageLabel, getStageOrder } from './constants'; // Импорт

// Функция рендеринга средств
const renderFunds = (funds) => {
    const entries = Object.entries(funds || {});
    if (entries.length === 0 || entries.every(e => e[1] <= 0)) { return <span>Пока нет</span>; }
    return entries.filter(([_, amount]) => amount >= 0).map(([currency, amount]) => (
        <span key={currency} style={{ marginRight: '10px', display: 'inline-block', whiteSpace: 'nowrap' }}>
          <strong style={{ color: '#16a085' }}>{amount.toLocaleString()}</strong> {currency}
        </span>
      ));
};

// Функция форматирования даты
const formatDate = (dateString) => {
    if (!dateString) return "Не план.";
    try {
        const date = new Date(dateString);
        const adjustedDate = new Date(date.getTime() + Math.abs(date.getTimezoneOffset()*60000)); // Коррекция таймзоны
        return adjustedDate.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return "Ошибка даты"; }
};

function StartupCard({
    startup, currentUserId, isAdmin,
    // Средства
    isEditingFunds, editingFunds, onEditFundsClick, onFundsChange, onSaveFundsClick, onCancelEditFundsClick,
    // Модерация
    onApprove, onReject,
    // Timeline
    isEditingTimeline, editingTimelineData, onEditTimelineClick, onTimelineDateChange, onSaveTimelineClick, onCancelEditTimelineClick,
    // Сохранение
    isSaving
}) {
    const [isExpanded, setIsExpanded] = useState(false); // Состояние раскрытия
    const isOwner = startup.creator_user_id === currentUserId;
    const canModerate = isAdmin;
    const canEditContent = isAdmin || isOwner;
    const editableCurrencies = ['ETH', 'BTC', 'USDT'];

    // Обработчик клика для отклонения
    const handleRejectClick = () => {
        const reason = window.prompt("Причина отклонения:");
        if (reason && reason.trim()) { onReject(startup.id, reason.trim()); }
        else if (reason !== null) { alert("Укажите причину."); }
    };

    // Рендеринг статуса
    const renderStatusBadge = () => {
        if (startup.status === 'pending') return <span className="status-badge status-pending">Рассмотрение</span>;
        if (startup.status === 'rejected' && isOwner) return <span className="status-badge status-rejected">Отклонен</span>;
        if (startup.status === 'approved' && isOwner) return <span className="status-badge status-approved">Одобрен</span>;
        return null;
    };

    // Проверка URL
    const isValidUrl = (urlString) => { try { new URL(urlString); return true; } catch { return false; } };

    // Клик по телу для раскрытия/скрытия
    const handleCardBodyClick = (e) => {
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL' || e.target.closest('.admin-actions') || e.target.closest('.funds-edit-form') || e.target.closest('.timeline-edit-actions')) { return; }
        setIsExpanded(!isExpanded);
    };

    const currentStageOrder = getStageOrder(startup.current_stage);

  return (
    <div className={`card startup-card ${isEditingFunds ? 'editing-funds' : ''} ${isEditingTimeline ? 'editing-timeline' : ''} ${isExpanded ? 'expanded' : ''}`}>
      {/* Шапка */}
      <div className="card-header">
         <div className="startup-title-status">
             <div className="card-title">{startup.name}</div>
             {renderStatusBadge()}
         </div>
         <div className="startup-creator-details">
             <span className="card-creator">от {startup.creator_username || 'N/A'}</span>
             {(startup.creator_telegram || startup.creator_resume_link) && (
                 <div className="creator-contact-links">
                     {startup.creator_telegram && (<a href={`https://t.me/${startup.creator_telegram.substring(1)}`} target="_blank" rel="noopener noreferrer" className='creator-contact creator-telegram' title={`Telegram: ${startup.creator_telegram}`}>{startup.creator_telegram}</a>)}
                     {startup.creator_resume_link && (<a href={startup.creator_resume_link} target="_blank" rel="noopener noreferrer" className='creator-contact creator-resume' title="Резюме">Резюме</a>)}
                 </div>
             )}
         </div>
      </div>

      {/* Тело карточки (кликабельно) */}
      <div className="card-body" onClick={handleCardBodyClick} style={{ cursor: isExpanded ? 'default' : 'pointer' }}>
            {/* Краткое описание */}
            {!isExpanded && ( <p className="startup-description-short">{startup.description.substring(0, 100)}{startup.description.length > 100 ? '...' : ''} <i>(нажмите)</i></p> )}

           {/* Расширенные детали */}
           {isExpanded && (
               <div className="startup-details-expanded">
                    {startup.status === 'rejected' && isOwner && startup.rejection_reason && ( <div className="startup-section rejection-reason"><h4>Причина:</h4><p>{startup.rejection_reason}</p></div> )}
                    <div className="startup-section card-description"><h4>Описание:</h4>{startup.description}</div>
                    <div className="startup-section current-stage-display"><h4>Этап:</h4><p><strong>{getStageLabel(startup.current_stage)}</strong></p></div>

                    {/* Дорожная карта (Timeline) */}
                    <div className="startup-section startup-timeline">
                         <h4>План развития:</h4>
                         <ul className="timeline-list">
                             {STARTUP_STAGES.map(stage => {
                                 const isCurrent = stage.key === startup.current_stage;
                                 const isPast = stage.order < currentStageOrder;
                                 const isFuture = stage.order > currentStageOrder;
                                 const plannedDate = startup.stage_timeline?.[stage.key];
                                 const editingDate = editingTimelineData?.[stage.key]; // Используем для инпута
                                 return (
                                     <li key={stage.key} className={`timeline-item ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}>
                                         <span className="timeline-label">{stage.label}</span>
                                         {isFuture && (
                                             <span className="timeline-date">
                                                 {isEditingTimeline ? ( <input type="date" value={editingDate ?? ''} onChange={(e) => onTimelineDateChange(stage.key, e.target.value)} disabled={isSaving} className="timeline-date-input"/> ) : ( `План: ${formatDate(plannedDate)}` )}
                                             </span>
                                         )}
                                          {isCurrent && <span className="timeline-status-indicator">(Текущий)</span>}
                                          {isPast && <span className="timeline-status-indicator">(Пройден)</span>}
                                     </li>
                                 );
                             })}
                         </ul>
                         {canEditContent && (
                             <div className="timeline-edit-actions">
                                 {isEditingTimeline ? ( <> <button onClick={() => onSaveTimelineClick(startup.id)} className="button-save small" disabled={isSaving}>{isSaving ? '...' : 'Сохранить'}</button> <button onClick={onCancelEditTimelineClick} className="button-cancel small" disabled={isSaving}>Отмена</button> </> )
                                 : ( <button onClick={() => onEditTimelineClick(startup)} className="button-edit small" disabled={isSaving || isEditingFunds}>Ред. план</button> )}
                             </div>
                         )}
                     </div>

                    {/* Средства */}
                    <div className="startup-section card-funds">
                        <h4>Средства:</h4>
                        {!isEditingFunds && (<div className="funds-display">{renderFunds(startup.funds_raised)}</div>)}
                        {isEditingFunds && (
                            <div className="funds-edit-form">
                                {editableCurrencies.map(currency => (
                                    <div key={currency} className="fund-input-group">
                                        <label htmlFor={`fund-${startup.id}-${currency}`}>{currency}:</label>
                                        <input type="text" id={`fund-${startup.id}-${currency}`} value={editingFunds[currency] || ''} onChange={(e) => onFundsChange(currency, e.target.value)} placeholder="0.0" disabled={isSaving} inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" />
                                    </div>
                                ))}
                                <div className="edit-form-buttons"> <button onClick={() => onSaveFundsClick(startup.id)} className="button-save" disabled={isSaving}>{isSaving ? '...' : 'Сохранить'}</button> <button onClick={onCancelEditFundsClick} className="button-cancel" disabled={isSaving}>Отмена</button> </div>
                            </div>
                        )}
                         {canEditContent && !isEditingFunds && (<button onClick={() => onEditFundsClick(startup)} className="button-edit small" disabled={isSaving || isEditingTimeline}>Ред. средства</button>)}
                    </div>

                    {/* Ссылка OpenSea */}
                    {startup.status === 'approved' && startup.opensea_link && isValidUrl(startup.opensea_link) && ( <div className="startup-section opensea-link-section"> <a href={startup.opensea_link} target="_blank" rel="noopener noreferrer" className="opensea-button button-link">Membership Tokens</a> </div> )}
               </div>
           )}
      </div>

       {/* Кнопки модерации */}
       <div className="card-actions startup-actions">
            {canModerate && startup.status === 'pending' && ( <div className="admin-actions"> <button onClick={() => onApprove(startup.id)} className="button-approve">Одобрить</button> <button onClick={handleRejectClick} className="button-reject">Отклонить</button> </div> )}
       </div>
    </div>
  );
}

export default StartupCard;
