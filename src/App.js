// src/App.js (ПОЛНЫЙ КОД - ВСЕ КОММЕНТАРИИ ЗАМЕНЕНЫ НА КОД)

import React, { useState, useEffect, useCallback } from 'react';
// Импорты компонентов
import StartupCard from './StartupCard';
import LandingPage from './LandingPage'; // Приветственная страница
import MeetupsTabContent from './MeetupsTabContent'; // Компонент для вкладки "Митапы"
import VacanciesTabContent from './VacanciesTabContent'; // Компонент для вкладки "Вакансии"
import ProfileTabContent from './ProfileTabContent'; // Компонент для вкладки "ЛК"
import AddStartupForm from './AddStartupForm'; // Компонент формы добавления стартапа
import './App.css';
import { STARTUP_STAGES, getStageOrder } from './constants'; // Константы этапов


// --- Основное содержимое приложения (AppContent) ---
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
    const [editingStartupId, setEditingStartupId] = useState(null);
    const [editingFunds, setEditingFunds] = useState({});
    const [editingTimelineStartupId, setEditingTimelineStartupId] = useState(null);
    const [editingTimelineData, setEditingTimelineData] = useState({});
    const [updatingOperation, setUpdatingOperation] = useState(false); // Общий лоадер
    const [userProfileData, setUserProfileData] = useState(null); // Профиль пользователя
    const [loadingProfile, setLoadingProfile] = useState(true); // Лоадер для профиля

    // --- Функции ---
    const showMessage = useCallback((text, type = 'info') => { setMessage(text); setMessageType(type); setTimeout(() => { setMessage(''); setMessageType(''); }, 5000); }, []);
    const authFetch = useCallback(async (url, options = {}) => { const headers = { 'Content-Type': 'application/json', ...options.headers, 'Authorization': `Bearer ${token}` }; try { const response = await fetch(`http://127.0.0.1:5000${url}`, { ...options, headers }); const data = await response.json().catch(() => ({})); if (!response.ok) { if (response.status === 401 || response.status === 422 || (response.status === 404 && url.endsWith('/profile'))) { console.error(`Auth Error ${response.status} on ${url} -> Logout`); onLogout(); return null; } throw new Error(data.error || `Ошибка ${response.status}`); } return data; } catch (error) { console.error(`AuthFetch fail:`, error); if (!error.message?.includes("Сессия") && !error.message?.includes("Данные пользователя")) { throw error; } return null; } }, [token, onLogout]);
    const fetchUserProfile = useCallback(() => { setLoadingProfile(true); authFetch('/profile').then(data => { if (data) setUserProfileData(data); }).catch(err => { showMessage(`Профиль: ${err.message}`, 'error'); }).finally(() => { setLoadingProfile(false); }); }, [authFetch, showMessage]);
    const fetchStartups = useCallback(() => { if (!userProfileData) return; setLoadingStartups(true); setFetchError(''); const url = `/startups${showOnlyMyStartups ? '?filter_by_creator=true' : ''}`; authFetch(url).then(data => { if (data) setStartups(data); }).catch(error => { setFetchError(`Стартапы: ${error.message}`); }).finally(() => { setLoadingStartups(false); }); }, [authFetch, showOnlyMyStartups, userProfileData]);

    // --- Эффекты ---
    useEffect(() => { fetchUserProfile(); }, [fetchUserProfile]); // Загрузка профиля при монтировании
    useEffect(() => { if (!loadingProfile && userProfileData) { fetchStartups(); } }, [loadingProfile, userProfileData, showOnlyMyStartups, fetchStartups]); // Загрузка стартапов после профиля

    // --- ОБРАБОТЧИКИ ДЕЙСТВИЙ (полностью развернуты) ---
    const handleAddStartup = async (startupData) => { if (!userProfileData?.telegram || !userProfileData?.resume_link) { showMessage('Заполните TG/резюме в ЛК', 'error'); return; } setUpdatingOperation(true); try { const data = await authFetch('/startups', { method: 'POST', body: JSON.stringify(startupData) }); if (data) { showMessage(data.message || 'На рассмотрении!', 'success'); fetchStartups(); setShowAddStartupForm(false); } } catch (error) { showMessage(`Ошибка: ${error.message}`, 'error'); } finally { setUpdatingOperation(false); } };
    const handleEditFundsClick = (startup) => { setEditingTimelineStartupId(null); setEditingStartupId(startup.id); const iF = {}; const cF = startup.funds_raised || {}; for (const c in cF) iF[c] = String(cF[c]); for (const c of ['ETH','BTC','USDT']) if (!(c in iF)) iF[c] = '0'; setEditingFunds(iF); };
    const handleEditingFundsChange = (currency, value) => { const sV = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); setEditingFunds(prev => ({ ...prev, [currency]: sV })); };
    const handleSaveFunds = async (startupId) => { setUpdatingOperation(true); const fS = {}; let vE = null; for (const c in editingFunds) { const vS = editingFunds[c].trim(); if (vS === '') { fS[c] = 0; continue; } try { const a = parseFloat(vS); if (isNaN(a) || a < 0) throw new Error(); fS[c] = a; } catch (e) { vE = `Значение ${c}?`; break; } } if (vE) { showMessage(vE, 'error'); setUpdatingOperation(false); return; } try { const data = await authFetch(`/startups/${startupId}/funds`, { method: 'PUT', body: JSON.stringify(fS) }); if (data) { showMessage(data.message || 'Обновлено!', 'success'); setEditingStartupId(null); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s )); } } catch (error) { showMessage(`Ошибка: ${error.message}`, 'error'); } finally { setUpdatingOperation(false); } };
    const handleCancelEditFunds = () => { setEditingStartupId(null); setEditingFunds({}); };
    const handleApproveStartup = async (startupId) => { setUpdatingOperation(true); try { const data = await authFetch(`/startups/${startupId}/approve`, { method: 'PUT' }); if (data) { showMessage(data.message || 'Одобрено!', 'success'); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s)); } } catch (err) { showMessage(`Ошибка: ${err.message}`, 'error'); } finally { setUpdatingOperation(false); } };
    const handleRejectStartup = async (startupId, reason) => { setUpdatingOperation(true); try { const data = await authFetch(`/startups/${startupId}/reject`, { method: 'PUT', body: JSON.stringify({ reason: reason }) }); if (data) { showMessage(data.message || 'Отклонено!', 'success'); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s)); } } catch (err) { showMessage(`Ошибка: ${err.message}`, 'error'); } finally { setUpdatingOperation(false); } };
    const handleEditTimelineClick = (startup) => { setEditingStartupId(null); setEditingTimelineStartupId(startup.id); const cO = getStageOrder(startup.current_stage); const iT = {}; for (const s of STARTUP_STAGES) { if (s.order > cO) iT[s.key] = startup.stage_timeline?.[s.key] || ''; } setEditingTimelineData(iT); };
    const handleTimelineDateChange = (stageKey, dateValue) => { setEditingTimelineData(prev => ({ ...prev, [stageKey]: dateValue })); };
    const handleSaveTimeline = async (startupId) => { setUpdatingOperation(true); const tS = {}; for (const k in editingTimelineData) tS[k] = editingTimelineData[k] || null; try { const data = await authFetch(`/startups/${startupId}/timeline`, { method: 'PUT', body: JSON.stringify(tS) }); if (data) { showMessage(data.message || 'План обновлен!', 'success'); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s)); setEditingTimelineStartupId(null); } } catch (error) { showMessage(`Ошибка: ${error.message}`, 'error'); } finally { setUpdatingOperation(false); } };
    const handleCancelEditTimeline = () => { setEditingTimelineStartupId(null); setEditingTimelineData({}); };
    const handleToggleHold = async (startupId) => { setUpdatingOperation(true); try { const data = await authFetch(`/startups/${startupId}/toggle_hold`, { method: 'PUT' }); if (data && data.startup) { showMessage(data.message || 'Статус обновлен!', 'success'); setStartups(prev => prev.map(s => s.id === startupId ? data.startup : s)); } else if (data) { showMessage(data.message || 'Статус обновлен!', 'success'); fetchStartups(); } } catch (error) { showMessage(`Ошибка: ${error.message}`, 'error'); } finally { setUpdatingOperation(false); } };

    // Фильтрация стартапов
    const filteredStartups = startups.filter(startup => startup.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Рендеринг AppContent
    if (loadingProfile) return <p>Загрузка...</p>;
    if (!userProfileData) return <p className="message error">Ошибка профиля.</p>;

    return (
        <div className="app-container">
            <div className="app-header">
                <h1 onClick={() => window.location.reload()} style={{cursor: 'pointer'}}>YourFuture</h1> {/* Изменен заголовок */}
                <div className="user-info">
                    <span className="user-greeting">Привет, <span>{username}!</span> {isAdmin && '(Админ)'}</span>
                    <button onClick={onLogout} className="logout-button">Выйти</button>
                </div>
            </div>
            <div className="tabs-navigation">
                <button className={`tab-button ${activeTab === 'startups' ? 'active' : ''}`} onClick={() => setActiveTab('startups')}>Стартапы</button>
                <button className={`tab-button ${activeTab === 'meetups' ? 'active' : ''}`} onClick={() => setActiveTab('meetups')}>Митапы</button>
                <button className={`tab-button ${activeTab === 'vacancies' ? 'active' : ''}`} onClick={() => setActiveTab('vacancies')}>Вакансии</button>
                <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Личный кабинет</button>
            </div>
            {fetchError && <p className="message error">{fetchError}</p>}
            {message && <p className={`message ${messageType}`}>{message}</p>}
            {updatingOperation && <p>Выполняется операция...</p>}

            {/* ---> РЕНДЕРИНГ КОНТЕНТА ВКЛАДОК (БЕЗ КОММЕНТАРИЕВ) <--- */}
            <div className="tab-content-area">
                {/* Вкладка Стартапы */}
                {activeTab === 'startups' && (
                    <div className="startups-content">
                        <div className="search-and-filter-container">
                             <div className="search-container"> <input type="text" placeholder="Поиск..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={loadingStartups || updatingOperation} /> </div>
                             <div className="filter-container"> <input type="checkbox" id="showOnlyMyStartups" checked={showOnlyMyStartups} onChange={(e) => setShowOnlyMyStartups(e.target.checked)} disabled={loadingStartups || updatingOperation} /> <label htmlFor="showOnlyMyStartups">Только мои</label> </div>
                        </div>
                        {!showAddStartupForm && (<button onClick={() => setShowAddStartupForm(true)} className="add-button add-startup-button" disabled={loadingStartups || updatingOperation}>+ Добавить стартап</button>)}
                        {showAddStartupForm && (<AddStartupForm onAdd={handleAddStartup} onCancel={() => setShowAddStartupForm(false)} isLoading={updatingOperation} />)}
                        <div className="startup-list card-list">
                            {loadingStartups && startups.length === 0 && <p>Загрузка...</p>}
                            {!loadingStartups && startups.length === 0 && !fetchError && <p>Нет стартапов{showOnlyMyStartups ? ', созданных вами' : ''}.</p>}
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
                                    onToggleHold={handleToggleHold} // Передаем обработчик
                                    isSaving={updatingOperation && (editingStartupId === startup.id || editingTimelineStartupId === startup.id)}
                                />
                             ))}
                        </div>
                    </div>
                )}

                {/* Вкладка Митапы */}
                {activeTab === 'meetups' && (
                    <MeetupsTabContent
                        token={token}
                        userId={userId}
                        isAdmin={isAdmin}
                        authFetch={authFetch}
                        showMessage={showMessage}
                        userProfileData={userProfileData} // Передаем профиль, если нужен
                    />
                )}

                {/* Вкладка Вакансии */}
                {activeTab === 'vacancies' && (
                     <VacanciesTabContent
                        token={token}
                        username={username} // Нужен для отображения создателя вакансии
                        userId={userId}
                        userRole={userRole} // Нужен для логики
                        isAdmin={isAdmin}
                        authFetch={authFetch}
                        allStartups={startups} // Нужен для выбора стартапа
                        showMessage={showMessage}
                        userProfileData={userProfileData} // Передаем профиль
                    />
                )}

                {/* Вкладка Личный кабинет */}
                {activeTab === 'profile' && (
                     <ProfileTabContent
                        token={token}
                        userId={userId}
                        authFetch={authFetch}
                        showMessage={showMessage}
                        onProfileUpdate={fetchUserProfile} // Передаем функцию для обновления данных после сохранения
                    />
                )}
            </div>
             {/* ---> КОНЕЦ РЕНДЕРИНГА КОНТЕНТА ВКЛАДОК <--- */}
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

    // Рендеринг: LandingPage или AppContent
    return (
        <div>
            {token && userId !== null && username && userRole ? (
                <AppContent token={token} username={username} userId={userId} userRole={userRole} onLogout={handleLogout} />
            ) : (
                <LandingPage onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
}
export default App;
