// src/VacancyCard.js
import React from 'react';

function VacancyCard({ vacancy, currentUserId, isAdmin, onApply }) { // Добавили isAdmin

    const hasApplied = vacancy.applicants?.some(app => app.user_id === currentUserId) // Проверяем по user_id в объектах
                       || vacancy.applicant_count > 0 && !vacancy.applicants && vacancy.applicants !== null; // Считаем, что откликнулся, если видим только count > 0

    // Проверяем, может ли текущий пользователь видеть список откликов
    const canViewApplicants = isAdmin || vacancy.startup_creator_id === currentUserId;

    const handleApplyClick = () => {
        // Запрашиваем ник в Telegram
        const telegramUsername = window.prompt("Пожалуйста, введите ваш Telegram username (например, @username):");
        if (telegramUsername && telegramUsername.trim()) {
            // Вызываем колбэк, передавая ID вакансии и ник
            onApply(vacancy.id, telegramUsername.trim());
        } else if (telegramUsername !== null) { // Если не нажал "Отмена", а ввел пустое
             alert("Необходимо указать Telegram username для отклика.");
        }
    };

    return (
        <div className="card vacancy-card">
            <div className="card-header vacancy-header">
                 {/* ... Заголовок и ЗП ... */}
                 <div className='vacancy-title-startup'>
                    <div className="card-title">{vacancy.title}</div>
                    <div className="vacancy-startup-name">в {vacancy.startup_name || 'Неизвестный стартап'}</div>
                </div>
                <div className="vacancy-salary">{vacancy.salary || 'З/П не указана'}</div>
            </div>

            <div className="vacancy-section">
                <h4>Описание:</h4>
                <p>{vacancy.description}</p>
            </div>

            <div className="vacancy-section">
                <h4>Требования:</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{vacancy.requirements}</p>
            </div>

            {/* --- Отображение откликов с проверкой прав --- */}
            <div className="vacancy-section vacancy-applicants">
                 <h4>
                    Откликнулись ({vacancy.applicant_count ?? 0})
                    {!canViewApplicants && vacancy.applicant_count > 0 && " (детали доступны создателю)"}
                 </h4>
                {canViewApplicants && vacancy.applicants && vacancy.applicants.length > 0 ? (
                    // Если есть права и есть список откликов
                    <div className="applicant-list">
                        {vacancy.applicants.map((applicant, index) => (
                            // Отображаем Telegram username
                            <span key={applicant.user_id || index} className="applicant-tag">
                                {applicant.telegram || 'TG не указан'}
                            </span>
                        ))}
                    </div>
                ) : (
                    // Если нет прав или список пуст
                    <p>
                        {vacancy.applicant_count > 0 && !canViewApplicants
                            ? "Список откликнувшихся виден только создателю вакансии." // Уточняем сообщение
                            : "Пока никто не откликнулся."}
                    </p>
                )}
            </div>


            <div className="vacancy-actions">
                <button
                    onClick={handleApplyClick} // Используем новый обработчик
                    disabled={hasApplied}
                    className={`apply-button ${hasApplied ? 'applied' : ''}`}
                >
                    {hasApplied ? 'Вы откликнулись' : 'Откликнуться'}
                </button>
            </div>
        </div>
    );
}

export default VacancyCard;
