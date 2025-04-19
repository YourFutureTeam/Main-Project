// src/App.js (ПОЛНЫЙ КОД - С редактированием средств)

import React, { useState, useEffect, useCallback } from 'react';
// Импорты компонентов
import StartupCard from './StartupCard'; // Будет принимать новые пропсы
import { Auth } from './Auth';
import MeetupsTabContent from './MeetupsTabContent';
import VacanciesTabContent from './VacanciesTabContent';
// Импорт CSS
import './App.css';

// --- Компонент AddStartupForm (определен здесь для полноты) ---
function AddStartupForm({ onAdd, onCancel, isLoading }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [openseaLink, setOpenseaLink] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !description.trim() || !openseaLink.trim()) { alert('Заполните все поля'); return; }
        if (!openseaLink.trim().toLowerCase().startsWith('http')) { alert('Ссылка должна начинаться с http'); return; }
        onAdd({ name: name.trim(), description: description.trim(), opensea_link: openseaLink.trim() });
    };

    return (
        <form onSubmit={handleSubmit} className="add-startup-form add-form">
            <h3>Добавить новый стартап</h3>
            <input type="text" placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
            <textarea placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} required disabled={isLoading} />
            <input type="url" placeholder="Ссылка OpenSea (https://...)" value={openseaLink} onChange={(e) => setOpenseaLink(e.target.value)} required pattern="https?://.+" title="URL с http(s)://" disabled={isLoading} className="input-opensea" />
            <div className="form-buttons">
                <button type="submit" disabled={isLoading}>{isLoading ? 'Добавление...' : 'Добавить'}</button>
                <button type="button" onClick={onCancel} className="cancel-button" disabled={isLoading}>Отмена</button>
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
    const [loading, setLoading] = useState(false); // Лоадер для ЗАГРУЗКИ списков
    const [fetchError, setFetchError] = useState('');

    // Состояния для РЕДАКТИРОВАНИЯ СРЕДСТВ
    const [editingStartupId, setEditingStartupId] = useState(null);
    const [editingFunds, setEditingFunds] = useState({});
    const [updatingFunds, setUpdatingFunds] = useState(false); // Лоадер для ОПЕРАЦИИ обновления

    const showMessage = (text, type) => { setMessage(text); setMessageType(type); setTimeout(() => { setMessage(''); setMessageType(''); }, 5000); };
    const authFetch = useCallback(async (url, options = {}) => { /* ... (Код authFetch без изменений) ... */
        const headers = { 'Content-Type': 'application/json', ...options.headers, 'Authorization': `Bearer ${token}`};
        // console.log(`AuthFetch to ${url}: Method=${options.method || 'GET'}`);
        try { const response = await fetch(`http://127.0.0.1:5000${url}`, { ...options, headers });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) { if (response.status === 401 || response.status === 422) { console.error(`Auth Error ${response.status}`); onLogout(); throw new Error(data.error || "Сессия недействительна"); } throw new Error(data.error || `Ошибка ${response.status}`); } return data;
        } catch (error) { console.error('AuthFetch failed:', error); throw error; }
     }, [token, onLogout]);

    // Загрузка Стартапов
    const fetchStartups = useCallback(() => {
        setLoading(true); setFetchError('');
        fetch('http://127.0.0.1:5000/startups')
            .then(r => { if (!r.ok) throw new Error(`Ошибка сети: ${r.status}`); return r.json(); }).then(setStartups)
            .catch(e => { console.error("Ошибка загрузки:", e); setFetchError(`Не удалось загрузить: ${e.message}`); }).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchStartups(); }, [fetchStartups]);

    // Добавление Стартапа
    const handleAddStartup = async (startupData) => {
        console.log("handleAddStartup:", startupData); setLoading(true);
        try { const data = await authFetch('/startups', { method: 'POST', body: JSON.stringify(startupData) }); showMessage(data.message || 'Добавлено!', 'success'); fetchStartups(); setShowAddStartupForm(false); }
        catch (error) { showMessage(`Ошибка: ${error.message}`, 'error'); } finally { setLoading(false); }
     };

    // --- Функции Редактирования Средств ---
    const handleEditFundsClick = (startup) => {
        setEditingStartupId(startup.id);
        const initialFunds = {};
        const currentFunds = startup.funds_raised || {}; // Обработка случая, если funds_raised нет
        for (const currency in currentFunds) { initialFunds[currency] = String(currentFunds[currency]); }
        for (const cur of ['ETH', 'BTC', 'USDT']) { if (!(cur in initialFunds)) { initialFunds[cur] = '0'; } }
        setEditingFunds(initialFunds);
    };

    const handleEditingFundsChange = (currency, value) => {
        const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        setEditingFunds(prev => ({ ...prev, [currency]: sanitizedValue }));
    };

    const handleSaveFunds = async (startupId) => {
        setUpdatingFunds(true); setMessage('');
        const fundsToSend = {}; let validationError = null;
        for (const currency in editingFunds) {
            const valueStr = editingFunds[currency].trim(); if (valueStr === '') continue;
            try {
                const amount = parseFloat(valueStr);
                if (isNaN(amount) || amount < 0) { throw new Error(); }
                fundsToSend[currency] = amount;
            } catch (e) { validationError = `Некорректное значение "${valueStr}" для ${currency}.`; break; }
        }
        if (validationError) { showMessage(validationError, 'error'); setUpdatingFunds(false); return; }

        console.log(`[AppContent] Сохранение средств для ${startupId}:`, fundsToSend);
        try {
            const data = await authFetch(`/startups/${startupId}/funds`, { method: 'PUT', body: JSON.stringify(fundsToSend) });
            showMessage(data.message || 'Средства обновлены!', 'success');
            setEditingStartupId(null); // Выход из режима редактирования
            // Опционально: обновить только один стартап локально, а не перезагружать все
             setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s));
            // fetchStartups(); // Или перезагрузить все
        } catch (error) { console.error("Ошибка сохранения средств:", error); showMessage(`Ошибка: ${error.message}`, 'error'); }
        finally { setUpdatingFunds(false); }
    };

    const handleCancelEditFunds = () => { setEditingStartupId(null); setEditingFunds({}); };
    // --- Конец функций Редактирования ---

    // Фильтрация стартапов
    const filteredStartups = startups.filter(startup =>
        startup.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- JSX ---
    return (
        <div className="app-container">
            <div className="app-header"> {/* Шапка */}
                 <h1>YourFuture</h1>
                 <div className="user-info">
                    <span className="user-greeting">Привет, <span>{username}!</span> {isAdmin && '(Админ)'}</span>
                    <button onClick={onLogout} className="logout-button">Выйти</button>
                 </div>
            </div>
            <div className="tabs-navigation"> {/* Вкладки */}
                 <button className={`tab-button ${activeTab === 'startups' ? 'active' : ''}`} onClick={() => setActiveTab('startups')}> Стартапы </button>
                 <button className={`tab-button ${activeTab === 'meetups' ? 'active' : ''}`} onClick={() => setActiveTab('meetups')}> Митапы </button>
                 <button className={`tab-button ${activeTab === 'vacancies' ? 'active' : ''}`} onClick={() => setActiveTab('vacancies')}> Вакансии </button>
            </div>
            {fetchError && <p className="message error">{fetchError}</p>}
            {message && <p className={`message ${messageType}`}>{message}</p>}

            <div className="tab-content-area">
                {/* Вкладка Стартапы */}
                {activeTab === 'startups' && (
                    <div className="startups-content">
                         <div className="search-container"> {/* Поиск */}
                             <input type="text" placeholder="Поиск..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={loading || updatingFunds} />
                         </div>
                         {/* Кнопка/Форма Добавить */}
                         {!showAddStartupForm && (<button onClick={() => setShowAddStartupForm(true)} className="add-button add-startup-button" disabled={loading || updatingFunds}> + Добавить стартап </button>)}
                         {showAddStartupForm && (<AddStartupForm onAdd={handleAddStartup} onCancel={() => setShowAddStartupForm(false)} isLoading={loading || updatingFunds} />)}
                         {/* Список */}
                         <div className="startup-list card-list">
                             {loading && startups.length === 0 && <p>Загрузка...</p>}
                             {!loading && startups.length === 0 && !fetchError && <p>Стартапов нет.</p>}
                             {!loading && startups.length > 0 && filteredStartups.length === 0 && (<p className="no-results-message">Ничего не найдено.</p>)}
                             {/* Передача пропсов для редактирования */}
                             {filteredStartups.map((startup) => (
                                 <StartupCard
                                     key={startup.id}
                                     startup={startup}
                                     currentUserId={userId}
                                     isAdmin={isAdmin}
                                     isEditing={editingStartupId === startup.id}
                                     editingFunds={editingFunds}
                                     onEditClick={handleEditFundsClick}
                                     onFundsChange={handleEditingFundsChange}
                                     onSaveClick={handleSaveFunds}
                                     onCancelClick={handleCancelEditFunds}
                                     isSaving={updatingFunds && editingStartupId === startup.id}
                                 />
                             ))}
                         </div>
                    </div>
                )}
                {/* Вкладка Митапы */}
                {activeTab === 'meetups' && ( <MeetupsTabContent token={token} isAdmin={isAdmin} authFetch={authFetch} /> )}
                {/* Вкладка Вакансии */}
                {activeTab === 'vacancies' && ( <VacanciesTabContent token={token} username={username} userId={userId} userRole={userRole} authFetch={authFetch} allStartups={startups} /> )}
            </div>
        </div>
    );
}

