// src/VacanciesTabContent.js (ПОЛНЫЙ КОД - с чекбоксом "Только мои вакансии")
import React, { useState, useEffect, useCallback } from 'react';
import VacancyCard from './VacancyCard';
import AddVacancyForm from './AddVacancyForm';

function VacanciesTabContent({ token, userId, isAdmin, userRole, authFetch, allStartups, showMessage, userProfileData }) {
    const [vacancies, setVacancies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // ---> НОВОЕ СОСТОЯНИЕ: Фильтр "Только мои вакансии" <---
    const [showOnlyMyVacancies, setShowOnlyMyVacancies] = useState(false);
    // ------------------------------------------------------
    const [showAddVacancyForm, setShowAddVacancyForm] = useState(false);
    const [vacancySearchQuery, setVacancySearchQuery] = useState('');
    const [currentUserProfile, setCurrentUserProfile] = useState(userProfileData || null);
    const [loadingProfile, setLoadingProfile] = useState(!userProfileData);

    // Фильтруем стартапы, К КОТОРЫМ МОЖНО создавать вакансии (только ОДОБРЕННЫЕ + свои/админ)
    // Используем allStartups, который приходит из App.js
    const creatableStartups = allStartups.filter(startup =>
        startup.status === 'approved' && (isAdmin || startup.creator_user_id === userId)
    );
    // Может добавлять вакансии, если есть хоть один подходящий стартап
    const canAddVacancies = creatableStartups.length > 0;

    // Загрузка ВАКАНСИЙ (теперь учитывает фильтр 'showOnlyMyVacancies')
    const fetchVacancies = useCallback(() => {
        setLoading(true); setError('');
        console.log(`[VacanciesTabContent] Загрузка вакансий... (Только мои: ${showOnlyMyVacancies})`);
        // Добавляем параметр filter_by_creator=true если чекбокс включен
        const url = `/vacancies${showOnlyMyVacancies ? '?filter_by_creator=true' : ''}`;
        authFetch(url) // Используем authFetch и сформированный URL
            .then(data => setVacancies(data))
            .catch(err => { console.error("Ошибка вакансий:", err); setError(`Ошибка: ${err.message}`); })
            .finally(() => setLoading(false));
    }, [authFetch, showOnlyMyVacancies]); // <-- Добавили showOnlyMyVacancies в зависимости!

    // Загрузка профиля (без изменений)
    const fetchCurrentUserProfile = useCallback(() => {
        if (!currentUserProfile) {
            setLoadingProfile(true);
            authFetch('/profile')
                .then(setCurrentUserProfile)
                .catch(err => { console.error("Ошибка профиля:", err); showMessage(`Ошибка профиля: ${err.message}.`, 'error'); })
                .finally(() => setLoadingProfile(false));
        }
    }, [authFetch, showMessage, currentUserProfile]);

    // Загружаем профиль при монтировании
    useEffect(() => {
        fetchCurrentUserProfile();
    }, [fetchCurrentUserProfile]); // Зависимость только от функции загрузки профиля

    // ---> НОВЫЙ useEffect: Перезагружаем вакансии при изменении фильтра <---
    useEffect(() => {
        fetchVacancies(); // Вызываем fetchVacancies при изменении showOnlyMyVacancies
    }, [showOnlyMyVacancies, fetchVacancies]); // Зависимости: состояние фильтра и сама функция загрузки
    // -------------------------------------------------------------------


    // Добавление вакансии
    const handleAddVacancy = async (vacancyData) => {
        setLoading(true); setError('');
        try {
            const data = await authFetch('/vacancies', { method: 'POST', body: JSON.stringify(vacancyData) });
            showMessage(data.message || 'Вакансия на рассмотрении!', 'success');
            fetchVacancies(); // Перезагружаем список вакансий после добавления
            // setVacancies(prev => [data.vacancy, ...prev]); // Или добавляем локально
            setShowAddVacancyForm(false);
        } catch (err) { showMessage(`Ошибка добавления: ${err.message}`, 'error'); }
        finally { setLoading(false); }
     };

    // Отклик на вакансию
    const handleApply = async (vacancyId) => {
        setLoading(true); // Используем основной лоадер?
        try {
            const data = await authFetch(`/vacancies/${vacancyId}/apply`, { method: 'POST' });
             showMessage(data.message || 'Отклик отправлен!', 'success');
             // Обновляем локально для немедленного отклика
             setVacancies(prevVacancies => prevVacancies.map(v => {
                 if (v.id === vacancyId && currentUserProfile) {
                     const newApp = { user_id: userId, telegram: currentUserProfile.telegram, resume_link: currentUserProfile.resume_link };
                     const apps = v.applicants ? [...v.applicants] : [];
                     if (!apps.some(a => a.user_id === userId)) { apps.push(newApp); }
                     return { ...v, applicants: apps, applicant_count: apps.length, hasApplied: true }; // Можно добавить флаг hasApplied
                 } return v;
             }));
             // Можно добавить небольшой таймаут перед перезагрузкой, чтобы пользователь успел увидеть локальное изменение
             // setTimeout(() => fetchVacancies(), 500);
        } catch (err) {
             console.error(`Ошибка отклика на ${vacancyId}:`, err);
             if (err.message?.includes('409')) { showMessage('Вы уже откликались.', 'info'); }
             else if (err.message?.includes('Telegram') || err.message?.includes('резюме')) { showMessage(err.message, 'error'); }
             else { showMessage(`Ошибка отклика: ${err.message}`, 'error'); }
        } finally { setLoading(false); } // Снимаем лоадер
    };

    // Одобрение вакансии
    const handleApprove = async (vacancyId) => {
        setLoading(true);
        try {
            const data = await authFetch(`/vacancies/${vacancyId}/approve`, { method: 'PUT' });
            showMessage(data.message || 'Вакансия одобрена!', 'success');
            // Обновляем локально
            setVacancies(prev => prev.map(v => v.id === vacancyId ? data.vacancy : v));
            // fetchVacancies(); // Или перезагружаем
        } catch (err) { showMessage(`Ошибка одобрения: ${err.message}`, 'error'); }
        finally { setLoading(false); }
    };

    // Отклонение вакансии
    const handleReject = async (vacancyId, reason) => {
        setLoading(true);
        try {
            const data = await authFetch(`/vacancies/${vacancyId}/reject`, { method: 'PUT', body: JSON.stringify({ reason: reason }) });
            showMessage(data.message || 'Вакансия отклонена!', 'success');
            // Обновляем локально
            setVacancies(prev => prev.map(v => v.id === vacancyId ? data.vacancy : v));
            // fetchVacancies(); // Или перезагружаем
        } catch (err) { showMessage(`Ошибка отклонения: ${err.message}`, 'error'); }
        finally { setLoading(false); }
    };

    // Фильтрация вакансий по ПОИСКОВОМУ ЗАПРОСУ (фильтр "только мои" применен при загрузке)
    const filteredVacancies = vacancies.filter(vacancy =>
        vacancy.title.toLowerCase().includes(vacancySearchQuery.toLowerCase())
    );

    console.log("[VacanciesTabContent] Rendering, isAdmin:", isAdmin, "Creatable startups:", creatableStartups.length);

    // --- JSX ---
    return (
        <div className="vacancies-content">
            {error && <p className="message error">{error}</p>}
            {/* Контейнер для поиска и фильтра */}
            <div className="search-and-filter-container">
                <div className="search-container">
                    <input type="text" placeholder="Поиск по названию..." className="search-input" value={vacancySearchQuery} onChange={(e) => setVacancySearchQuery(e.target.value)} disabled={loading || loadingProfile} />
                </div>
                {/* Чекбокс фильтра "Только мои" */}
                <div className="filter-container">
                    <input
                        type="checkbox"
                        id="showOnlyMyVacancies"
                        checked={showOnlyMyVacancies}
                        onChange={(e) => setShowOnlyMyVacancies(e.target.checked)}
                        disabled={loading || loadingProfile}
                    />
                    <label htmlFor="showOnlyMyVacancies">Только мои вакансии</label>
                </div>
            </div>

            {/* Кнопка и форма добавления */}
            {/* Показывать кнопку можно, если есть КУДА добавлять */}
            {canAddVacancies && !showAddVacancyForm && (<button onClick={() => setShowAddVacancyForm(true)} className="add-button" disabled={loading || loadingProfile}>+ Добавить вакансию</button> )}
            {canAddVacancies && showAddVacancyForm && ( <AddVacancyForm userStartups={creatableStartups} onAdd={handleAddVacancy} onCancel={() => setShowAddVacancyForm(false)} isLoading={loading || loadingProfile} /> )}
            {/* Сообщение, если нет стартапов для добавления вакансий */}
            {!showAddVacancyForm && !canAddVacancies && !isAdmin && <p className="info-message">Чтобы добавить вакансию, у вас должен быть хотя бы один <span style={{fontWeight: 'bold'}}>одобренный</span> стартап, созданный вами.</p>}
            {!showAddVacancyForm && !canAddVacancies && isAdmin && <p className="info-message">В системе нет одобренных стартапов, к которым можно добавить вакансии.</p>}


            {/* Список вакансий */}
            <div className="vacancy-list card-list">
                 {(loading || loadingProfile) && vacancies.length === 0 && <p>Загрузка...</p>}
                 {!loading && !loadingProfile && vacancies.length === 0 && !error && <p>Нет вакансий{showOnlyMyVacancies ? ', созданных вами' : ''}.</p>}
                 {!loading && !loadingProfile && vacancies.length > 0 && filteredVacancies.length === 0 && ( <p className="no-results-message">Нет результатов по вашему запросу.</p> )}
                 {/* Рендерим отфильтрованные по поиску вакансии */}
                 {filteredVacancies.map((vacancy) => (
                    <VacancyCard
                        key={vacancy.id} vacancy={vacancy} currentUserId={userId}
                        isAdmin={isAdmin} userProfile={currentUserProfile}
                        onApply={handleApply} onApprove={handleApprove} onReject={handleReject}
                    />
                 ))}
            </div>
        </div>
    );
}

export default VacanciesTabContent;
