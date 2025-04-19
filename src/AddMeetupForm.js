// src/AddMeetupForm.js
import React, { useState } from 'react';

function AddMeetupForm({ onAdd, onCancel, isLoading }) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(''); // Используем datetime-local
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !date || !description.trim() || !link.trim()) {
            alert('Пожалуйста, заполните все поля митапа.');
            return;
        }
        // Преобразуем дату из datetime-local в ISO строку для отправки на бэкенд
        const isoDateString = new Date(date).toISOString();
        onAdd({ title, date: isoDateString, description, link });
        // Очищаем поля после отправки (опционально)
        // setTitle(''); setDate(''); setDescription(''); setLink('');
    };

    return (
        <form onSubmit={handleSubmit} className="add-meetup-form add-form"> {/* Общий класс для форм */}
            <h3>Добавить новый митап</h3>
            <input
                type="text" placeholder="Название митапа" value={title}
                onChange={(e) => setTitle(e.target.value)} required disabled={isLoading}
            />
             {/* Используем datetime-local для удобного выбора даты и времени */}
            <input
                type="datetime-local" placeholder="Дата и время" value={date}
                onChange={(e) => setDate(e.target.value)} required disabled={isLoading}
                className="input-datetime"
            />
            <textarea
                placeholder="Краткое описание" value={description}
                onChange={(e) => setDescription(e.target.value)} required disabled={isLoading}
            />
            <input
                type="url" placeholder="Ссылка на видеоконференцию (http://...)" value={link}
                onChange={(e) => setLink(e.target.value)} required disabled={isLoading}
                pattern="https?://.+" // Простая валидация URL
                title="Пожалуйста, введите корректный URL (начинающийся с http:// или https://)"
            />
            <div className="form-buttons">
                <button type="submit" disabled={isLoading}>{isLoading ? 'Добавление...' : 'Добавить митап'}</button>
                <button type="button" onClick={onCancel} className="cancel-button" disabled={isLoading}>Отмена</button>
            </div>
        </form>
    );
}
export default AddMeetupForm;

