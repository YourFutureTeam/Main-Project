// src/StartupCard.js (ПОЛНЫЙ КОД - Все разделы заполнены)

import React, { useState } from 'react';
import { STARTUP_STAGES, getStageLabel, getStageOrder } from './constants'; // Импорт констант и функций этапов

// --- Вспомогательные функции ---

// Рендеринг собранных средств
const renderFunds = (funds) => {
    const entries = Object.entries(funds || {});
    if (entries.length === 0 || entries.every(e => e[1] <= 0)) {
        return <span>Пока не собрано</span>;
    }
    return entries
        .filter(([_, amount]) => amount > 0) // Показываем только ненулевые
        .map(([currency, amount]) => (
            <span key={currency} className="fund-item">
                <strong>{amount.toLocaleString()}</strong> {currency}
            </span>
      ));
};

// Форматирование даты (YYYY-MM-DD -> DD мес. YYYY)
const formatDate = (dateString) => {
    if (!dateString) return "Не запланировано";
    try {
        // Корректируем дату, т.к. new Date("YYYY-MM-DD") парсит ее как UTC 00:00
        const date = new Date(dateString + 'T00:00:00Z'); // Добавляем время и UTC
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        // Не нужно добавлять смещение вручную, toLocaleDateString учтет локальную таймзону
        // const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
        return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return "Неверная дата";
    }
};

// Проверка валидности URL
const isValidUrl = (urlString) => {
    try { new URL(urlString); return true; } catch { return false; }
};


// --- Основной компонент карточки ---

