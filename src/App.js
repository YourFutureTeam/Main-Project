// src/App.js (ПОЛНЫЙ КОД - Логика этапов в AppContent)

import React, { useState, useEffect, useCallback } from 'react';
// Импорты компонентов
import StartupCard from './StartupCard';
import { Auth } from './Auth';
import MeetupsTabContent from './MeetupsTabContent';
import VacanciesTabContent from './VacanciesTabContent';
import ProfileTabContent from './ProfileTabContent';
import AddStartupForm from './AddStartupForm';
import './App.css';
import { STARTUP_STAGES, getStageOrder } from './constants'; // Импорт констант

// --- Основное содержимое приложения ---
function AppContent({ token, username, userId, userRole, onLogout }) {
    // --- Состояния ---
    const [activeTab, setActiveTab] = useState('startups');
    const isAdmin = userRole === 'admin';
    const [startups, setStartups] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnlyMyStartups, setShowOnlyMyStartups] = useState(false);
    const [showAddStartupForm, setShowAddStartupForm] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [loadingStartups, setLoadingStartups] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [editingStartupId, setEditingStartupId] = useState(null); // Ред. средств
    const [editingFunds, setEditingFunds] = useState({});
    const [editingTimelineStartupId, setEditingTimelineStartupId] = useState(null); // Ред. Timeline
    const [editingTimelineData, setEditingTimelineData] = useState({});
    const [updatingFundsOrTimeline, setUpdatingFundsOrTimeline] = useState(false); // Общий лоадер PUT/POST
    const [userProfileData, setUserProfileData] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // --- Функции ---
    const showMessage = useCallback((text, type = 'info') => {
        setMessage(text); setMessageType(type);
        setTimeout(() => { setMessage(''); setMessageType(''); }, 5000);
    }, []);

    const authFetch = useCallback(async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...options.headers, 'Authorization': `Bearer ${token}` };
        try {
            const response = await fetch(`http://127.0.0.1:5000${url}`, { ...options, headers });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 401 || response.status === 422 || (response.status === 404 && url.endsWith('/profile'))) {
                    console.error(`Auth Error ${response.status} on ${url} -> Logging out`);
                    onLogout(); return null;
                }
                throw new Error(data.error || `Ошибка ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`AuthFetch failed for ${url}:`, error);
             if (!error.message?.includes("Сессия") && !error.message?.includes("Данные пользователя не найдены")) { throw error; }
             return null;
        }
    }, [token, onLogout]);

    const fetchUserProfile = useCallback(() => {
        setLoadingProfile(true);
        authFetch('/profile')
            .then(data => { if (data) setUserProfileData(data); })
            .catch(err => { showMessage(`Ошибка профиля: ${err.message}`, 'error'); })
            .finally(() => { setLoadingProfile(false); });
    }, [authFetch, showMessage]);

    const fetchStartups = useCallback(() => {
        if (!userProfileData) return;
        setLoadingStartups(true); setFetchError('');
        const url = `/startups${showOnlyMyStartups ? '?filter_by_creator=true' : ''}`;
        authFetch(url)
            .then(data => { if (data) setStartups(data); })
            .catch(error => { setFetchError(`Ошибка стартапов: ${error.message}`); })
            .finally(() => { setLoadingStartups(false); });
    }, [authFetch, showOnlyMyStartups, userProfileData]);

    useEffect(() => { fetchUserProfile(); }, [fetchUserProfile]);
    useEffect(() => { if (!loadingProfile && userProfileData) { fetchStartups(); } }, [loadingProfile, userProfileData, showOnlyMyStartups, fetchStartups]);

    // --- ОБРАБОТЧИКИ ДЕЙСТВИЙ ---
    const handleAddStartup = async (startupData) => {
        if (!userProfileData?.telegram || !userProfileData?.resume_link) { showMessage('Заполните TG и резюме в ЛК.', 'error'); return; }
        setUpdatingFundsOrTimeline(true);
        try {
            const data = await authFetch('/startups', { method: 'POST', body: JSON.stringify(startupData) });
            if (data) { showMessage(data.message || 'На рассмотрении!', 'success'); fetchStartups(); setShowAddStartupForm(false); }
        } catch (error) { showMessage(`Ошибка: ${error.message}`, 'error'); }
        finally { setUpdatingFundsOrTimeline(false); }
     };
    const handleEditFundsClick = (startup) => { setEditingTimelineStartupId(null); setEditingStartupId(startup.id); const iF = {}; const cF = startup.funds_raised || {}; for (const c in cF) { iF[c] = String(cF[c]); } for (const c of ['ETH','BTC','USDT']) { if (!(c in iF)) iF[c] = '0'; } setEditingFunds(iF); };
    const handleEditingFundsChange = (currency, value) => { const sV = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); setEditingFunds(prev => ({ ...prev, [currency]: sV })); };
    const handleSaveFunds = async (startupId) => { setUpdatingFundsOrTimeline(true); const fS = {}; let vE = null; for (const c in editingFunds) { const vS = editingFunds[c].trim(); if (vS === '') { fS[c] = 0; continue; } try { const a = parseFloat(vS); if (isNaN(a) || a < 0) throw new Error(); fS[c] = a; } catch (e) { vE = `Значение ${c}?`; break; } } if (vE) { showMessage(vE, 'error'); setUpdatingFundsOrTimeline(false); return; } try { const data = await authFetch(`/startups/${startupId}/funds`, { method: 'PUT', body: JSON.stringify(fS) }); if (data) { showMessage(data.message || 'Обновлено!', 'success'); setEditingStartupId(null); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s )); } } catch (error) { showMessage(`Ошибка: ${error.message}`, 'error'); } finally { setUpdatingFundsOrTimeline(false); } };
    const handleCancelEditFunds = () => { setEditingStartupId(null); setEditingFunds({}); };
    const handleApproveStartup = async (startupId) => { setUpdatingFundsOrTimeline(true); try { const data = await authFetch(`/startups/${startupId}/approve`, { method: 'PUT' }); if (data) { showMessage(data.message || 'Одобрено!', 'success'); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s)); } } catch (err) { showMessage(`Ошибка: ${err.message}`, 'error'); } finally { setUpdatingFundsOrTimeline(false); } };
    const handleRejectStartup = async (startupId, reason) => { setUpdatingFundsOrTimeline(true); try { const data = await authFetch(`/startups/${startupId}/reject`, { method: 'PUT', body: JSON.stringify({ reason: reason }) }); if (data) { showMessage(data.message || 'Отклонено!', 'success'); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s)); } } catch (err) { showMessage(`Ошибка: ${err.message}`, 'error'); } finally { setUpdatingFundsOrTimeline(false); } };
    const handleEditTimelineClick = (startup) => { setEditingStartupId(null); setEditingTimelineStartupId(startup.id); const currentOrder = getStageOrder(startup.current_stage); const initialTimeline = {}; for (const stage of STARTUP_STAGES) { if (stage.order > currentOrder) { initialTimeline[stage.key] = startup.stage_timeline?.[stage.key] || ''; } } setEditingTimelineData(initialTimeline); };
    const handleTimelineDateChange = (stageKey, dateValue) => { setEditingTimelineData(prev => ({ ...prev, [stageKey]: dateValue })); };
    const handleSaveTimeline = async (startupId) => { setUpdatingFundsOrTimeline(true); const timelineToSend = {}; for (const key in editingTimelineData) { timelineToSend[key] = editingTimelineData[key] || null; } try { const data = await authFetch(`/startups/${startupId}/timeline`, { method: 'PUT', body: JSON.stringify(timelineToSend) }); if (data) { showMessage(data.message || 'План обновлен!', 'success'); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s)); setEditingTimelineStartupId(null); } } catch (error) { showMessage(`Ошибка: ${error.message}`, 'error'); } finally { setUpdatingFundsOrTimeline(false); } };
    const handleCancelEditTimeline = () => { setEditingTimelineStartupId(null); setEditingTimelineData({}); };

    // Фильтрация
    const filteredStartups = startups.filter(startup => startup.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Рендеринг AppContent
    if (loadingProfile) return <p>Загрузка...</p>;
    if (!userProfileData) return <p className="message error">Ошибка профиля.</p>;

    return (
        <div className="app-container">
            <div className="app-header"> <h1 onClick={() => window.location.reload()} style={{cursor: 'pointer'}}>YourFuture</h1> <div className="user-info"> <span className="user-greeting">Привет, <span>{username}!</span> {isAdmin && '(Админ)'}</span> <button onClick={onLogout} className="logout-button">Выйти</button> </div> </div>
            <div className="tabs-navigation"> <button className={`tab-button ${activeTab === 'startups' ? 'active' : ''}`} onClick={() => setActiveTab('startups')}> Стартапы </button> <button className={`tab-button ${activeTab === 'meetups' ? 'active' : ''}`} onClick={() => setActiveTab('meetups')}> Митапы </button> <button className={`tab-button ${activeTab === 'vacancies' ? 'active' : ''}`} onClick={() => setActiveTab('vacancies')}> Вакансии </button> <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}> Личный кабинет </button> </div>
            {fetchError && <p className="message error">{fetchError}</p>} {message && <p className={`message ${messageType}`}>{message}</p>}
            {updatingFundsOrTimeline && <p>Выполняется операция...</p>}

            <div className="tab-content-area">
                {activeTab === 'startups' && (
                    <div className="startups-content">
                        <div className="search-and-filter-container">
                            <div className="search-container"> <input type="text" placeholder="Поиск..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={loadingStartups || updatingFundsOrTimeline} /> </div>
                            <div className="filter-container"> <input type="checkbox" id="showOnlyMyStartups" checked={showOnlyMyStartups} onChange={(e) => setShowOnlyMyStartups(e.target.checked)} disabled={loadingStartups || updatingFundsOrTimeline} /> <label htmlFor="showOnlyMyStartups">Только мои</label> </div>
                        </div>
                        {!showAddStartupForm && (<button onClick={() => setShowAddStartupForm(true)} className="add-button add-startup-button" disabled={loadingStartups || updatingFundsOrTimeline}> + Добавить стартап </button>)}
                        {showAddStartupForm && (<AddStartupForm onAdd={handleAddStartup} onCancel={() => setShowAddStartupForm(false)} isLoading={updatingFundsOrTimeline} />)}
                        <div className="startup-list card-list">
                            {loadingStartups && startups.length === 0 && <p>Загрузка...</p>}
                            {!loadingStartups && startups.length === 0 && !fetchError && <p>Нет стартапов{showOnlyMyStartups ? ', ваших' : ''}.</p>}
                            {!loadingStartups && startups.length > 0 && filteredStartups.length === 0 && (<p className="no-results-message">Нет результатов.</p>)}
                            {filteredStartups.map((startup) => (
                                <StartupCard
                                    key={startup.id} startup={startup} currentUserId={userId} isAdmin={isAdmin}
                                    isEditingFunds={editingStartupId === startup.id}
                                    editingFunds={editingFunds}
                                    onEditFundsClick={handleEditFundsClick}
                                    onFundsChange={handleEditingFundsChange}
                                    onSaveFundsClick={handleSaveFunds}
                                    onCancelEditFundsClick={handleCancelEditFunds}
                                    onApprove={handleApproveStartup}
                                    onReject={handleRejectStartup}
                                    isEditingTimeline={editingTimelineStartupId === startup.id}
                                    editingTimelineData={editingTimelineData}
                                    onEditTimelineClick={handleEditTimelineClick}
                                    onTimelineDateChange={handleTimelineDateChange}
                                    onSaveTimelineClick={handleSaveTimeline}
                                    onCancelEditTimelineClick={handleCancelEditTimeline}
                                    isSaving={updatingFundsOrTimeline && (editingStartupId === startup.id || editingTimelineStartupId === startup.id)}
                                />
                             ))}
                        </div>
                    </div>
                )}
                {activeTab === 'meetups' && ( <MeetupsTabContent token={token} userId={userId} isAdmin={isAdmin} authFetch={authFetch} showMessage={showMessage} userProfileData={userProfileData} /> )}
                {activeTab === 'vacancies' && ( <VacanciesTabContent token={token} username={username} userId={userId} userRole={userRole} isAdmin={isAdmin} authFetch={authFetch} allStartups={startups} showMessage={showMessage} userProfileData={userProfileData} /> )}
                {activeTab === 'profile' && ( <ProfileTabContent token={token} userId={userId} authFetch={authFetch} showMessage={showMessage} onProfileUpdate={fetchUserProfile} /> )}
            </div>
        </div>
    );
}

// --- Компонент верхнего уровня App ---
function App() {
    const getInitialState = (key, parse = false) => { try { const item = localStorage.getItem(key); if (!item) return null; if (parse) { try { return parseInt(item, 10); } catch { return null; } } return item; } catch (error) { console.error("Ошибка:", error); return null; } };
    const [token, setToken] = useState(() => getInitialState('jwtToken'));
    const [username, setUsername] = useState(() => getInitialState('username'));
    const [userRole, setUserRole] = useState(() => getInitialState('userRole'));
    const [userId, setUserId] = useState(() => getInitialState('userId', true));

    const handleLoginSuccess = (newToken, loggedInUsername, loggedInUserRole) => {
        localStorage.setItem('jwtToken', newToken); localStorage.setItem('username', loggedInUsername); localStorage.setItem('userRole', loggedInUserRole);
        try { const payload = JSON.parse(atob(newToken.split('.')[1])); const loggedInUserId = payload.sub; if (loggedInUserId !== undefined && loggedInUserId !== null) { localStorage.setItem('userId', loggedInUserId); setUserId(parseInt(loggedInUserId, 10)); setUsername(loggedInUsername); setUserRole(loggedInUserRole); setToken(newToken); } else { console.error("Нет ID"); handleLogout(); } } catch (error) { console.error("Ошибка:", error); handleLogout(); }
    };
    const handleLogout = useCallback(() => { console.log("Logout..."); localStorage.clear(); setToken(null); setUsername(null); setUserRole(null); setUserId(null); }, []);

    // Рендеринг Auth или AppContent СРАЗУ на основе token
    return (
        <div>
            {token && userId !== null && username && userRole ? ( // Проверяем все данные
                <AppContent token={token} username={username} userId={userId} userRole={userRole} onLogout={handleLogout} />
            ) : (
                <Auth onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
}
export default App;
