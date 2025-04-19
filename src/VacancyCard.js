// src/VacancyCard.js (ПОЛНЫЙ КОД с Resume Link)
import React from 'react';

function VacancyCard({ vacancy, currentUserId, isAdmin, onApply }) { // Пропсы без изменений

    const hasApplied = vacancy.applicants?.some(app => app.user_id === currentUserId)
                       || (vacancy.applicant_count > 0 && !vacancy.applicants); // Проверка отклика

    const canViewApplicants = isAdmin || vacancy.startup_creator_id === currentUserId; // Проверка прав на просмотр

    const handleApplyClick = () => {
        // ---> Запрашиваем оба поля <---
        const telegramUsername = window.prompt("Пожалуйста, введите ваш Telegram username (например, @username):");
        if (!telegramUsername || !telegramUsername.trim()) {
             if (telegramUsername !== null) alert("Необходимо указать Telegram username.");
             return; // Прерываем, если TG не введен или нажата отмена
        }

        const resumeLink = window.prompt("Пожалуйста, введите ссылку на ваше резюме (например, hh.ru, LinkedIn, Google Drive):");
        if (!resumeLink || !resumeLink.trim()) {
            if (resumeLink !== null) alert("Необходимо указать ссылку на резюме.");
            return; // Прерываем, если ссылка не введена или нажата отмена
        }
         // Простая проверка URL на клиенте
        if (!resumeLink.trim().toLowerCase().startsWith('http://') && !resumeLink.trim().toLowerCase().startsWith('https://')) {
             alert("Ссылка на резюме должна начинаться с http:// или https://");
             return;
        }
        // ---> Вызываем колбэк с обоими значениями <---
        onApply(vacancy.id, telegramUsername.trim(), resumeLink.trim());
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

            <div className="vacancy-section"><h4>Описание:</h4><p>{vacancy.description}</p></div>
            <div className="vacancy-section"><h4>Требования:</h4><p style={{ whiteSpace: 'pre-wrap' }}>{vacancy.requirements}</p></div>

            {/* --- Отображение откликов с ссылкой на резюме --- */}
            <div className="vacancy-section vacancy-applicants">
                 <h4>
                    Откликнулись ({vacancy.applicant_count ?? 0})
                    {!canViewApplicants && vacancy.applicant_count > 0 && " (детали доступны создателю)"}
                 </h4>
                {canViewApplicants && vacancy.applicants && vacancy.applicants.length > 0 ? (
                    <ul className="applicant-details-list"> {/* Используем список для структурирования */}
                        {vacancy.applicants.map((applicant, index) => (
                            <li key={applicant.user_id || index} className="applicant-detail-item">
                                {/* Отображаем Telegram */}
                                <span className="applicant-tg">{applicant.telegram || 'TG не указан'}</span>
                                {/* Отображаем ссылку на резюме, если она есть */}
                                {applicant.resume_link && (
                                    <a
                                        href={applicant.resume_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="resume-link"
                                        title={applicant.resume_link} // Показываем URL при наведении
                                    >
                                        Резюме
                                    </a>
                                )}
                                {!applicant.resume_link && <span className='no-resume'>(Резюме не указано)</span>}
                            </li>
                        ))}
                    </ul>
                ) : ( <p> {/* Сообщение об отсутствии или недоступности */}
                        {vacancy.applicant_count > 0 && !canViewApplicants ? "Список откликнувшихся виден только создателю вакансии." : "Пока никто не откликнулся."}
                    </p> )}
            </div>

            {/* Кнопка отклика */}
            <div className="vacancy-actions">
                <button onClick={handleApplyClick} disabled={hasApplied} className={`apply-button ${hasApplied ? 'applied' : ''}`}>
                    {hasApplied ? 'Вы откликнулись' : 'Откликнуться'}
                </button>
            </div>
        </div>
    );
}

export default VacancyCard;
