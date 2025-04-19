// src/App.js (ПОЛНЫЙ КОД с обязательным полем OpenSea в AddStartupForm)

import React, { useState, useEffect, useCallback } from 'react';
// Импорты компонентов
import StartupCard from './StartupCard'; // Этот компонент не меняется
import { Auth } from './Auth';
import MeetupsTabContent from './MeetupsTabContent';
import VacanciesTabContent from './VacanciesTabContent';
// AddStartupForm будет определен ниже
// Импорт CSS
import './App.css';

// --- Компонент AddStartupForm (ИЗМЕНЕН: добавлено поле OpenSea) ---
function AddStartupForm({ onAdd, onCancel, isLoading }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    // ---> НОВОЕ СОСТОЯНИЕ: Для ссылки OpenSea <---
    const [openseaLink, setOpenseaLink] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();

        // Валидация: все поля обязательны
        if (!name.trim() || !description.trim() || !openseaLink.trim()) {
            alert('Пожалуйста, заполните все поля: Название, Описание и Ссылка OpenSea.');
            return;
        }
        // Простая проверка URL на клиенте (бэкенд все равно проверит надежнее)
        if (!openseaLink.trim().toLowerCase().startsWith('http://') && !openseaLink.trim().toLowerCase().startsWith('https://')) {
             alert('Ссылка OpenSea должна начинаться с http:// или https://');
             return;
        }

        // Вызов колбэка onAdd с полными данными
        onAdd({
            name: name.trim(),
            description: description.trim(),
            opensea_link: openseaLink.trim() // <-- Передаем ссылку
        });
    };

    return (
        <form onSubmit={handleSubmit} className="add-startup-form add-form">
            <h3>Добавить новый стартап</h3>
            <input
                type="text"
                placeholder="Название стартапа"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required // Обязательное поле
                disabled={isLoading}
            />
            <textarea
                placeholder="Описание стартапа"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required // Обязательное поле
                disabled={isLoading}
            />
            {/* ---> НОВОЕ ПОЛЕ: Ссылка OpenSea <--- */}
            <input
                type="url" // Тип URL для базовой валидации браузером
                placeholder="Ссылка на коллекцию OpenSea (https://...)"
                value={openseaLink}
                onChange={(e) => setOpenseaLink(e.target.value)}
                required // Обязательное поле
                pattern="https?://.+" // Паттерн для HTML5 валидации
                title="Введите корректный URL, начинающийся с http:// или https://"
                disabled={isLoading}
                className="input-opensea" // Добавим класс для возможной стилизации
            />
            {/* ---> Конец нового поля <--- */}

            <div className="form-buttons">
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Добавление...' : 'Добавить стартап'}
                </button>
                <button type="button" onClick={onCancel} className="cancel-button" disabled={isLoading}>
                    Отмена
                </button>
            </div>
        </form>
    );
}


