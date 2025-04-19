// src/MeetupsTabContent.js
import React, { useState, useEffect, useCallback } from 'react';
import MeetupCard from './MeetupCard';
import AddMeetupForm from './AddMeetupForm';

function MeetupsTabContent({ token, isAdmin, authFetch }) { // Принимаем authFetch как проп
    const [meetups, setMeetups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAddMeetupForm, setShowAddMeetupForm] = useState(false);

    console.log('MeetupsTabContent получил isAdmin:', isAdmin);

    const showMessage = (text, type) => { // Простая функция для сообщений (можно вынести)
        alert(`${type === 'error' ? 'Ошибка: ' : ''}${text}`); // Используем alert для простоты
    };

    // Загрузка митапов
    const fetchMeetups = useCallback(() => {
        setLoading(true);
        setError('');
        fetch('http://127.0.0.1:5000/meetups') // Публичный эндпоинт
            .then(response => {
                if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
                return response.json();
            })
            .then(data => setMeetups(data))
            .catch(err => {
                console.error("Ошибка загрузки митапов:", err);
                setError(`Не удалось загрузить митапы: ${err.message}`);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchMeetups();
    }, [fetchMeetups]);

    // Обработчик добавления митапа
    const handleAddMeetup = async (meetupData) => {
        setLoading(true); // Индикатор загрузки для формы
        try {
            const data = await authFetch('/meetups', { // Используем authFetch для POST
                method: 'POST',
                body: JSON.stringify(meetupData)
            });
            showMessage(data.message || 'Митап успешно добавлен!', 'success');
            fetchMeetups(); // Перезагружаем список
            setShowAddMeetupForm(false); // Скрываем форму
        } catch (err) {
            showMessage(`Ошибка добавления митапа: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    console.log('MeetupsTabContent перед рендером: isAdmin =', isAdmin, ', showAddMeetupForm =', showAddMeetupForm);

    
    return (
        <div className="meetups-content">
            {/* Отображаем ошибку загрузки */}
            {error && <p className="message error">{error}</p>}

            {/* Кнопка и форма добавления (только для админа) */}
            {isAdmin && !showAddMeetupForm && (
                <button onClick={() => setShowAddMeetupForm(true)} className="add-button" disabled={loading}>
                    + Добавить новый митап
                </button>
            )}
            {isAdmin && showAddMeetupForm && (
                <AddMeetupForm
                    onAdd={handleAddMeetup}
                    onCancel={() => setShowAddMeetupForm(false)}
                    isLoading={loading}
                />
            )}

             {/* Список карточек митапов */}
             <div className="meetup-list card-list"> {/* Общий класс для списков карточек */}
                {loading && meetups.length === 0 && <p>Загрузка митапов...</p>}
                {!loading && meetups.length === 0 && !error && <p>Запланированных митапов пока нет.</p>}

                {meetups.map((meetup) => (
                    <MeetupCard key={meetup.id} meetup={meetup} />
                ))}
             </div>
        </div>
    );
}

export default MeetupsTabContent;
