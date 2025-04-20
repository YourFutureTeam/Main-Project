// src/ProfileTabContent.js (ПОЛНЫЙ КОД - ВСЕ РАЗВЕРНУТО)

import React, { useState, useEffect, useCallback } from 'react';
import './App.css'; // Импортируем общие стили

// Вспомогательная функция для форматирования даты уведомления
const formatNotificationTimestamp = (isoString) => {
    if (!isoString) return ''; // Возвращаем пусто, если строки нет
    try {
        const date = new Date(isoString);

        // --- ДОБАВЛЕНА ПРОВЕРКА НА ВАЛИДНОСТЬ ---
        if (isNaN(date.getTime())) {
            console.warn("Invalid date string received:", isoString); // Лог для отладки
            return "Неверная дата"; // Возвращаем сообщение об ошибке
        }
        // -----------------------------------------

        // Если дата валидна, форматируем
        return date.toLocaleString('ru-RU', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (error) { // На всякий случай ловим другие возможные ошибки
        console.error("Error formatting timestamp:", isoString, error);
        return "Ошибка даты";
    }
};

// --- Основной Компонент Вкладки Профиля ---
function ProfileTabContent({
    token,
    userId,
    isAdmin, // Этот пропс теперь должен приходить корректно
    authFetch,
    showMessage,
    onProfileUpdate, // Функция для обновления данных в App.js
    isUpdatingParent // Флаг, что идет другая операция в App.js
}) {
    console.log("ProfileTabContent received props: isAdmin =", isAdmin); // Лог для проверки

    // --- Состояния для Данных Профиля ---
    const [profileData, setProfileData] = useState(null); // Начинаем с null
    const [initialProfileData, setInitialProfileData] = useState(null); // Для отмены редактирования
    const [isLoadingProfile, setIsLoadingProfile] = useState(true); // Лоадер для профиля
    const [profileError, setProfileError] = useState(''); // Ошибка загрузки профиля
    const [isEditing, setIsEditing] = useState(false); // Режим редактирования профиля
    const [isSaving, setIsSaving] = useState(false); // Лоадер для сохранения профиля

    // --- Состояния для Уведомлений (Получение) ---
    const [notifications, setNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(true);
    const [notificationError, setNotificationError] = useState('');

    // --- Состояния для Админской Формы Отправки Уведомлений ---
    const [allUsers, setAllUsers] = useState([]); // Список всех пользователей
    const [loadingUsers, setLoadingUsers] = useState(false); // Лоадер для списка пользователей
    const [selectedUserId, setSelectedUserId] = useState(''); // ID выбранного получателя
    const [newMessage, setNewMessage] = useState(''); // Текст нового уведомления
    const [isSending, setIsSending] = useState(false); // Лоадер для отправки

    // --- Функции Загрузки Данных ---

    // Загрузка данных профиля текущего пользователя
    const fetchProfileData = useCallback(() => {
        console.log('ProfileTab: Fetching profile data...');
        setIsLoadingProfile(true);
        setProfileError('');
        authFetch('/profile')
            .then(data => {
                if (data) {
                    console.log('ProfileTab: Profile data received:', data);
                    const fetchedData = {
                        full_name: data.full_name || '',
                        telegram: data.telegram || '',
                        resume_link: data.resume_link || ''
                    };
                    setProfileData(fetchedData);
                    setInitialProfileData(fetchedData); // Сохраняем для отмены
                } else {
                    console.log('ProfileTab: No profile data returned (likely logout).');
                    setProfileError('Не удалось загрузить профиль.');
                }
            })
            .catch(err => {
                console.error('ProfileTab: Profile fetch error:', err);
                setProfileError(`Ошибка загрузки профиля: ${err.message}`);
                // showMessage не вызываем здесь, т.к. есть profileError
            })
            .finally(() => {
                console.log('ProfileTab: Profile fetch finished.');
                setIsLoadingProfile(false); // Гарантированно выключаем главный лоадер
            });
    }, [authFetch]); // Убрали showMessage

    // Загрузка уведомлений ТЕКУЩЕГО пользователя
    const fetchNotifications = useCallback(() => {
        console.log("ProfileTab: Fetching user notifications...");
        setLoadingNotifications(true);
        setNotificationError('');
        authFetch('/profile/notifications')
            .then(data => {
                if (data && Array.isArray(data)) {
                    console.log("ProfileTab: Notifications received:", data);
                    setNotifications(data);
                } else {
                    console.log("ProfileTab: No valid notification data received.");
                    setNotifications([]);
                }
            })
            .catch(err => {
                console.error("ProfileTab: Notification fetch error:", err);
                setNotificationError(`Ошибка загрузки уведомлений: ${err.message}`);
            })
            .finally(() => {
                console.log("ProfileTab: Notifications fetch finished.");
                setLoadingNotifications(false);
            });
    }, [authFetch]);

    // Загрузка списка ВСЕХ пользователей (только для админа)
    const fetchAllUsers = useCallback(() => {
        if (!isAdmin) {
            console.log("fetchAllUsers: Not admin, skipping.");
            return;
        }
        console.log("fetchAllUsers: Admin detected, fetching users...");
        setLoadingUsers(true);
        authFetch('/users')
            .then(data => {
                if (data && Array.isArray(data)) {
                    console.log("fetchAllUsers: Data received", data);
                    setAllUsers(data.filter(user => user.id !== userId)); // Убираем себя из списка
                } else {
                    console.log("fetchAllUsers: No valid user list data received.");
                    setAllUsers([]);
                }
            })
            .catch(err => {
                console.error("fetchAllUsers: Fetch error:", err);
                showMessage(`Ошибка загрузки списка пользователей: ${err.message}`, 'error');
                setAllUsers([]);
            })
            .finally(() => {
                console.log("fetchAllUsers: Fetch finished.");
                setLoadingUsers(false);
            });
    }, [authFetch, isAdmin, showMessage, userId]);

    // --- Эффекты ---
    // Запускаем загрузку данных при монтировании компонента
    useEffect(() => {
        console.log("ProfileTabContent: useEffect triggered.");
        fetchProfileData();
        fetchNotifications();
        fetchAllUsers();
    }, [fetchProfileData, fetchNotifications, fetchAllUsers]);

    // --- Обработчики Действий ---

    // Обработчик изменения полей формы профиля
    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    // Обработчик отмены редактирования профиля
    const handleCancelEdit = () => {
        setIsEditing(false);
        setProfileData(initialProfileData); // Восстанавливаем исходные данные
    };

    // Обработчик сохранения профиля
    const handleSave = async () => {
        setIsSaving(true);
        // Валидация
        let errors = [];
        if (!profileData.full_name.trim()) errors.push('ФИО не может быть пустым.');
        if (!profileData.telegram || !profileData.telegram.trim().startsWith('@')) errors.push('Укажите Telegram в формате @username.');
        if (profileData.resume_link && !profileData.resume_link.trim().toLowerCase().startsWith('http')) {
             errors.push('Укажите корректную ссылку на резюме (http/https) или оставьте поле пустым.');
        }


        if (errors.length > 0) {
            showMessage(errors.join(' '), 'error');
            setIsSaving(false);
            return;
        }

        try {
            const payload = {
                 full_name: profileData.full_name.trim(),
                 // Отправляем null, если поле пустое (бэкенд должен это обработать)
                 telegram: profileData.telegram.trim() || null,
                 resume_link: profileData.resume_link.trim() || null
             };
            const data = await authFetch('/profile', { method: 'PUT', body: JSON.stringify(payload) });
            if (data && data.profile) {
                showMessage(data.message || 'Профиль обновлен!', 'success');
                setIsEditing(false);
                const updatedData = {
                    full_name: data.profile.full_name || '',
                    telegram: data.profile.telegram || '',
                    resume_link: data.profile.resume_link || ''
                };
                setProfileData(updatedData);
                setInitialProfileData(updatedData);
                if (onProfileUpdate) onProfileUpdate();
            } else if (data) {
                 showMessage(data.message || 'Профиль обновлен!', 'success');
                 setIsEditing(false);
                 if (onProfileUpdate) onProfileUpdate();
            }
        } catch (error) {
             if (error.message) showMessage(`Ошибка сохранения профиля: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Обработчик отправки уведомления админом
    const handleSendNotification = async (e) => {
        e.preventDefault();
        if (!selectedUserId) { showMessage('Выберите пользователя-получателя.', 'error'); return; }
        if (!newMessage.trim()) { showMessage('Введите текст уведомления.', 'error'); return; }

        setIsSending(true);
        try {
            const data = await authFetch(`/users/${selectedUserId}/notifications`, {
                method: 'POST',
                body: JSON.stringify({ message: newMessage.trim() })
            });
            if (data) {
                showMessage(data.message || 'Уведомление успешно отправлено!', 'success');
                setNewMessage(''); // Очищаем поле
            }
        } catch (error) {
             if (error.message) showMessage(`Ошибка отправки уведомления: ${error.message}`, 'error');
        } finally {
            setIsSending(false);
        }
     };

    // --- Рендеринг Компонента ---

    // Пока грузится профиль - показываем лоадер
    if (isLoadingProfile) {
        return <div className="loading-container"><p>Загрузка личного кабинета...</p></div>;
    }

    // Если произошла ошибка загрузки профиля
    if (profileError) {
         return <div className="error-container"><p className="message error">{profileError}</p></div>;
    }

    // Если данные профиля все еще null (маловероятно, но для надежности)
    if (!profileData || !initialProfileData) {
        return <div className="error-container"><p className="message error">Не удалось отобразить данные профиля.</p></div>;
    }

    // Основной рендер
    return (
        <div className="profile-content tab-pane">
            <h2>Личный кабинет</h2>

            {/* --- Секция Данных Профиля --- */}
            <div className="profile-section">
                <h3>Ваши данные</h3>
                {isEditing ? (
                    // Форма Редактирования
                    <div className="profile-form">
                        <div className="form-field">
                            <label htmlFor="full_name">ФИО:</label>
                            <input type="text" id="full_name" name="full_name" value={profileData.full_name} onChange={handleChange} disabled={isSaving || isUpdatingParent} />
                        </div>
                        <div className="form-field">
                            <label htmlFor="telegram">Telegram:</label>
                            <input type="text" id="telegram" name="telegram" value={profileData.telegram} onChange={handleChange} placeholder="@username" disabled={isSaving || isUpdatingParent} />
                        </div>
                        <div className="form-field">
                            <label htmlFor="resume_link">Ссылка на резюме/портфолио:</label>
                            <input type="url" id="resume_link" name="resume_link" value={profileData.resume_link} onChange={handleChange} placeholder="https://..." disabled={isSaving || isUpdatingParent} />
                        </div>
                        <div className="form-buttons">
                            <button onClick={handleSave} className="btn btn-primary" disabled={isSaving || isUpdatingParent}>{isSaving ? 'Сохранение...' : 'Сохранить'}</button>
                            <button onClick={handleCancelEdit} className="btn btn-secondary" disabled={isSaving || isUpdatingParent}>Отмена</button>
                        </div>
                    </div>
                ) : (
                    // Режим Отображения
                    <div className="profile-display">
                        <p><strong>ФИО:</strong> {profileData.full_name || 'Не указано'}</p>
                        <p><strong>Telegram:</strong> {profileData.telegram || 'Не указано'}</p>
                        <p><strong>Резюме:</strong> {profileData.resume_link ? <a href={profileData.resume_link} target="_blank" rel="noopener noreferrer">{profileData.resume_link}</a> : 'Не указано'}</p>
                        <button onClick={() => setIsEditing(true)} className="btn btn-secondary btn-edit-profile" disabled={isUpdatingParent}>Редактировать профиль</button>
                    </div>
                )}
            </div>

             {/* --- Секция Отправки Уведомлений (Только для Админа) --- */}
             {isAdmin && (
                <div className="profile-section admin-send-notification">
                    <h3>Отправить уведомление пользователю</h3>
                    {loadingUsers ? (
                        <p>Загрузка списка пользователей...</p>
                    ) : (
                        <>
                            {allUsers.length > 0 ? (
                                <form onSubmit={handleSendNotification}>
                                    {/* Выбор пользователя */}
                                    <div className="form-field">
                                        <label htmlFor="select-user">Пользователь:</label>
                                        <select
                                            id="select-user"
                                            value={selectedUserId}
                                            onChange={(e) => setSelectedUserId(e.target.value)}
                                            required
                                            disabled={isSending}
                                        >
                                            <option value="" disabled>-- Выберите получателя --</option>
                                            {allUsers.map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.username} (ID: {user.id})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Текст сообщения */}
                                    <div className="form-field">
                                        <label htmlFor="notification-message">Сообщение:</label>
                                        <textarea
                                            id="notification-message"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Введите текст уведомления..."
                                            required
                                            rows={3}
                                            disabled={isSending}
                                        />
                                    </div>
                                    {/* Кнопка отправки */}
                                    <div className="form-buttons">
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            // Блокируем, если идет отправка ИЛИ не выбран пользователь
                                            disabled={isSending || isUpdatingParent || !selectedUserId}
                                        >
                                            {isSending ? 'Отправка...' : 'Отправить'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                // Если список пользователей пуст или не загрузился
                                <p>Нет пользователей для отправки уведомлений.</p>
                            )}
                        </>
                    )}
                </div>
             )}

            {/* --- Секция Полученных Уведомлений (Для Текущего Пользователя) --- */}
            <div className="profile-section notifications-section">
                <h3>Уведомления от Администрации</h3>
                 {loadingNotifications && <p>Загрузка уведомлений...</p>}
                 {notificationError && <p className="message error">{notificationError}</p>}
                 {!loadingNotifications && !notificationError && (
                     notifications.length > 0 ? (
                         <ul className="notification-list">
                             {notifications.map(notification => (
                                 <li key={notification.id} className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}>
                                     <div className="notification-meta">
                                         <span className="notification-timestamp">
                                             {formatNotificationTimestamp(notification.timestamp)}
                                         </span>
                                     </div>
                                     <p className="notification-message">{notification.message}</p>
                                 </li>
                             ))}
                         </ul>
                     ) : (
                         <p>Нет новых уведомлений.</p>
                     )
                 )}
            </div>

        </div> // Конец .profile-content
    );
}

export default ProfileTabContent;
