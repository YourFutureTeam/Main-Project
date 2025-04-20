// src/VacancyCard.js (ПОЛНЫЙ КОД - Отображение статусов текстом, кнопки админа)
import React from 'react';

// Принимаем isAdmin и функции модерации
function VacancyCard({
    vacancy,
    currentUserId,
    isAdmin, // Флаг админа
    userProfile, // Профиль текущего юзера (для проверки перед откликом)
    onApply,     // Функция отклика
    onApprove,   // Функция одобрения
    onReject     // Функция отклонения
}) {

    // Является ли текущий пользователь создателем ВАКАНСИИ
    const isOwner = vacancy.creator_user_id === currentUserId;
    // Откликался ли текущий пользователь (только для одобренных)
    const hasApplied = vacancy.status === 'approved' && vacancy.applicants?.some(app => app.user_id === currentUserId);
    // Может ли текущий пользователь видеть список откликнувшихся (админ или создатель СТАРТАПА)
    const canViewApplicants = isAdmin || vacancy.startup_creator_id === currentUserId;

    // Обработчик клика "Откликнуться"
    const handleApplyClick = () => {
        console.log("[VacancyCard] handleApplyClick - userProfile:", userProfile);
        if (!userProfile) {
             alert("Данные вашего профиля еще не загружены. Пожалуйста, подождите или обновите страницу.");
             return;
        }
        const telegram = userProfile.telegram;
        const resume = userProfile.resume_link;

        let missingFields = [];
        if (!telegram || !telegram.trim()) {
            missingFields.push("Telegram username");
        }
        if (!resume || !resume.trim() || (!resume.toLowerCase().startsWith('http://') && !resume.toLowerCase().startsWith('https://'))) {
            missingFields.push("валидная ссылка на резюме (http:// или https://)");
        }

        if (missingFields.length > 0) {
             alert(`Пожалуйста, заполните следующие поля в вашем Личном кабинете перед откликом: ${missingFields.join(', ')}.`);
             return;
        }

        console.log("[VacancyCard] Проверка профиля пройдена, вызов onApply...");
        onApply(vacancy.id); // Вызываем без аргументов
    };

    // Обработчик клика "Отклонить" (запрашивает причину)
    const handleRejectClick = () => {
        const reason = window.prompt("Укажите причину отклонения вакансии:");
        if (reason && reason.trim()) {
            onReject(vacancy.id, reason.trim()); // Передаем ID и причину
        } else if (reason !== null) {
            alert("Необходимо указать причину отклонения.");
        }
    };

    // Рендеринг значка статуса (текстового)
    const renderStatusBadge = () => {
        if (vacancy.status === 'pending') {
            // Показываем всем (особенно админу и владельцу)
            return <span className="status-badge status-pending">На рассмотрении</span>;
        }
        if (vacancy.status === 'rejected' && isOwner) {
            // Показываем только владельцу
            return <span className="status-badge status-rejected">Отклонена</span>;
        }
         if (vacancy.status === 'approved' && isOwner) {
             // Можно показать и владельцу, что одобрено
             return <span className="status-badge status-approved">Одобрена</span>;
         }
        // В остальных случаях (например, одобренная для не-владельца) статус не показываем
        return null;
    };

    // --- JSX Рендеринг ---
    return (
        // Убран класс status-* с основной карточки
        <div className="card vacancy-card">
            {/* Шапка карточки */}
            <div className="card-header vacancy-header">
                <div className='vacancy-title-startup'>
                    <div className="card-title">{vacancy.title}</div>
                    {/* Контейнер для значка статуса и названия стартапа */}
                    <div className="vacancy-status-container">
                         {renderStatusBadge()} {/* Рендерим текстовый статус */}
                         <div className="vacancy-startup-name">в {vacancy.startup_name || 'Неизвестный стартап'}</div>
                    </div>
                </div>
                {/* Зарплата */}
                <div className="vacancy-salary">{vacancy.salary || 'З/П не указана'}</div>
            </div>

            {/* Отображаем детали только если вакансия одобрена ИЛИ если текущий пользователь - админ/владелец вакансии */}
            {(vacancy.status === 'approved' || isAdmin || isOwner) && (
                <>
                    {/* Причина отклонения (только для владельца отклоненной вакансии) */}
                    {vacancy.status === 'rejected' && isOwner && vacancy.rejection_reason && (
                        <div className="vacancy-section rejection-reason">
                            <h4>Причина отклонения:</h4>
                            <p>{vacancy.rejection_reason}</p>
                        </div>
                    )}

                    {/* Описание и Требования */}
                    <div className="vacancy-section"><h4>Описание:</h4><p>{vacancy.description}</p></div>
                    <div className="vacancy-section"><h4>Требования:</h4><p style={{ whiteSpace: 'pre-wrap' }}>{vacancy.requirements}</p></div>

                    {/* Блок откликов (только для ОДОБРЕННЫХ вакансий И если пользователь имеет право просмотра) */}
                    {vacancy.status === 'approved' && (
                        <div className="vacancy-section vacancy-applicants">
                            <h4>
                                Откликнулись ({vacancy.applicant_count ?? 0})
                                {!canViewApplicants && vacancy.applicant_count > 0 && " (детали создателю стартапа/админу)"}
                            </h4>
                            {canViewApplicants && vacancy.applicants && vacancy.applicants.length > 0 ? (
                                <ul className="applicant-details-list">
                                    {vacancy.applicants.map((applicant, index) => (
                                        <li key={applicant.user_id || index} className="applicant-detail-item">
                                            <span className="applicant-tg">{applicant.telegram || 'N/A'}</span>
                                            {applicant.resume_link && ( <a href={applicant.resume_link} target="_blank" rel="noopener noreferrer" className="resume-link" title={applicant.resume_link}>Резюме</a> )}
                                            {!applicant.resume_link && <span className='no-resume'>(Резюме?)</span>}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>
                                    {vacancy.applicant_count > 0 && !canViewApplicants ? "Список откликнувшихся виден только создателю стартапа или администратору." : "Пока никто не откликнулся."}
                                </p>
                             )}
                        </div>
                    )}
                </>
            )}

            {/* Блок кнопок действий внизу карточки */}
            <div className="vacancy-actions">
                {/* Кнопки модерации для Админа (только если статус 'pending') */}
                {isAdmin && vacancy.status === 'pending' && (
                    <div className="admin-actions">
                        <button onClick={() => onApprove(vacancy.id)} className="button-approve">Одобрить</button>
                        <button onClick={handleRejectClick} className="button-reject">Отклонить</button>
                    </div>
                )}

                {/* Кнопка "Откликнуться" (только для ОДОБРЕННЫХ, не для создателя ВАКАНСИИ, и если еще не откликался) */}
                {vacancy.status === 'approved' && !isOwner && (
                    <button onClick={handleApplyClick} disabled={hasApplied} className={`apply-button ${hasApplied ? 'applied' : ''}`}>
                        {hasApplied ? 'Вы откликнулись' : 'Откликнуться'}
                    </button>
                )}
            </div>
        </div>
    );
}

export default VacancyCard;
