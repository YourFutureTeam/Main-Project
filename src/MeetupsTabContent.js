// src/MeetupsTabContent.js (ПОЛНЫЙ КОД - с Модерацией Митапов)
import React, { useState, useEffect, useCallback } from 'react';
import MeetupCard from './MeetupCard'; // <-- Используем новый компонент
// import AddMeetupForm from './AddMeetupForm'; // Форма добавления определена ниже

// Принимаем userId и showMessage
function MeetupsTabContent({ token, userId, isAdmin, authFetch, showMessage }) {
    const [meetups, setMeetups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAddMeetupForm, setShowAddMeetupForm] = useState(false);

    // Загрузка митапов (фильтрация на бэкенде)
    const fetchMeetups = useCallback(() => {
        console.log("[MeetupsTabContent] Загрузка митапов...");
        setLoading(true); setError('');
        authFetch('/meetups') // Используем authFetch, т.к. видимость зависит от пользователя
            .then(data => {
                setMeetups(data);
                console.log("[MeetupsTabContent] Митапы загружены:", data.length);
            })
            .catch(err => {
                console.error("Ошибка загрузки митапов:", err);
                setError(`Не удалось загрузить митапы: ${err.message}`);
            })
            .finally(() => setLoading(false));
    }, [authFetch]);

    // Загружаем митапы при монтировании
    useEffect(() => {
        fetchMeetups();
    }, [fetchMeetups]);

    // Добавление митапа (любым пользователем)
    const handleAddMeetup = async (meetupData) => {
        console.log("[MeetupsTabContent] Добавление митапа:", meetupData);
        setLoading(true); setError('');
        try {
            const data = await authFetch('/meetups', {
                method: 'POST',
                body: JSON.stringify(meetupData)
            });
            showMessage(data.message || 'Митап отправлен на рассмотрение!', 'success');
            // Добавляем новый митап в начало списка локально
            setMeetups(prev => [data.meetup, ...prev]);
            // fetchMeetups(); // Или перезагружаем весь список
            setShowAddMeetupForm(false); // Скрываем форму
        } catch (err) {
            console.error("Ошибка добавления митапа:", err);
            showMessage(`Ошибка добавления митапа: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Одобрение митапа админом
    const handleApprove = async (meetupId) => {
        console.log(`[MeetupsTabContent] Одобрение митапа ${meetupId}`);
        setLoading(true); // Можно использовать отдельный лоадер
        try {
            const data = await authFetch(`/meetups/${meetupId}/approve`, { method: 'PUT' });
            showMessage(data.message || 'Митап одобрен!', 'success');
            // Обновляем статус митапа локально
            setMeetups(prev => prev.map(m => m.id === meetupId ? { ...m, status: 'approved', rejection_reason: null } : m));
        } catch (err) {
            console.error(`Ошибка одобрения митапа ${meetupId}:`, err);
            showMessage(`Ошибка одобрения: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Отклонение митапа админом
    const handleReject = async (meetupId, reason) => {
        console.log(`[MeetupsTabContent] Отклонение митапа ${meetupId} по причине: ${reason}`);
        setLoading(true);
        try {
            const data = await authFetch(`/meetups/${meetupId}/reject`, {
                method: 'PUT',
                body: JSON.stringify({ reason: reason })
            });
            showMessage(data.message || 'Митап отклонен!', 'success');
            // Обновляем статус и причину локально
            setMeetups(prev => prev.map(m => m.id === meetupId ? { ...m, status: 'rejected', rejection_reason: reason } : m));
        } catch (err) {
            console.error(`Ошибка отклонения митапа ${meetupId}:`, err);
            showMessage(`Ошибка отклонения: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- JSX ---
    return (
        <div className="meetups-content">
            {error && <p className="message error">{error}</p>}

            {/* Кнопка/Форма добавления - доступна всем */}
            {!showAddMeetupForm && (
                <button onClick={() => setShowAddMeetupForm(true)} className="add-button" disabled={loading}>
                    + Предложить митап
                </button>
            )}
            {showAddMeetupForm && (
                <AddMeetupForm
                    onAdd={handleAddMeetup}
                    onCancel={() => setShowAddMeetupForm(false)}
                    isLoading={loading}
                />
            )}

            {/* Список митапов */}
            <div className="meetup-list card-list">
                 {loading && meetups.length === 0 && <p>Загрузка митапов...</p>}
                 {!loading && meetups.length === 0 && !error && <p>Митапов пока нет.</p>}

                 {/* Рендер карточек митапов */}
                 {meetups.map((meetup) => (
                    <MeetupCard
                        key={meetup.id}
                        meetup={meetup}
                        currentUserId={userId} // ID текущего пользователя
                        isAdmin={isAdmin}     // Флаг админа
                        onApprove={handleApprove} // Функция одобрения
                        onReject={handleReject}   // Функция отклонения
                    />
                 ))}
            </div>
        </div>
    );
}

// Компонент формы добавления митапа
function AddMeetupForm({ onAdd, onCancel, isLoading }) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(''); // Формат YYYY-MM-DDTHH:mm
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !date.trim() || !description.trim() || !link.trim()) {
            alert('Пожалуйста, заполните все поля митапа.');
            return;
        }
        // Проверка ссылки
        if (!link.trim().toLowerCase().startsWith('http')) {
             alert('Ссылка должна начинаться с http:// или https://');
             return;
        }
        // Преобразование даты в ISO с Z (UTC)
        try {
            const localDate = new Date(date);
            if (isNaN(localDate.getTime())) throw new Error('Invalid Date');
            // Убедимся, что пользователь ввел время
            if (localDate.getHours() === 0 && localDate.getMinutes() === 0 && localDate.getSeconds() === 0 && !date.includes('T')) {
                 alert('Пожалуйста, укажите не только дату, но и время митапа.');
                 return;
            }
            const isoDateString = localDate.toISOString(); // В UTC с 'Z'
            onAdd({ title: title.trim(), date: isoDateString, description: description.trim(), link: link.trim() });
        } catch (error) {
            alert('Неверный формат даты. Используйте календарь для выбора даты и времени.');
            return;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="add-meetup-form add-form">
            <h3>Предложить новый митап</h3>
            <input type="text" placeholder="Название митапа" value={title} onChange={e => setTitle(e.target.value)} required disabled={isLoading} />
            {/* Используем datetime-local для удобного выбора даты и времени */}
            <input type="datetime-local" placeholder="Дата и время" value={date} onChange={e => setDate(e.target.value)} required disabled={isLoading} title="Выберите дату и время митапа" />
            <textarea placeholder="Описание митапа" value={description} onChange={e => setDescription(e.target.value)} required disabled={isLoading} />
            <input type="url" placeholder="Ссылка на трансляцию/встречу (https://...)" value={link} onChange={e => setLink(e.target.value)} required disabled={isLoading} pattern="https?://.+" title="URL с http(s)://" />
            <div className="form-buttons">
                <button type="submit" disabled={isLoading}>{isLoading ? 'Добавление...' : 'Предложить митап'}</button>
                <button type="button" onClick={onCancel} className="cancel-button" disabled={isLoading}>Отмена</button>
            </div>
        </form>
    );
}


export default MeetupsTabContent;
