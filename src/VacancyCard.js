// src/VacancyCard.js (ПОЛНЫЙ КОД - Исправлены проверки и alert в handleApplyClick)
import React from 'react';

// Пропсы: userProfile содержит данные профиля ТЕКУЩЕГО пользователя
function VacancyCard({ vacancy, currentUserId, isAdmin, userProfile, onApply }) {

    const hasApplied = vacancy.applicants?.some(app => app.user_id === currentUserId);
    const canViewApplicants = isAdmin || vacancy.startup_creator_id === currentUserId;

    // Обработчик клика на "Откликнуться"
    const handleApplyClick = () => {
        // ---> Лог для отладки: какие данные профиля мы видим? <---
        console.log("[VacancyCard] handleApplyClick - userProfile:", userProfile);
        // ----------------------------------------------------------

        // Проверка, загрузился ли профиль вообще
        if (!userProfile) {
             alert("Данные вашего профиля еще не загружены. Пожалуйста, подождите или обновите страницу.");
             return;
        }

        const telegram = userProfile.telegram;
        const resume = userProfile.resume_link;

        // ---> ИСПРАВЛЕНА ПРОВЕРКА И ТЕКСТЫ ALERT <---
        let missingFields = [];
        if (!telegram || !telegram.trim()) {
            missingFields.push("Telegram username");
        }
        // Проверяем не только наличие, но и базовый формат URL резюме
        if (!resume || !resume.trim() || (!resume.toLowerCase().startsWith('http://') && !resume.toLowerCase().startsWith('https://'))) {
            missingFields.push("валидная ссылка на резюме (http:// или https://)");
        }

        // Если чего-то не хватает, выводим сообщение
        if (missingFields.length > 0) {
             alert(`Пожалуйста, заполните следующие поля в вашем Личном кабинете перед откликом: ${missingFields.join(', ')}.`);
             return;
        }
        // ---> Конец исправленной проверки <---

        // Если все данные есть, вызываем onApply БЕЗ аргументов
        console.log("[VacancyCard] Проверка профиля пройдена, вызов onApply...");
        onApply(vacancy.id);
    };

    // --- JSX Рендеринг (без изменений) ---
    return (
        <div className="card vacancy-card">
            <div className="card-header vacancy-header">
                 <div className='vacancy-title-startup'>
                    <div className="card-title">{vacancy.title}</div>
                    <div className="vacancy-startup-name">в {vacancy.startup_name || 'N/A'}</div>
                </div>
                <div className="vacancy-salary">{vacancy.salary || 'З/П не указана'}</div>
            </div>
            <div className="vacancy-section"><h4>Описание:</h4><p>{vacancy.description}</p></div>
            <div className="vacancy-section"><h4>Требования:</h4><p style={{ whiteSpace: 'pre-wrap' }}>{vacancy.requirements}</p></div>
            <div className="vacancy-section vacancy-applicants">
                 <h4>Откликнулись ({vacancy.applicant_count ?? 0}) {!canViewApplicants && vacancy.applicant_count > 0 && " (детали создателю)"}</h4>
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
                ) : ( <p> {vacancy.applicant_count > 0 && !canViewApplicants ? "Список виден создателю." : "Пока нет откликов."} </p> )}
            </div>
            <div className="vacancy-actions">
                <button onClick={handleApplyClick} disabled={hasApplied} className={`apply-button ${hasApplied ? 'applied' : ''}`}>
                    {hasApplied ? 'Вы откликнулись' : 'Откликнуться'}
                </button>
            </div>
        </div>
    );
}

export default VacancyCard;
