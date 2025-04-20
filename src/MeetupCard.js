// src/MeetupCard.js (ПОЛНЫЙ КОД)
import React from 'react';

// Функция для форматирования даты
const formatMeetupDate = (dateString) => {
    if (!dateString) return 'Дата не указана';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
        });
    } catch (error) {
        console.error("Ошибка форматирования даты митапа:", error);
        return dateString;
    }
};

function MeetupCard({ meetup, currentUserId, isAdmin, onApprove, onReject }) {

    const isOwner = meetup.creator_user_id === currentUserId;

    // Обработчик клика "Отклонить"
    const handleRejectClick = () => {
        const reason = window.prompt("Укажите причину отклонения митапа:");
        if (reason && reason.trim()) {
            onReject(meetup.id, reason.trim());
        } else if (reason !== null) {
            alert("Необходимо указать причину отклонения.");
        }
    };

    // Рендеринг значка статуса (текстового)
    const renderStatusBadge = () => {
        // Используем классы CSS из вакансий
        if (meetup.status === 'pending') {
            return <span className="status-badge status-pending">На рассмотрении</span>;
        }
        if (meetup.status === 'rejected' && isOwner) {
            return <span className="status-badge status-rejected">Отклонен</span>;
        }
         if (meetup.status === 'approved' && isOwner) {
             return <span className="status-badge status-approved">Одобрен</span>;
         }
        return null;
    };

    return (
        <div className={`card meetup-card`}> {/* Используем класс meetup-card */}
            <div className="card-header meetup-header"> {/* Используем meetup-header */}
                <div className='meetup-title-status'> {/* Используем meetup-title-status */}
                    <div className="card-title">{meetup.title}</div>
                    {renderStatusBadge()} {/* Текстовый статус */}
                </div>
                <div className="meetup-date">{formatMeetupDate(meetup.date)}</div> {/* Используем meetup-date */}
            </div>

            {/* Детали показываем если одобрен ИЛИ админ/владелец */}
            {(meetup.status === 'approved' || isAdmin || isOwner) && (
                <>
                    {/* Причина отклонения */}
                    {meetup.status === 'rejected' && isOwner && meetup.rejection_reason && (
                        <div className="meetup-section rejection-reason"> {/* Используем общий класс rejection-reason */}
                            <h4>Причина отклонения:</h4>
                            <p>{meetup.rejection_reason}</p>
                        </div>
                    )}

                    <div className="meetup-section"><h4>Описание:</h4><p>{meetup.description}</p></div>
                    <div className="meetup-section">
                        <h4>Ссылка:</h4>
                        {meetup.link ? (
                            <a href={meetup.link} target="_blank" rel="noopener noreferrer">{meetup.link}</a>
                        ) : (
                            <span>Ссылка не указана</span>
                        )}
                    </div>
                </>
            )}

            {/* Кнопки модерации для админа */}
            <div className="meetup-actions"> {/* Используем meetup-actions */}
                {isAdmin && meetup.status === 'pending' && (
                    <div className="admin-actions"> {/* Используем общий класс admin-actions */}
                        <button onClick={() => onApprove(meetup.id)} className="button-approve">Одобрить</button>
                        <button onClick={handleRejectClick} className="button-reject">Отклонить</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MeetupCard;