function StartupCard({
    startup, currentUserId, isAdmin,
    // Пропсы для редактирования Средств
    isEditingFunds, editingFunds, onEditFundsClick, onFundsChange, onSaveFundsClick, onCancelEditFundsClick,
    // Пропсы для Модерации (Одобрить/Отклонить)
    onApprove, onReject,
    // Пропсы для редактирования Плана (Timeline)
    isEditingTimeline, editingTimelineData, onEditTimelineClick, onTimelineDateChange, onSaveTimelineClick, onCancelEditTimelineClick,
    // Пропс для Приостановки/Возврата
    onToggleHold,
    // Общий флаг сохранения/обновления
    isSaving
}) {
    // Состояние для раскрытия/скрытия деталей карточки
    const [isExpanded, setIsExpanded] = useState(false);

    // Вычисляемые флаги для управления доступом
    const isOwner = startup.creator_user_id === currentUserId;
    const canModerate = isAdmin; // Только админ модерирует approve/reject
    const canEditContent = isAdmin || isOwner; // Админ или владелец могут редактировать средства и план
    const canToggleHold = isAdmin; // Только админ может приостанавливать

    // Валюты, доступные для редактирования
    const editableCurrencies = ['ETH', 'BTC', 'USDT'];

    // Обработчик клика для кнопки "Отклонить" (запрашивает причину)
    const handleRejectClick = () => {
        const reason = window.prompt("Укажите причину отклонения:");
        if (reason && reason.trim()) {
            onReject(startup.id, reason.trim());
        } else if (reason !== null) { // Если не нажал "Отмена"
            alert("Необходимо указать причину отклонения.");
        }
    };

    // Рендеринг бейджа статуса (с учетом видимости для разных ролей)
    const renderStatusBadge = () => {
        if (!startup || !startup.status) return null;

        if (startup.status === 'approved') {
            // Можно показывать всем или только владельцу/админу
            // if (isOwner || isAdmin) {
                 return <span className="status-badge status-approved">Одобрен</span>;
            // }
        }
        if (startup.status === 'pending') {
             if (isOwner || isAdmin) { // Показываем владельцу и админу
                return <span className="status-badge status-pending">На рассмотрении</span>;
             }
        }
        if (startup.status === 'rejected') {
            if (isOwner || isAdmin) { // Показываем владельцу и админу
                return <span className="status-badge status-rejected">Отклонен</span>;
            }
        }
        return null; // Не показываем статус в остальных случаях
    };

    // Обработчик клика по телу карточки для раскрытия/скрытия деталей
    const handleCardBodyClick = (e) => {
        // Предотвращаем раскрытие/скрытие при клике на интерактивные элементы внутри
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL' || e.target.closest('.admin-actions') || e.target.closest('.funds-edit-form') || e.target.closest('.timeline-edit-actions') || e.target.closest('.button-toggle-hold')) {
            return;
        }
        setIsExpanded(!isExpanded);
    };

    // Порядковый номер текущего этапа для сравнения
    const currentStageOrder = getStageOrder(startup.current_stage);

  // --- РЕНДЕРИНГ КОМПОНЕНТА ---
  return (
    // Добавляем классы в зависимости от состояния
    <div className={`card startup-card ${startup.is_held ? 'held' : ''} ${isEditingFunds ? 'editing-funds' : ''} ${isEditingTimeline ? 'editing-timeline' : ''} ${isExpanded ? 'expanded' : ''}`}>

      {/* === Шапка Карточки === */}
      <div className="card-header">
         {/* Название и Статус */}
         <div className="startup-title-status">
             <div className="card-title">{startup.name}</div>
             {renderStatusBadge()} {/* Вызов рендера статуса */}
         </div>
         {/* Информация о создателе */}
         <div className="startup-creator-details">
             <span className="card-creator">от {startup.creator_username || 'N/A'}</span>
             {(startup.creator_telegram || startup.creator_resume_link) && (
                 <div className="creator-contact-links">
                     {startup.creator_telegram && (<a href={`https://t.me/${startup.creator_telegram.substring(1)}`} target="_blank" rel="noopener noreferrer" className='creator-contact creator-telegram' title={`Telegram: ${startup.creator_telegram}`}> {startup.creator_telegram}</a>)}
                     {startup.creator_resume_link && (<a href={startup.creator_resume_link} target="_blank" rel="noopener noreferrer" className='creator-contact creator-resume' title="Резюме"> Резюме</a>)}
                 </div>
             )}
         </div>
      </div>

      {/* === Тело Карточки (кликабельно для раскрытия) === */}
      <div className="card-body" onClick={handleCardBodyClick} style={{ cursor: isExpanded ? 'default' : 'pointer' }}>

            {/* Краткое описание (когда свернуто) */}
            {!isExpanded && (
                <p className="startup-description-short">
                    {startup.description.substring(0, 100)}{startup.description.length > 100 ? '...' : ''}
                    <i>(нажмите для деталей)</i>
                </p>
            )}

           {/* Расширенные детали (когда раскрыто) */}
           {isExpanded && (
               <div className="startup-details-expanded">

                    {/* Причина отклонения (если есть и видна владельцу/админу) */}
                    {startup.status === 'rejected' && (isOwner || isAdmin) && startup.rejection_reason && (
                        <div className="startup-section rejection-reason">
                            <h4>Причина отклонения:</h4>
                            <p>{startup.rejection_reason}</p>
                        </div>
                    )}

                    {/* Полное Описание */}
                    <div className="startup-section card-description">
                        <h4>Описание:</h4>
                        <p>{startup.description}</p>
                    </div>

                    {/* Текущий Этап */}
                     <div className="startup-section current-stage-display">
                         <h4>Текущий этап:</h4>
                         <p><strong>{getStageLabel(startup.current_stage)}</strong></p>
                     </div>

                    {/* Дорожная карта (Timeline) */}
                    <div className="startup-section startup-timeline">
                         <h4>План развития:</h4>
                         <ul className="timeline-list">
                             {STARTUP_STAGES.map(stage => {
                                 const isCurrent = stage.key === startup.current_stage;
                                 const isPast = stage.order < currentStageOrder;
                                 const isFuture = stage.order > currentStageOrder;
                                 const plannedDate = startup.stage_timeline?.[stage.key];
                                 const editingDate = editingTimelineData?.[stage.key]; // Дата из состояния редактирования

                                 return (
                                     <li key={stage.key} className={`timeline-item ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}>
                                         {/* Название этапа */}
                                         <span className="timeline-label">{stage.label}</span>

                                         {/* Дата/Инпут для будущих этапов */}
                                         {isFuture && (
                                             <span className="timeline-date">
                                                 {isEditingTimeline && canEditContent ? ( // Показываем инпут в режиме ред.
                                                     <input
                                                         type="date"
                                                         value={editingDate ?? ''} // Используем ?? для пустой строки из null/undefined
                                                         onChange={(e) => onTimelineDateChange(stage.key, e.target.value)}
                                                         disabled={isSaving}
                                                         className="timeline-date-input"
                                                     />
                                                 ) : ( // Иначе показываем дату
                                                     `План: ${formatDate(plannedDate)}`
                                                 )}
                                             </span>
                                         )}

                                         {/* Индикаторы статуса этапа */}
                                          {isCurrent && <span className="timeline-status-indicator">(Текущий)</span>}
                                          {isPast && <span className="timeline-status-indicator">(Пройден)</span>}
                                     </li>
                                 );
                             })}
                         </ul>
                         {/* Кнопки редактирования Timeline */}
                         {canEditContent && ( // Показываем кнопки только тем, кто может редактировать
                             <div className="timeline-edit-actions">
                                 {isEditingTimeline ? (
                                     <>
                                         <button onClick={() => onSaveTimelineClick(startup.id)} className="button-save small" disabled={isSaving}>{isSaving ? '...' : 'Сохранить план'}</button>
                                         <button onClick={onCancelEditTimelineClick} className="button-cancel small" disabled={isSaving}>Отмена</button>
                                     </>
                                 ) : (
                                     // Не даем редактировать план, если редактируются средства
                                     <button onClick={() => onEditTimelineClick(startup)} className="button-edit small" disabled={isSaving || isEditingFunds}>Ред. план</button>
                                 )}
                             </div>
                         )}
                     </div>

                    {/* Собранные Средства */}
                    <div className="startup-section card-funds">
                        <h4>Собрано средств:</h4>
                        {/* Отображение средств */}
                        {!isEditingFunds && (
                            <div className="funds-display">{renderFunds(startup.funds_raised)}</div>
                        )}
                        {/* Форма Редактирования Средств */}
                        {isEditingFunds && canEditContent && ( // Показываем форму в режиме ред.
                            <div className="funds-edit-form">
                                {editableCurrencies.map(currency => (
                                    <div key={currency} className="fund-input-group">
                                        <label htmlFor={`fund-${startup.id}-${currency}`}>{currency}:</label>
                                        <input
                                            type="text"
                                            id={`fund-${startup.id}-${currency}`}
                                            value={editingFunds[currency] ?? '0'} // Используем ??
                                            onChange={(e) => onFundsChange(currency, e.target.value)}
                                            placeholder="0.0"
                                            disabled={isSaving}
                                            inputMode="decimal"
                                            pattern="[0-9]*[.,]?[0-9]*"
                                        />
                                    </div>
                                ))}
                                <div className="edit-form-buttons">
                                    <button onClick={() => onSaveFundsClick(startup.id)} className="button-save" disabled={isSaving}>{isSaving ? '...' : 'Сохранить средства'}</button>
                                    <button onClick={onCancelEditFundsClick} className="button-cancel" disabled={isSaving}>Отмена</button>
                                </div>
                            </div>
                        )}
                         {/* Кнопка редактирования средств */}
                         {canEditContent && !isEditingFunds && ( // Показываем кнопку, если не в режиме ред.
                             <button onClick={() => onEditFundsClick(startup)} className="button-edit small" disabled={isSaving || isEditingTimeline}>Ред. средства</button>
                         )}
                    </div>

                    {/* Ссылка OpenSea (только для одобренных) */}
                     {startup.status === 'approved' && startup.opensea_link && isValidUrl(startup.opensea_link) && (
                        <div className="startup-section opensea-link-section">
                            <a href={startup.opensea_link} target="_blank" rel="noopener noreferrer" className="opensea-button button-link">
                            Купить долю в проекте
                            </a>
                        </div>
                     )}

               </div> // конец startup-details-expanded
           )} {/* конец isExpanded */}

      </div> {/* конец card-body */}

       {/* === Действия с Карточкой (Модерация, Приостановка) === */}
       <div className="card-actions startup-actions">
            {/* Кнопки Модерации (Одобрить/Отклонить) */}
            {canModerate && startup.status === 'pending' && (
                 <div className="admin-actions">
                     <button onClick={() => onApprove(startup.id)} className="button-approve" disabled={isSaving}>Одобрить</button>
                     <button onClick={handleRejectClick} className="button-reject" disabled={isSaving}>Отклонить</button>
                 </div>
            )}

            {/* Кнопка Приостановки/Возврата (Hold/Unhold) */}
            {canToggleHold && ( // Только админ
                <button
                    onClick={() => onToggleHold(startup.id)} // Вызываем обработчик из App.js
                    className={`button-toggle-hold ${startup.is_held ? 'unhold' : 'hold'}`}
                    disabled={isSaving} // Блокируем во время любой операции
                    title={startup.is_held ? 'Вернуть в список' : 'Временно скрыть'}
                >
                    {startup.is_held ? '♻️ Вернуть' : '⏸️ Приостановить'}
                </button>
            )}
       </div> {/* конец card-actions */}

    </div> // конец card
  );
}

export default StartupCard;
