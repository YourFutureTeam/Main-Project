// src/ProfileTabContent.js (ПОЛНЫЙ КОД - с вызовом onProfileUpdate)
import React, { useState, useEffect, useCallback } from 'react';

// Принимаем колбэк onProfileUpdate
function ProfileTabContent({ token, userId, authFetch, showMessage, onProfileUpdate }) {
    const [profileData, setProfileData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editFullName, setEditFullName] = useState('');
    const [editTelegram, setEditTelegram] = useState('');
    const [editResumeLink, setEditResumeLink] = useState('');

    // Загрузка данных профиля
    const fetchProfile = useCallback(() => {
        setLoading(true);
        setError('');
        authFetch('/profile')
            .then(data => {
                setProfileData(data);
                // Инициализируем поля формы при загрузке
                setEditFullName(data.full_name || '');
                setEditTelegram(data.telegram || '');
                setEditResumeLink(data.resume_link || '');
            })
            .catch(err => {
                console.error("Ошибка загрузки профиля:", err);
                setError(`Не удалось загрузить профиль: ${err.message}`);
                showMessage(`Не удалось загрузить профиль: ${err.message}`, 'error');
            })
            .finally(() => setLoading(false));
    }, [authFetch, showMessage]); // Зависимости authFetch и showMessage

    // Загружаем профиль при монтировании
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]); // Зависимость fetchProfile

    // Вход в режим редактирования
    const handleEditClick = () => {
        if (!profileData) return; // Не даем редактировать, если данных нет
        // Устанавливаем текущие значения в поля формы
        setEditFullName(profileData.full_name || '');
        setEditTelegram(profileData.telegram || '');
        setEditResumeLink(profileData.resume_link || '');
        setIsEditing(true); // Включаем режим редактирования
    };

    // Отмена редактирования
    const handleCancelClick = () => {
        setIsEditing(false);
        // Можно сбросить поля формы к исходным значениям, если нужно
        // setEditFullName(profileData.full_name || '');
        // setEditTelegram(profileData.telegram || '');
        // setEditResumeLink(profileData.resume_link || '');
    };

    // Сохранение изменений профиля
    const handleSaveClick = async () => {
        setLoading(true); // Включаем лоадер
        setError('');

        // Валидация
        if (!editFullName.trim()) {
             showMessage("Поле 'ФИО' не может быть пустым.", 'error');
             setLoading(false); return;
        }
        if (editResumeLink.trim() && !editResumeLink.toLowerCase().startsWith('http')) {
            showMessage("Ссылка на резюме должна начинаться с http:// или https://", 'error');
            setLoading(false); return;
        }
        // Нормализация TG
        let finalTelegram = editTelegram.trim();
        if (finalTelegram && !finalTelegram.startsWith('@')) { finalTelegram = '@' + finalTelegram; }

        const updatedData = {
            full_name: editFullName.trim(),
            telegram: finalTelegram || null, // Отправляем null, если поле пустое
            resume_link: editResumeLink.trim() || null // Отправляем null, если поле пустое
        };

        try {
            const data = await authFetch('/profile', { method: 'PUT', body: JSON.stringify(updatedData) });
            setProfileData(data.profile); // Обновляем локальные данные из ответа сервера
            setIsEditing(false);          // Выходим из режима редактирования
            showMessage(data.message || 'Профиль успешно обновлен!', 'success');
            // Вызываем колбэк для обновления данных в AppContent
            if (onProfileUpdate) {
                onProfileUpdate(); // Это вызовет fetchUserProfile в AppContent
            }
        } catch (err) {
            console.error("Ошибка обновления профиля:", err);
            setError(`Не удалось обновить профиль: ${err.message}`);
            showMessage(`Не удалось обновить профиль: ${err.message}`, 'error');
        } finally {
            setLoading(false); // Выключаем лоадер
        }
    };

    // --- JSX Рендеринг ---
    // Показываем лоадер только при первой загрузке
    if (loading && !profileData && !isEditing) return <p>Загрузка профиля...</p>;
    // Показываем ошибку, если данных нет
    if (error && !profileData) return <p className="message error">{error}</p>;
    // Если данных нет и не было ошибки
    if (!profileData) return <p>Данные профиля не найдены.</p>;

    return (
        <div className="profile-content">
            <h2>Личный кабинет</h2>
            {/* Показываем ошибку, если она возникла ПОСЛЕ загрузки */}
            {error && <p className="message error">{error}</p>}
            {/* Используем стиль карточки для фона/тени */}
            <div className="profile-details card">
                {/* Логин и Роль (не редактируются) */}
                <div className="profile-field">
                    <span className="profile-label">Логин:</span>
                    <span className="profile-value">{profileData.username}</span>
                </div>
                <div className="profile-field">
                    <span className="profile-label">Роль:</span>
                    <span className="profile-value">{profileData.role === 'admin' ? 'Администратор' : 'Пользователь'}</span>
                </div>
                <hr /> {/* Разделитель */}
                {/* ФИО */}
                <div className="profile-field">
                    <label htmlFor="profile-fullname" className="profile-label">ФИО:</label>
                    {isEditing ? (
                        <input
                            type="text"
                            id="profile-fullname"
                            className="profile-input"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            disabled={loading}
                            required
                        />
                    ) : (
                        <span className="profile-value">{profileData.full_name || '(не указано)'}</span>
                    )}
                </div>
                {/* Telegram */}
                <div className="profile-field">
                    <label htmlFor="profile-telegram" className="profile-label">Telegram:</label>
                    {isEditing ? (
                        <input
                            type="text"
                            id="profile-telegram"
                            className="profile-input"
                            value={editTelegram}
                            onChange={(e) => setEditTelegram(e.target.value)}
                            placeholder="@username"
                            disabled={loading}
                        />
                    ) : (
                        <span className="profile-value">{profileData.telegram || '(не указано)'}</span>
                    )}
                </div>
                {/* Резюме */}
                <div className="profile-field">
                    <label htmlFor="profile-resume" className="profile-label">Резюме:</label>
                    {isEditing ? (
                        <input
                            type="url"
                            id="profile-resume"
                            className="profile-input"
                            value={editResumeLink}
                            onChange={(e) => setEditResumeLink(e.target.value)}
                            placeholder="https://..."
                            pattern="https?://.+"
                            title="Ссылка на резюме (http:// или https://)"
                            disabled={loading}
                        />
                    ) : (
                        <span className="profile-value">
                            {profileData.resume_link ? (
                                <a href={profileData.resume_link} target="_blank" rel="noopener noreferrer">
                                    {profileData.resume_link}
                                </a>
                            ) : (
                                '(не указано)'
                            )}
                        </span>
                    )}
                </div>
                {/* Кнопки управления */}
                <div className="profile-actions">
                    {isEditing ? (
                        <>
                            <button onClick={handleSaveClick} className="button-save" disabled={loading}>
                                {loading ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button onClick={handleCancelClick} className="button-cancel" disabled={loading}>
                                Отмена
                            </button>
                        </>
                    ) : (
                        <button onClick={handleEditClick} className="button-edit button-link-secondary" disabled={loading}>
                            Редактировать профиль
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProfileTabContent;