// --- Компонент верхнего уровня App ---
function App() { /* ... код компонента App БЕЗ ИЗМЕНЕНИЙ ... */
    const [token, setToken] = useState(localStorage.getItem('jwtToken')); const [username, setUsername] = useState(localStorage.getItem('username')); const [userRole, setUserRole] = useState(localStorage.getItem('userRole')); const [userId, setUserId] = useState(localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId'), 10) : null);
    const handleLoginSuccess = (newToken, loggedInUsername, loggedInUserRole) => { localStorage.setItem('jwtToken', newToken); localStorage.setItem('username', loggedInUsername); localStorage.setItem('userRole', loggedInUserRole); try { const payload = JSON.parse(atob(newToken.split('.')[1])); const loggedInUserId = payload.sub; if (loggedInUserId) { localStorage.setItem('userId', loggedInUserId); setUserId(parseInt(loggedInUserId, 10)); } else { handleLogout(); return; } } catch (error) { handleLogout(); return; } setToken(newToken); setUsername(loggedInUsername); setUserRole(loggedInUserRole); };
    const handleLogout = useCallback(() => { localStorage.clear(); setToken(null); setUsername(null); setUserRole(null); setUserId(null); }, []);
    useEffect(() => { const storedToken = localStorage.getItem('jwtToken'); const storedUsername = localStorage.getItem('username'); const storedUserRole = localStorage.getItem('userRole'); const storedUserIdStr = localStorage.getItem('userId'); if (storedToken && storedUsername && storedUserRole && storedUserIdStr) { setToken(storedToken); setUsername(storedUsername); setUserRole(storedUserRole); setUserId(parseInt(storedUserIdStr, 10)); } else if (token || username || userRole || userId !== null) { handleLogout(); } }, [handleLogout, token, username, userRole, userId]);
    return ( <div> {token && username && userRole && userId !== null ? (<AppContent token={token} username={username} userId={userId} userRole={userRole} onLogout={handleLogout} /> ) : ( <Auth onLoginSuccess={handleLoginSuccess} /> )} </div> );
}

export default App;
