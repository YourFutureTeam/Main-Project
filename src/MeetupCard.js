// src/MeetupCard.js
import React from 'react';

// Простая функция для форматирования даты (можно улучшить с date-fns)
const formatDate = (dateString) => {
  if (!dateString) return 'Дата не указана';
  try {
    const date = new Date(dateString);
    // Форматируем в более читаемый вид, например: "19 апреля 2025 г., 21:30"
    // Используем toLocaleString для учета локали браузера
    return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        // timeZone: 'Europe/Moscow' // Можно указать таймзону, если нужно
    });
  } catch (e) {
    console.error("Ошибка форматирования даты:", e);
    return dateString; // Возвращаем исходную строку при ошибке
  }
};

function MeetupCard({ meetup }) {
  return (
    <div className="card meetup-card"> {/* Используем общий класс card и специфичный meetup-card */}
      <div className="card-header">
        <div className="card-title">{meetup.title}</div>
        <div className="meetup-date">{formatDate(meetup.date)}</div>
      </div>
      <div className="card-description">{meetup.description}</div>
      <div className="meetup-link">
        <a href={meetup.link} target="_blank" rel="noopener noreferrer">
          Ссылка на конференцию
        </a>
      </div>
      {/* Можно добавить имя создателя, если нужно, получив его по meetup.creator_user_id */}
      {/* <div className="card-creator">Добавлено: {meetup.creator_username || 'Админ'}</div> */}
    </div>
  );
}

export default MeetupCard;
