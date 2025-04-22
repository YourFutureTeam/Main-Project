import React from 'react';
import './App.css'; // Убедись, что стили подключены
import InlineExpandableText from './InlineExpandableText'; // Импортируем компонент

// Функции для красивого отображения значений (если они используются где-то еще)
function formatWorkload(val) {
    switch (val) {
      case '20': return '20 часов в неделю';
      case '30': return '30 часов в неделю';
      case '40': return '40 часов в неделю';
      case 'flexible': return 'По договоренности';
      default: return val || '-'; // Возвращаем как есть или '-'
    }
}
function formatWorkFormat(val) {
    switch (val) {
      case 'remote': return 'Удаленно';
      case 'office': return 'В офисе';
      case 'hybrid': return 'Гибрид';
      default: return val || '-'; // Возвращаем как есть или '-'
    }
}


// Принимаем все необходимые пропсы
function VacancyCard({
  vacancy,
  currentUserId,
  isAdmin,          // Используем напрямую для модерации и видимости откликов
  userProfile,      // Используется в handleApplyClick
  onApply,
  onApprove,
  onReject,
  onToggleHold,     // Сохраняем для кнопки Пауза/Вернуть
  isProcessing,     // Флаг для блокировки кнопок во время операций
  isCreator,        // Флаг, является ли текущий юзер создателем вакансии
  canModerate       // Сохраняем, если нужна для других целей
}) {

  // --- Вычисляем флаги ---
  const isOwner = isCreator; // Флаг создателя ИМЕННО ЭТОЙ ВАКАНСИИ
  const isStartupOwner = vacancy.startup_creator_id === currentUserId; // Флаг владельца стартапа (для справки, если нужен)
  const hasApplied = vacancy.status === 'approved' && vacancy.applicants?.some(app => app.user_id === currentUserId); // Откликался ли пользователь
  const isHeld = vacancy.status === 'held'; // Приостановлена ли вакансия

  // Кто может управлять вакансией (приостановка) - Используем isAdmin
  const canManageVacancy = isAdmin;

  // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
  // (Обработчики handleApplyClick, handleRejectClick, handleApproveClick, handleToggleHoldClick остаются без изменений)

  // Обработчик отклика
  const handleApplyClick = () => {
    if (!userProfile) { alert("Пожалуйста, подождите, ваш профиль загружается, или обновите страницу."); return; }
    const { telegram, resume_link } = userProfile;
    let missingFields = [];
    if (!telegram || !telegram.trim()) missingFields.push("Telegram");
    if (!resume_link || !resume_link.trim() || (!resume_link.toLowerCase().startsWith('http://') && !resume_link.toLowerCase().startsWith('https://'))) missingFields.push("валидная ссылка на резюме (http:// или https://)");
    if (missingFields.length > 0) { alert(`Пожалуйста, заполните ваш профиль в Личном Кабинете. Не хватает: ${missingFields.join(', ')}.`); return; }
    if (onApply && !isProcessing && !hasApplied && vacancy.status === 'approved') { onApply(vacancy.id); }
  };

  // Обработчик отклонения
  const handleRejectClick = () => {
    if (isProcessing) return;
    const reason = window.prompt("Укажите причину отклонения вакансии:");
    if (reason !== null && reason.trim()) {
        if (onReject) { onReject(vacancy.id, reason.trim()); }
        else { console.error("VacancyCard: Пропс onReject не был передан!"); }
    } else if (reason !== null) { alert("Причина отклонения не может быть пустой."); }
  };

  // Обработчик одобрения
  const handleApproveClick = () => {
    if (isProcessing) return;
    if (onApprove) { onApprove(vacancy.id); }
    else { console.error("VacancyCard: Пропс onApprove не был передан!"); }
  };

  // Обработчик приостановки/возобновления
  const handleToggleHoldClick = () => {
    if (onToggleHold && !isProcessing && canManageVacancy) {
      onToggleHold(vacancy.id, !isHeld);
    }
  };


  // --- РЕНДЕР-ФУНКЦИИ ---

  // Рендеринг статуса текстом
  const renderStatusBadge = () => {
    if (!vacancy.status) return null;
    let statusText = '';
    let statusClass = '';
    switch (vacancy.status) {
      case 'pending': statusText = 'Рассмотрение'; statusClass = 'status-pending'; break;
      case 'approved': statusText = 'Активна'; statusClass = 'status-approved'; break;
      case 'rejected': statusText = 'Отклонена'; statusClass = 'status-rejected'; break;
      case 'held': statusText = 'На паузе'; statusClass = 'status-held'; break;
      default: statusText = vacancy.status;
    }
    return <span className={`status-badge ${statusClass}`}>{statusText}</span>;
  };

  // --- НАЧАЛО JSX ДЛЯ КАРТОЧКИ ---
  return (
    <div className={`card vacancy-card ${isHeld ? 'held' : ''}`}>
      {/* Шапка карточки */}
      <div className="card-header vacancy-header">
        <div className="vacancy-title-status">
          <h3 className="card-title">{vacancy.title || 'Без названия'}</h3>
          <div className="vacancy-status-container">
            {renderStatusBadge()}
          </div>
        </div>
        <div className="vacancy-startup-info">
           {vacancy.startup_name && (
             <div className="vacancy-startup-name startup-name">
               в {vacancy.startup_name}
             </div>
           )}
        </div>
      </div>

      {/* Тело карточки */}
      <div className="card-body">
        {/* Причина отклонения */}
        {vacancy.status === 'rejected' && (isAdmin || isOwner) && vacancy.rejection_reason && ( // Оставляем isAdmin || isStartupOwner для просмотра причины
          <div className="vacancy-section rejection-reason">
            <strong>Причина отклонения:</strong> {vacancy.rejection_reason}
          </div>
        )}
        {/* Описание */}
        {vacancy.description && (
          <div className="vacancy-section">
            <h4>Описание</h4>
            <InlineExpandableText
              text={vacancy.description} lines={2} className="vacancy-description-text"
              expandText="Развернуть описание" collapseText="Свернуть описание"
            />
          </div>
        )}
        {/* Требования */}
        {vacancy.requirements && (
          <div className="vacancy-section">
            <h4>Требования</h4>
            <InlineExpandableText
              text={vacancy.requirements} lines={2} className="vacancy-requirements-text"
              expandText="Развернуть требования" collapseText="Свернуть требования"
            />
          </div>
        )}
        {/* Зарплата */}
        {vacancy.salary && vacancy.salary !== "N/A" && (
          <div className="vacancy-section">
            <h4>Зарплата</h4>
            <InlineExpandableText
              text={vacancy.salary} lines={2} className="vacancy-salary-text"
              expandText="Показать зарплату" collapseText="Скрыть зарплату"
            />
          </div>
        )}
        {/* Тип занятости */}
        {vacancy.workload && (
          <div className="vacancy-section">
            <h4>Тип занятости</h4>
            <span className="vacancy-workload-text">{formatWorkload(vacancy.workload)}</span>
          </div>
        )}
        {/* Формат работы */}
        {vacancy.work_format && (
          <div className="vacancy-section">
            <h4>Формат работы</h4>
            <span className="vacancy-workformat-text">{formatWorkFormat(vacancy.work_format)}</span>
          </div>
        )}

        {/* --- ИЗМЕНЕНО УСЛОВИЕ ВИДИМОСТИ ОТКЛИКОВ --- */}
        {/* Отклики (видны админу `isAdmin` ИЛИ создателю вакансии `isOwner`) */}
        {(isAdmin || isOwner) && (
          <div className="vacancy-section vacancy-applicants">
            <h4>Отклики</h4>
            {vacancy.applicants && vacancy.applicants.length > 0 ? (
              <ul className="applicant-details-list">
                {vacancy.applicants.map((applicant, index) => (
                  <li key={applicant.user_id || index} className="applicant-detail-item">
                    <span className="applicant-tg">{applicant.telegram || 'нет TG'}</span>
                    {applicant.resume_link ? (
                      <a href={applicant.resume_link} target="_blank" rel="noopener noreferrer" className="resume-link creator-contact creator-resume">Резюме</a>
                    ) : (
                      <span className="no-resume creator-contact creator-resume">Нет резюме</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (<p>Пока никто не откликнулся.</p>)}
          </div>
        )}
        {/* --- КОНЕЦ БЛОКА ОТКЛИКОВ --- */}

      </div>

      {/* Подвал карточки с кнопками действий */}
      <div className="card-footer vacancy-actions">
        {/* Кнопки Модерации (Админ, статус pending) */}
        {isAdmin && vacancy.status === 'pending' && (
            <div className="admin-actions">
                <button onClick={handleApproveClick} className="button-approve small" disabled={isProcessing} title="Одобрить вакансию">Одобрить</button>
                <button onClick={handleRejectClick} className="button-reject small" disabled={isProcessing} title="Отклонить вакансию">Отклонить</button>
            </div>
        )}
        {/* Кнопка приостановки/возобновления */}
        {canManageVacancy && (vacancy.status === 'approved' || vacancy.status === 'held') && (
           <button className={`button-toggle-hold ${isHeld ? 'unhold' : 'hold'}`} onClick={handleToggleHoldClick} disabled={isProcessing} title={isHeld ? 'Возобновить прием откликов' : 'Приостановить прием откликов'}>{isHeld ? 'Вернуть' : 'Пауза'}</button>
        )}
        {/* Кнопка Откликнуться */}
        {!isAdmin && vacancy.status === 'approved' && !hasApplied && (
            <button onClick={handleApplyClick} className="apply-button" disabled={isProcessing || isHeld} title={isHeld ? "Вакансия временно неактивна" : ""}>{isHeld ? 'Недоступно' : 'Откликнуться'}</button>
        )}
        {/* Индикатор "Вы откликнулись" */}
        {!isAdmin && vacancy.status === 'approved' && hasApplied && (
           <span className="applied-indicator" style={{ fontSize: '0.9em', color: '#28a745', fontWeight: '500' }}>✓ Вы откликнулись</span>
        )}

        {/* --- ИЗМЕНЕНО УСЛОВИЕ ВИДИМОСТИ СЧЕТЧИКА --- */}
        {/* Счетчик откликов (виден админу `isAdmin` ИЛИ создателю вакансии `isOwner`) */}
        {(isAdmin || isOwner) && vacancy.applicant_count !== undefined && (
            <span className="applicant-count" title={vacancy.applicant_count > 0 ? "Просмотр откликов пока не реализован" : ""}>
                Откликов: {vacancy.applicant_count} {vacancy.applicant_count > 0 && ' (просмотр WIP)'}
            </span>
        )}
        {/* Подсказка для остальных, если есть отклики */}
        {!(isAdmin || isOwner) && vacancy.applicant_count > 0 && (
           <span className="applicant-count-info" style={{ fontSize: '0.8em', color: '#6c757d' }}>
               Есть отклики (видны создателю)
           </span>
        )}
         {/* --- КОНЕЦ БЛОКА СЧЕТЧИКА --- */}

      </div>
    </div> // --- КОНЕЦ JSX ДЛЯ КАРТОЧКИ ---
  );
}

export default VacancyCard;
