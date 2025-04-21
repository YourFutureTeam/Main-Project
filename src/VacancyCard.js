// src/VacancyCard.js (ПОЛНЫЙ КОД - Восстановлен JSX)

import React from 'react';
import './App.css'; // Убедись, что стили подключены

// Принимаем все необходимые пропсы
function VacancyCard({
    vacancy,
    currentUserId,
    isAdmin,
    userProfile,
    onApply,
    onApprove,
    onReject,
    isProcessing // Флаг для блокировки кнопок во время операций
}) {
    // Вычисляем флаги
    const isOwner = vacancy.creator_user_id === currentUserId;
    const hasApplied = vacancy.status === 'approved' && vacancy.applicants?.some(app => app.user_id === currentUserId);
    // Админ или создатель СТАРТАПА могут видеть отклики
    const canViewApplicants = isAdmin || vacancy.startup_creator_id === currentUserId;

    // Обработчик отклика (из твоего файла)
    const handleApplyClick = () => {
        console.log("[VacancyCard] handleApplyClick - userProfile:", userProfile);
        if (!userProfile) { alert("Профиль не загружен."); return; }
        const { telegram, resume_link } = userProfile;
        let missingFields = [];
        if (!telegram || !telegram.trim()) missingFields.push("Telegram");
        if (!resume_link || !resume_link.trim() || (!resume_link.toLowerCase().startsWith('http://') && !resume_link.toLowerCase().startsWith('https://'))) missingFields.push("валидная ссылка на резюме");
        if (missingFields.length > 0) { alert(`Заполните в ЛК: ${missingFields.join(', ')}.`); return; }
        console.log("[VacancyCard] Проверка профиля ОК, вызов onApply...");
        onApply(vacancy.id);
    };

    // Обработчик отклонения (из твоего файла)
    const handleRejectClick = () => {
        const reason = window.prompt("Причина отклонения вакансии:");
        if (reason && reason.trim()) {
            if (onReject) onReject(vacancy.id, reason.trim());
            else console.error("onReject prop missing!");
        } else if (reason !== null) { alert("Укажите причину."); }
    };

    // Рендеринг статуса текстом (из твоего файла)
    const renderStatusBadge = () => {
        // Показываем только для админа или владельца, если статус не approved
        if ((isAdmin || isOwner) && vacancy.status !== 'approved') {
             return (
                 <span className={`status-badge status-${vacancy.status}`}>
                     {vacancy.status === 'pending' ? 'Рассмотрение' : 'Отклонена'}
                 </span>
             );
        }
        // Можно добавить значок для одобренных, если хочется
        // if (vacancy.status === 'approved') {
        //     return <span className="status-badge status-approved">Активна</span>;
        // }
        return null;
    };

    // --- НАЧАЛО ВОССТАНОВЛЕННОГО JSX ДЛЯ КАРТОЧКИ ---
    return (
        <div className={`card vacancy-card ${vacancy.is_effectively_held ? 'held' : ''}`}>
            {/* Шапка */}
            <div className="card-header">
                <div className="vacancy-title-status">
                    <h4 className="card-title">{vacancy.title || 'Без названия'}</h4>
                    {renderStatusBadge()} {/* Рендер статуса */}
                    {/* Значок паузы для админа */}
                    {isAdmin && vacancy.is_effectively_held && (
                         <span className="status-badge status-held" title="Стартап приостановлен">⏸️ Пауза</span>
                    )}
                </div>
                {/* Инфо о стартапе */}
                <div className="vacancy-startup-info">
                    В стартап: <span className="startup-name">{vacancy.startup_name || 'Неизвестно'}</span>
                </div>
            </div>

            {/* Тело */}
            <div className="card-body">
                 {/* Причина отклонения (для админа/владельца) */}
                 {(isAdmin || isOwner) && vacancy.status === 'rejected' && vacancy.rejection_reason && (
                     <p className="rejection-reason-vacancy"><strong>Причина отклонения:</strong> {vacancy.rejection_reason}</p>
                 )}
                 {/* Описание */}
                 {vacancy.description && <p><strong>Описание:</strong> {vacancy.description}</p>}
                 {/* Требования */}
                 {vacancy.requirements && <p><strong>Требования:</strong> {vacancy.requirements}</p>}
                 {/* Зарплата */}
                 {vacancy.salary && vacancy.salary !== "N/A" && <p><strong>Зарплата:</strong> {vacancy.salary}</p>}
            </div>

            {/* Действия */}
            <div className="card-actions">
                {/* Кнопки Модерации (Админ, статус pending) */}
                {isAdmin && vacancy.status === 'pending' && (
                    <div className="admin-actions">
                        <button
                            onClick={() => {
                                if (onApprove) onApprove(vacancy.id);
                                else console.error("onApprove prop missing!");
                            }}
                            className="button-approve small"
                            disabled={isProcessing}
                        >
                            Одобрить
                        </button>
                        <button
                            onClick={handleRejectClick}
                            className="button-reject small"
                            disabled={isProcessing}
                        >
                            Отклонить
                        </button>
                    </div>
                )}

                 {/* Кнопка "Откликнуться" (Не админ, статус approved, не откликался) */}
                 {!isAdmin && vacancy.status === 'approved' && !hasApplied && (
                    <button
                        onClick={handleApplyClick}
                        className="button-apply"
                        disabled={isProcessing || vacancy.is_effectively_held}
                        title={vacancy.is_effectively_held ? "Стартап приостановлен" : ""}
                    >
                        {vacancy.is_effectively_held ? 'Недоступно' : 'Откликнуться'}
                    </button>
                 )}
                 {/* Индикатор "Вы откликнулись" */}
                 {!isAdmin && vacancy.status === 'approved' && hasApplied && (
                    <span className="applied-indicator">✓ Вы откликнулись</span>
                 )}

                 {/* Счетчик откликов (Админ или создатель стартапа) */}
                 {canViewApplicants && vacancy.applicant_count !== undefined && (
                     <span className="applicant-count" title={vacancy.applicant_count > 0 ? "Просмотр откликов пока не реализован" : ""}>
                         Откликов: {vacancy.applicant_count}
                         {/* Если отклики есть, можно добавить иконку или текст-подсказку */}
                         {vacancy.applicant_count > 0 && ' (просмотр WIP)'}
                     </span>
                 )}
                 {/* Подсказка для не-владельцев/админов, если есть отклики */}
                 {!canViewApplicants && vacancy.applicant_count > 0 && (
                    <span className="applicant-count-info">
                        Есть отклики (видны создателю стартапа)
                    </span>
                 )}
            </div>
        </div>
    );
     // --- КОНЕЦ ВОССТАНОВЛЕННОГО JSX ---
}

export default VacancyCard;
