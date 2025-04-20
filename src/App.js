// src/App.js (ПОЛНЫЙ КОД - с функциями модерации стартапов)

import React, { useState, useEffect, useCallback } from 'react';
// Импорты компонентов
import StartupCard from './StartupCard'; // Импортируем обновленный
import { Auth } from './Auth';
import MeetupsTabContent from './MeetupsTabContent';
import VacanciesTabContent from './VacanciesTabContent';
import ProfileTabContent from './ProfileTabContent';
import AddStartupForm from './AddStartupForm';


// --- Основное содержимое приложения ---
function AppContent({ token, username, userId, userRole, onLogout }) {
    const [activeTab, setActiveTab] = useState('startups');
    const isAdmin = userRole === 'admin';
    const [startups, setStartups] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddStartupForm, setShowAddStartupForm] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [loading, setLoading] = useState(false); // Лоадер для ЗАГРУЗКИ списков (стартапы)
    const [fetchError, setFetchError] = useState('');

    // Состояния для редактирования средств стартапа
    const [editingStartupId, setEditingStartupId] = useState(null);
    const [editingFunds, setEditingFunds] = useState({});
    const [updatingFunds, setUpdatingFunds] = useState(false); // Лоадер для операций PUT (средства, модерация)

    // Состояние для данных профиля
    const [userProfileData, setUserProfileData] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // --- ФУНКЦИИ ---
    const showMessage = (text, type = 'info') => {
        setMessage(text); setMessageType(type);
        setTimeout(() => { setMessage(''); setMessageType(''); }, 5000);
    };

    const authFetch = useCallback(async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...options.headers, 'Authorization': `Bearer ${token}` };
        console.log(`AuthFetch to ${url}: Method=${options.method || 'GET'}`);
        try {
            const response = await fetch(`http://127.0.0.1:5000${url}`, { ...options, headers });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 401 || response.status === 422) { console.error(`Auth Error ${response.status}`); onLogout(); throw new Error(data.error || "Сессия недействительна"); }
                throw new Error(data.error || `Ошибка ${response.status}`);
            }
            return data;
        } catch (error) { console.error('AuthFetch failed:', error); throw error; }
    }, [token, onLogout]);

    // Загрузка Стартапов (теперь через authFetch)
    const fetchStartups = useCallback(() => {
        setLoading(true); setFetchError('');
        console.log("[AppContent] Загрузка стартапов...");
        authFetch('/startups') // Используем authFetch
            .then(data => { setStartups(data); console.log("[AppContent] Стартапы загружены:", data.length); })
            .catch(error => { console.error("Ошибка загрузки стартапов:", error); setFetchError(`Не удалось загрузить стартапы: ${error.message}`); })
            .finally(() => { setLoading(false); });
    }, [authFetch]); // Зависимость от authFetch

    // Загрузка профиля
    const fetchUserProfile = useCallback(() => {
        console.log("[AppContent] Загрузка/Обновление профиля пользователя...");
        setLoadingProfile(true);
        authFetch('/profile')
            .then(data => { setUserProfileData(data); console.log("[AppContent] Профиль загружен/обновлен:", data); })
            .catch(err => { console.error("Ошибка загрузки/обновления профиля:", err); showMessage(`Ошибка профиля: ${err.message}`, 'error'); setUserProfileData(null); })
            .finally(() => { setLoadingProfile(false); });
    }, [authFetch, showMessage]);

    // Загружаем стартапы и профиль при монтировании
    useEffect(() => {
        fetchStartups();
        fetchUserProfile();
    }, []); // Пустой массив зависимостей

    // Добавление Стартапа
    const handleAddStartup = async (startupData) => {
        console.log("handleAddStartup:", startupData);
        setLoading(true); // Используем общий лоадер?
        try {
            const data = await authFetch('/startups', { method: 'POST', body: JSON.stringify(startupData) });
            showMessage(data.message || 'Стартап отправлен на рассмотрение!', 'success');
            setStartups(prev => [data.startup, ...prev]); // Добавляем локально
            setShowAddStartupForm(false);
        } catch (error) { showMessage(`Ошибка добавления: ${error.message}`, 'error'); }
        finally { setLoading(false); }
     };

    // Редактирование средств стартапа
    const handleEditFundsClick = (startup) => { console.log("Ред. средств для:", startup.id); setEditingStartupId(startup.id); const initialFunds = {}; const currentFunds = startup.funds_raised || {}; for (const currency in currentFunds) { initialFunds[currency] = String(currentFunds[currency]); } for (const cur of ['ETH', 'BTC', 'USDT']) { if (!(cur in initialFunds)) { initialFunds[cur] = '0'; } } setEditingFunds(initialFunds); };
    const handleEditingFundsChange = (currency, value) => { const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); setEditingFunds(prev => ({ ...prev, [currency]: sanitizedValue })); };
    const handleSaveFunds = async (startupId) => { setUpdatingFunds(true); setMessage(''); const fundsToSend = {}; let validationError = null; for (const currency in editingFunds) { const valueStr = editingFunds[currency].trim(); if (valueStr === '') { fundsToSend[currency] = 0; continue; } try { const amount = parseFloat(valueStr); if (isNaN(amount) || amount < 0) { throw new Error(); } fundsToSend[currency] = amount; } catch (e) { validationError = `Некорректное значение для ${currency}.`; break; } } if (validationError) { showMessage(validationError, 'error'); setUpdatingFunds(false); return; } console.log(`Сохранение средств для ${startupId}:`, fundsToSend); try { const data = await authFetch(`/startups/${startupId}/funds`, { method: 'PUT', body: JSON.stringify(fundsToSend) }); showMessage(data.message || 'Средства обновлены!', 'success'); setEditingStartupId(null); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s )); } catch (error) { console.error("Ошибка:", error); showMessage(`Ошибка: ${error.message}`, 'error'); } finally { setUpdatingFunds(false); } };
    const handleCancelEditFunds = () => { console.log("Отмена ред. средств"); setEditingStartupId(null); setEditingFunds({}); };

    // Модерация Стартапов
    const handleApproveStartup = async (startupId) => {
        console.log(`[AppContent] Одобрение стартапа ${startupId}`);
        setUpdatingFunds(true); // Используем общий лоадер операций
        try {
            const data = await authFetch(`/startups/${startupId}/approve`, { method: 'PUT' });
            showMessage(data.message || 'Стартап одобрен!', 'success');
            // Обновляем стартап локально из ответа бэкенда
            setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s));
        } catch (err) { console.error(`Ошибка одобрения стартапа ${startupId}:`, err); showMessage(`Ошибка: ${err.message}`, 'error'); }
        finally { setUpdatingFunds(false); }
    };
    const handleRejectStartup = async (startupId, reason) => {
        console.log(`[AppContent] Отклонение стартапа ${startupId}`);
        setUpdatingFunds(true);
        try {
            const data = await authFetch(`/startups/${startupId}/reject`, { method: 'PUT', body: JSON.stringify({ reason: reason }) });
            showMessage(data.message || 'Стартап отклонен!', 'success');
            // Обновляем стартап локально из ответа бэкенда
            setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s));
        } catch (err) { console.error(`Ошибка отклонения стартапа ${startupId}:`, err); showMessage(`Ошибка: ${err.message}`, 'error'); }
        finally { setUpdatingFunds(false); }
    };

    // Фильтрация стартапов
    const filteredStartups = startups.filter(startup =>
        startup.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    console.log("[AppContent] Rendering, isAdmin:", isAdmin, "userRole:", userRole);

    // --- JSX ---
    return (
        <div className="app-container">
            <div className="app-header"> <h1 onClick={() => window.location.reload()} style={{cursor: 'pointer'}}>Инвестируйте в Будущее!</h1> <div className="user-info"> <span className="user-greeting">Привет, <span>{username}!</span> {isAdmin && '(Админ)'}</span> <button onClick={onLogout} className="logout-button">Выйти</button> </div> </div>
            <div className="tabs-navigation"> <button className={`tab-button ${activeTab === 'startups' ? 'active' : ''}`} onClick={() => setActiveTab('startups')}> Стартапы </button> <button className={`tab-button ${activeTab === 'meetups' ? 'active' : ''}`} onClick={() => setActiveTab('meetups')}> Митапы </button> <button className={`tab-button ${activeTab === 'vacancies' ? 'active' : ''}`} onClick={() => setActiveTab('vacancies')}> Вакансии </button> <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}> Личный кабинет </button> </div>
            {fetchError && <p className="message error">{fetchError}</p>} {message && <p className={`message ${messageType}`}>{message}</p>} {(loading || (loadingProfile && !userProfileData)) && <p>Загрузка данных...</p>}

            <div className="tab-content-area">
                {/* Вкладка Стартапы */}
                {activeTab === 'startups' && (
                    <div className="startups-content">
                         <div className="search-container"> <input type="text" placeholder="Поиск..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={loading || updatingFunds} /> </div>
                         {/* Кнопка Добавить доступна всем */}
                         {!showAddStartupForm && (<button onClick={() => setShowAddStartupForm(true)} className="add-button add-startup-button" disabled={loading || updatingFunds}> + Добавить стартап </button>)}
                         {showAddStartupForm && (<AddStartupForm onAdd={handleAddStartup} onCancel={() => setShowAddStartupForm(false)} isLoading={loading || updatingFunds} />)}
                         <div className="startup-list card-list">
                             {(loading) && startups.length === 0 && <p>Загрузка...</p>}
                             {!loading && startups.length === 0 && !fetchError && <p>Нет стартапов.</p>}
                             {!loading && startups.length > 0 && filteredStartups.length === 0 && (<p className="no-results-message">Нет результатов.</p>)}
                             {/* Передаем функции модерации стартапов */}
                             {filteredStartups.map((startup) => (
                                 <StartupCard key={startup.id} startup={startup} currentUserId={userId} isAdmin={isAdmin}
                                     isEditing={editingStartupId === startup.id} editingFunds={editingFunds}
                                     onEditClick={handleEditFundsClick} onFundsChange={handleEditingFundsChange}
                                     onSaveClick={handleSaveFunds} onCancelClick={handleCancelEditFunds}
                                     isSaving={updatingFunds && editingStartupId === startup.id}
                                     onApprove={handleApproveStartup} // Передаем новую функцию
                                     onReject={handleRejectStartup}   // Передаем новую функцию
                                 />
                             ))}
                         </div>
                    </div>
                )}
                {/* Вкладка Митапы */}
                {activeTab === 'meetups' && ( <MeetupsTabContent token={token} userId={userId} isAdmin={isAdmin} authFetch={authFetch} showMessage={showMessage} /> )}
                {/* Вкладка Вакансии */}
                {activeTab === 'vacancies' && ( <VacanciesTabContent token={token} username={username} userId={userId} userRole={userRole} isAdmin={isAdmin} authFetch={authFetch} allStartups={startups} showMessage={showMessage} userProfileData={userProfileData} /> )}
                {/* Вкладка Личный кабинет */}
                {activeTab === 'profile' && ( <ProfileTabContent token={token} userId={userId} authFetch={authFetch} showMessage={showMessage} onProfileUpdate={fetchUserProfile} /> )}
            </div>
        </div>
    );
}