// --- Основное содержимое приложения ---
function AppContent({ token, username, userId, userRole, onLogout }) {
    const [activeTab, setActiveTab] = useState('startups');
    const isAdmin = userRole === 'admin';
    const [startups, setStartups] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddStartupForm, setShowAddStartupForm] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');

    const showMessage = (text, type) => { /* ... */ };
    const authFetch = useCallback(async (url, options = {}) => { /* ... (Код authFetch без изменений) ... */
        const headers = { 'Content-Type': 'application/json', ...options.headers, 'Authorization': `Bearer ${token}`};
        console.log(`AuthFetch to ${url}: Method=${options.method || 'GET'}`);
        try { const response = await fetch(`http://127.0.0.1:5000${url}`, { ...options, headers });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) { if (response.status === 401 || response.status === 422) { console.error(`Auth Error ${response.status}`); onLogout(); throw new Error(data.error || "Сессия недействительна"); }
                throw new Error(data.error || `Ошибка ${response.status}`); } return data;
        } catch (error) { console.error('AuthFetch failed:', error); throw error; }
     }, [token, onLogout]);

    const fetchStartups = useCallback(() => {
        setLoading(true); setFetchError('');
        fetch('http://127.0.0.1:5000/startups')
            .then(response => { if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`); return response.json(); })
            .then(data => setStartups(data))
            .catch(error => { console.error("Ошибка загрузки стартапов:", error); setFetchError(`Не удалось загрузить стартапы: ${error.message}`); })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchStartups(); }, [fetchStartups]);

    // ---> ИЗМЕНЕНО: handleAddStartup теперь принимает объект с opensea_link <---
    const handleAddStartup = async (startupData) => {
        // startupData теперь содержит { name, description, opensea_link }
        console.log("handleAddStartup вызван с:", startupData); // Лог для проверки
        setLoading(true);
        try {
            const data = await authFetch('/startups', {
                method: 'POST',
                body: JSON.stringify(startupData) // Отправляем все данные
            });
            showMessage(data.message || 'Стартап добавлен!', 'success');
            fetchStartups();
            setShowAddStartupForm(false);
             // Опционально сбросить поля формы AddStartupForm (потребует рефакторинга - передать функции сброса в форму)
        } catch (error) {
            showMessage(`Ошибка добавления стартапа: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredStartups = startups.filter(startup =>
        startup.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- Начало JSX AppContent ---
    return (
        <div className="app-container">
            {/* Шапка */}
            <div className="app-header">
                 <h1>YourFuture</h1>
                 <div className="user-info">
                    <span className="user-greeting">Привет, <span>{username}!</span> {isAdmin && '(Админ)'}</span>
                    <button onClick={onLogout} className="logout-button">Выйти</button>
                 </div>
            </div>

            {/* Навигация */}
            <div className="tabs-navigation">
                 <button className={`tab-button ${activeTab === 'startups' ? 'active' : ''}`} onClick={() => setActiveTab('startups')}> Стартапы </button>
                 <button className={`tab-button ${activeTab === 'meetups' ? 'active' : ''}`} onClick={() => setActiveTab('meetups')}> Митапы </button>
                 <button className={`tab-button ${activeTab === 'vacancies' ? 'active' : ''}`} onClick={() => setActiveTab('vacancies')}> Вакансии </button>
            </div>

             {/* Сообщения */}
             {fetchError && <p className="message error">{fetchError}</p>}
             {message && <p className={`message ${messageType}`}>{message}</p>}

            {/* Контент вкладок */}
            <div className="tab-content-area">

                {/* --- Вкладка Стартапы --- */}
                {activeTab === 'startups' && (
                    <div className="startups-content">
                         {/* Поиск */}
                         <div className="search-container">
                             <input type="text" placeholder="Поиск по названию стартапа..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={loading} />
                         </div>
                         {/* Кнопка/Форма Добавить стартап */}
                         {!showAddStartupForm && (<button onClick={() => setShowAddStartupForm(true)} className="add-button add-startup-button" disabled={loading}> + Добавить новый стартап </button>)}
                         {/* ---> Вызов AddStartupForm без изменений, т.к. она сама управляет новым полем <--- */}
                         {showAddStartupForm && (<AddStartupForm onAdd={handleAddStartup} onCancel={() => setShowAddStartupForm(false)} isLoading={loading} />)}

                         {/* Список стартапов */}
                         <div className="startup-list card-list">
                             {loading && startups.length === 0 && <p>Загрузка...</p>}
                             {/* ... др. сообщения ... */}
                             {filteredStartups.map((startup) => (
                                 <StartupCard key={startup.id} startup={startup} /> // Передаем весь объект startup
                             ))}
                         </div>
                    </div>
                )} {/* Конец вкладки Стартапы */}

                {/* --- Вкладка Митапы --- */}
                {activeTab === 'meetups' && ( <MeetupsTabContent token={token} isAdmin={isAdmin} authFetch={authFetch} /> )}

                {/* --- Вкладка Вакансии --- */}
                {activeTab === 'vacancies' && ( <VacanciesTabContent token={token} username={username} userId={userId} userRole={userRole} authFetch={authFetch} allStartups={startups} /> )}

            </div> {/* Конец tab-content-area */}

        </div> // Конец app-container
    );
} // Конец AppContent


// --- Компонент верхнего уровня App (без изменений в логике) ---
function App() {
    const [token, setToken] = useState(localStorage.getItem('jwtToken'));
    const [username, setUsername] = useState(localStorage.getItem('username'));
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));
    const [userId, setUserId] = useState(localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId'), 10) : null);

    const handleLoginSuccess = (newToken, loggedInUsername, loggedInUserRole) => { /* ... (код без изменений) ... */
        localStorage.setItem('jwtToken', newToken); localStorage.setItem('username', loggedInUsername); localStorage.setItem('userRole', loggedInUserRole);
        try { const payload = JSON.parse(atob(newToken.split('.')[1])); const loggedInUserId = payload.sub;
            if (loggedInUserId) { localStorage.setItem('userId', loggedInUserId); setUserId(parseInt(loggedInUserId, 10)); }
            else { console.error("ID не найден в токене"); handleLogout(); return; }
        } catch (error) { console.error("Ошибка декодирования токена:", error); handleLogout(); return; }
        setToken(newToken); setUsername(loggedInUsername); setUserRole(loggedInUserRole);
    };
    const handleLogout = useCallback(() => { /* ... (код без изменений) ... */
        localStorage.clear(); setToken(null); setUsername(null); setUserRole(null); setUserId(null);
    }, []);
    useEffect(() => { /* ... (код без изменений) ... */
        const storedToken = localStorage.getItem('jwtToken'); const storedUsername = localStorage.getItem('username');
        const storedUserRole = localStorage.getItem('userRole'); const storedUserIdStr = localStorage.getItem('userId');
        if (storedToken && storedUsername && storedUserRole && storedUserIdStr) {
            setToken(storedToken); setUsername(storedUsername); setUserRole(storedUserRole); setUserId(parseInt(storedUserIdStr, 10));
        } else if (token || username || userRole || userId !== null) { handleLogout(); }
    }, [handleLogout, token, username, userRole, userId]);

    return (
        <div>
            {token && username && userRole && userId !== null ? (
                <AppContent token={token} username={username} userId={userId} userRole={userRole} onLogout={handleLogout} />
            ) : ( <Auth onLoginSuccess={handleLoginSuccess} /> )}
        </div>
    );
}

export default App;
