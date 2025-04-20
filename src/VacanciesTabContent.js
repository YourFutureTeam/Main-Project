// src/VacanciesTabContent.js (ПОЛНЫЙ КОД - Отклик без prompt)
import React, { useState, useEffect, useCallback } from 'react';
import VacancyCard from './VacancyCard';
import AddVacancyForm from './AddVacancyForm';

// Принимаем userProfile напрямую ИЛИ функцию для его загрузки, если он еще не загружен глобально
function VacanciesTabContent({ token, userId, isAdmin, userRole, authFetch, allStartups, showMessage, userProfileData }) {
    const [vacancies, setVacancies] = useState([]);
    const [loading, setLoading] = useState(false); // Общий лоадер для вкладки
    const [error, setError] = useState('');
    const [showAddVacancyForm, setShowAddVacancyForm] = useState(false);
    const [vacancySearchQuery, setVacancySearchQuery] = useState('');

    // ---> Состояние для данных профиля ТЕКУЩЕГО пользователя <---
    // Используем данные, переданные из AppContent, если они есть
    const [currentUserProfile, setCurrentUserProfile] = useState(userProfileData || null);
    const [loadingProfile, setLoadingProfile] = useState(!userProfileData); // Загружаем, если не передали

    // Фильтруем стартапы и определяем права на добавление
    const userOwnedStartups = allStartups.filter(startup => isAdmin || startup.creator_user_id === userId);
    const canAddVacancies = isAdmin || userOwnedStartups.length > 0;

    // Загрузка вакансий
    const fetchVacancies = useCallback(() => {
        setLoading(true); setError('');
        authFetch('/vacancies')
            .then(data => setVacancies(data))
            .catch(err => { console.error("Ошибка загрузки вакансий:", err); setError(`Не удалось загрузить: ${err.message}`); })
            .finally(() => setLoading(false));
    }, [authFetch]);

    // ---> Загрузка профиля ТЕКУЩЕГО пользователя, если он не был передан <---
    const fetchCurrentUserProfile = useCallback(() => {
        if (!currentUserProfile) { // Только если профиль еще не загружен
            console.log("[VacanciesTabContent] Загрузка профиля текущего пользователя...");
            setLoadingProfile(true);
            authFetch('/profile')
                .then(data => {
                    setCurrentUserProfile(data); // Сохраняем данные профиля
                })
                .catch(err => {
                    console.error("Ошибка загрузки профиля для VacanciesTab:", err);
                    // Не блокируем всю вкладку, просто не сможем откликаться
                    showMessage(`Не удалось загрузить данные профиля: ${err.message}. Отклик может быть недоступен.`, 'error');
                })
                .finally(() => setLoadingProfile(false));
        }
    }, [authFetch, showMessage, currentUserProfile]); // Добавляем currentUserProfile в зависимости


    useEffect(() => {
        fetchVacancies();
        fetchCurrentUserProfile(); // Загружаем вакансии и профиль пользователя
    }, [fetchVacancies, fetchCurrentUserProfile]);

    // Добавление вакансии (без изменений)
    const handleAddVacancy = async (vacancyData) => { /* ... как раньше ... */ };

    // ---> ИЗМЕНЕН Обработчик отклика: НЕ принимает TG/Резюме <---
    const handleApply = async (vacancyId) => {
        // Проверка профиля уже сделана в VacancyCard перед вызовом
        console.log(`[VacanciesTabContent] Отклик на вакансию ${vacancyId} (данные из профиля)`);
        setLoading(true); // Используем общий лоадер? Или нужен отдельный?
        try {
            // ---> Отправляем POST БЕЗ тела запроса (или с пустым телом) <---
            const data = await authFetch(`/vacancies/${vacancyId}/apply`, {
                method: 'POST'
                // body: JSON.stringify({}) // Можно отправить пустой объект, если бэкенд требует тело
            });
             showMessage(data.message || 'Отклик отправлен!', 'success');

             // Локальное обновление состояния для немедленного фидбека
             setCurrentUserProfile(prevProfile => { // Обновляем и профиль, если вдруг он изменился
                 // Этот блок не обязателен, если профиль статичен во время сессии
                 return prevProfile;
             });
             setVacancies(prevVacancies => prevVacancies.map(v => {
                 if (v.id === vacancyId && currentUserProfile) { // Добавляем только если профиль есть
                     const newApplicant = {
                         user_id: userId,
                         telegram: currentUserProfile.telegram,
                         resume_link: currentUserProfile.resume_link
                     };
                     const existingApplicants = v.applicants ? [...v.applicants] : [];
                     if (!existingApplicants.some(app => app.user_id === userId)) {
                         existingApplicants.push(newApplicant);
                     }
                     return { ...v, applicants: existingApplicants, applicant_count: existingApplicants.length };
                 }
                 return v;
             }));
             // Запускаем рефетч для синхронизации
             setTimeout(() => fetchVacancies(), 100);

        } catch (err) {
             console.error(`[VacanciesTabContent] Ошибка отклика на ${vacancyId}:`, err);
             if (err.message && err.message.includes('409')) { showMessage('Вы уже откликались.', 'info'); }
             // ---> Обработка ошибки 400 от бэкенда (если профиль не заполнен) <---
             else if (err.message && (err.message.includes('Telegram') || err.message.includes('резюме'))) {
                 showMessage(err.message, 'error'); // Показываем сообщение от бэкенда
             }
             else { showMessage(`Ошибка: ${err.message}`, 'error'); }
        } finally {
             setLoading(false);
        }
    };

    // Фильтрация вакансий для поиска
    const filteredVacancies = vacancies.filter(vacancy =>
        vacancy.title.toLowerCase().includes(vacancySearchQuery.toLowerCase())
    );

    // --- JSX ---
    return (
        <div className="vacancies-content">
            {error && <p className="message error">{error}</p>}
            {/* Поиск */}
            <div className="search-container"> <input type="text" placeholder="Поиск..." className="search-input" value={vacancySearchQuery} onChange={(e) => setVacancySearchQuery(e.target.value)} disabled={loading || loadingProfile} /> </div>
            {/* Добавить */}
            {canAddVacancies && !showAddVacancyForm && (<button onClick={() => setShowAddVacancyForm(true)} className="add-button" disabled={loading || loadingProfile}>+ Добавить вакансию</button> )}
            {canAddVacancies && showAddVacancyForm && ( <AddVacancyForm userStartups={userOwnedStartups} onAdd={handleAddVacancy} onCancel={() => setShowAddVacancyForm(false)} isLoading={loading || loadingProfile} /> )}
            {/* Список */}
            <div className="vacancy-list card-list">
                 {(loading || loadingProfile) && vacancies.length === 0 && <p>Загрузка...</p>}
                 {!loading && !loadingProfile && vacancies.length === 0 && !error && <p>Вакансий нет.</p>}
                 {!loading && !loadingProfile && vacancies.length > 0 && filteredVacancies.length === 0 && ( <p className="no-results-message">Ничего не найдено.</p> )}
                 {filteredVacancies.map((vacancy) => (
                    <VacancyCard
                        key={vacancy.id}
                        vacancy={vacancy}
                        currentUserId={userId}
                        isAdmin={isAdmin}
                        // ---> Передаем загруженный профиль в карточку <---
                        userProfile={currentUserProfile}
                        onApply={handleApply} // Обработчик НЕ принимает TG/Резюме
                    />
                 ))}
            </div>
        </div>
    );
}
export default VacanciesTabContent;