// --- Компонент верхнего уровня App ---
function App() {
    const [token, setToken] = useState(localStorage.getItem('jwtToken'));
    const [username, setUsername] = useState(localStorage.getItem('username'));
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));
    const [userId, setUserId] = useState(localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId'), 10) : null);

    const handleLoginSuccess = (newToken, loggedInUsername, loggedInUserRole) => { localStorage.setItem('jwtToken', newToken); localStorage.setItem('username', loggedInUsername); localStorage.setItem('userRole', loggedInUserRole); try { const payload = JSON.parse(atob(newToken.split('.')[1])); const loggedInUserId = payload.sub; if (loggedInUserId) { localStorage.setItem('userId', loggedInUserId); setUserId(parseInt(loggedInUserId, 10)); } else { console.error("Нет ID в токене"); handleLogout(); return; } } catch (error) { console.error("Ошибка:", error); handleLogout(); return; } setToken(newToken); setUsername(loggedInUsername); setUserRole(loggedInUserRole); };
    const handleLogout = useCallback(() => { localStorage.clear(); setToken(null); setUsername(null); setUserRole(null); setUserId(null); }, []);
    useEffect(() => { const storedToken = localStorage.getItem('jwtToken'); const storedUsername = localStorage.getItem('username'); const storedUserRole = localStorage.getItem('userRole'); const storedUserIdStr = localStorage.getItem('userId'); if (storedToken && storedUsername && storedUserRole && storedUserIdStr) { setToken(storedToken); setUsername(storedUsername); setUserRole(storedUserRole); setUserId(parseInt(storedUserIdStr, 10)); } else if (token || username || userRole || userId !== null) { handleLogout(); } }, [handleLogout, token, username, userRole, userId]);

    return ( <div> {token && username && userRole && userId !== null ? ( <AppContent token={token} username={username} userId={userId} userRole={userRole} onLogout={handleLogout} /> ) : ( <Auth onLoginSuccess={handleLoginSuccess} /> )} </div> );
}
export default App;
