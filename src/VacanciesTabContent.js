// src/VacanciesTabContent.js (ПОЛНЫЙ КОД - с функциями модерации)
import React, { useState, useEffect, useCallback } from 'react';
import VacancyCard from './VacancyCard';
import AddVacancyForm from './AddVacancyForm';

// Принимаем isAdmin как проп
function VacanciesTabContent({ token, userId, isAdmin, userRole, authFetch, allStartups, showMessage, userProfileData }) {
    const [vacancies, setVacancies] = useState([]); // Список вакансий для отображения
    const [loading, setLoading] = useState(false); // Общий лоадер для вкладки
    const [error, setError] = useState(''); // Ошибка загрузки
    const [showAddVacancyForm, setShowAddVacancyForm] = useState(false); // Показ формы добавления
    const [vacancySearchQuery, setVacancySearchQuery] = useState(''); // Строка поиска
    const [currentUserProfile, setCurrentUserProfile] = useState(userProfileData || null); // Данные профиля
    const [loadingProfile, setLoadingProfile] = useState(!userProfileData); // Лоадер профиля

    // Фильтруем стартапы, где пользователь создатель (или если админ)
    const userOwnedStartups = allStartups.filter(startup => isAdmin || startup.creator_user_id === userId);
    // Может ли пользователь добавлять вакансии
    const canAddVacancies = isAdmin || userOwnedStartups.length > 0;

    // Загрузка вакансий (фильтрация по статусу и роли происходит на бэкенде)
    const fetchVacancies = useCallback(() => {
        console.log("[VacanciesTabContent] Загрузка вакансий...");
        setLoading(true); setError('');
        authFetch('/vacancies') // Используем authFetch, т.к. видимость зависит от пользователя
            .then(data => {
                setVacancies(data); // Сохраняем полученный список
                console.log("[VacanciesTabContent] Вакансии загружены:", data.length);
            })
            .catch(err => {
                console.error("Ошибка загрузки вакансий:", err);
                setError(`Не удалось загрузить вакансии: ${err.message}`);
            })
            .finally(() => setLoading(false)); // Выключаем лоадер
    }, [authFetch]); // Зависимость только от authFetch

    // Загрузка профиля текущего пользователя (если не передан)
    const fetchCurrentUserProfile = useCallback(() => {
        if (!currentUserProfile) { // Только если профиль еще не загружен
            console.log("[VacanciesTabContent] Загрузка профиля текущего пользователя...");
            setLoadingProfile(true);
            authFetch('/profile')
                .then(data => {
                    setCurrentUserProfile(data); // Сохраняем данные профиля
                    console.log("[VacanciesTabContent] Профиль текущего пользователя загружен.");
                })
                .catch(err => {
                    console.error("Ошибка загрузки профиля для VacanciesTab:", err);
                    showMessage(`Не удалось загрузить данные профиля: ${err.message}. Отклик может быть недоступен.`, 'error');
                })
                .finally(() => setLoadingProfile(false));
        }
    }, [authFetch, showMessage, currentUserProfile]); // Добавляем currentUserProfile в зависимости

    // Загружаем вакансии и профиль при монтировании
    useEffect(() => {
        fetchVacancies();
        fetchCurrentUserProfile();
    }, [fetchVacancies, fetchCurrentUserProfile]); // Используем созданные useCallback функции

    // Добавление новой вакансии
    const handleAddVacancy = async (vacancyData) => {
        setLoading(true); // Используем общий лоадер?
        setError('');
        try {
            // Отправляем запрос на создание вакансии
            const data = await authFetch('/vacancies', {
                method: 'POST',
                body: JSON.stringify(vacancyData)
            });
            // Показываем сообщение от бэкенда
            showMessage(data.message || 'Вакансия отправлена на рассмотрение!', 'success');
            // Добавляем новую вакансию в начало списка локально
            setVacancies(prev => [data.vacancy, ...prev]);
            // fetchVacancies(); // Или можно перезагрузить весь список
            setShowAddVacancyForm(false); // Скрываем форму
        } catch (err) {
            console.error("Ошибка добавления вакансии:", err);
            showMessage(`Ошибка добавления вакансии: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
     };

    // Отклик на вакансию (без изменений по сравнению с пред. версией)
    const handleApply = async (vacancyId) => {
        // Проверка профиля происходит в VacancyCard перед вызовом
        console.log(`[VacanciesTabContent] Отклик на вакансию ${vacancyId} (данные из профиля)`);
        setLoading(true); // Используем общий лоадер
        try {
            // Отправляем POST без тела запроса
            const data = await authFetch(`/vacancies/${vacancyId}/apply`, { method: 'POST' });
             showMessage(data.message || 'Отклик отправлен!', 'success');
             // Локальное обновление для немедленного фидбека
             setVacancies(prevVacancies => prevVacancies.map(v => {
                 if (v.id === vacancyId && currentUserProfile) {
                     const newApplicant = { user_id: userId, telegram: currentUserProfile.telegram, resume_link: currentUserProfile.resume_link };
                     const existingApplicants = v.applicants ? [...v.applicants] : [];
                     if (!existingApplicants.some(app => app.user_id === userId)) { existingApplicants.push(newApplicant); }
                     return { ...v, applicants: existingApplicants, applicant_count: existingApplicants.length };
                 }
                 return v;
             }));
             // Запускаем рефетч для синхронизации
             setTimeout(() => fetchVacancies(), 100);
        } catch (err) {
             console.error(`[VacanciesTabContent] Ошибка отклика на ${vacancyId}:`, err);
             if (err.message && err.message.includes('409')) { showMessage('Вы уже откликались.', 'info'); }
             else if (err.message && (err.message.includes('Telegram') || err.message.includes('резюме'))) { showMessage(err.message, 'error'); }
             else { showMessage(`Ошибка отклика: ${err.message}`, 'error'); }
        } finally {
             setLoading(false);
        }
    };

    // Одобрение вакансии админом
    const handleApprove = async (vacancyId) => {
        console.log(`[VacanciesTabContent] Одобрение вакансии ${vacancyId}`);
        setLoading(true); // Используем общий лоадер?
        try {
            // Отправляем PUT запрос на одобрение
            const data = await authFetch(`/vacancies/${vacancyId}/approve`, { method: 'PUT' });
            showMessage(data.message || 'Вакансия одобрена!', 'success');
            // Обновляем статус вакансии локально
            setVacancies(prev => prev.map(v =>
                v.id === vacancyId
                ? { ...v, status: 'approved', rejection_reason: null }
                : v
            ));
            // fetchVacancies(); // Можно перезагрузить список, если нужно
        } catch (err) {
            console.error(`Ошибка одобрения вакансии ${vacancyId}:`, err);
            showMessage(`Ошибка одобрения: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Отклонение вакансии админом
    const handleReject = async (vacancyId, reason) => {
        console.log(`[VacanciesTabContent] Отклонение вакансии ${vacancyId} по причине: ${reason}`);
        setLoading(true); // Используем общий лоадер?
        try {
            // Отправляем PUT запрос на отклонение с причиной
            const data = await authFetch(`/vacancies/${vacancyId}/reject`, {
                method: 'PUT',
                body: JSON.stringify({ reason: reason })
            });
            showMessage(data.message || 'Вакансия отклонена!', 'success');
            // Обновляем статус и причину локально
            setVacancies(prev => prev.map(v =>
                v.id === vacancyId
                ? { ...v, status: 'rejected', rejection_reason: reason }
                : v
            ));
            // fetchVacancies(); // Можно перезагрузить список
        } catch (err) {
            console.error(`Ошибка отклонения вакансии ${vacancyId}:`, err);
            showMessage(`Ошибка отклонения: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Фильтрация вакансий для поиска (по отфильтрованному на бэке списку)
    const filteredVacancies = vacancies.filter(vacancy =>
        vacancy.title.toLowerCase().includes(vacancySearchQuery.toLowerCase())
    );

    // Лог для проверки isAdmin перед рендером
    console.log("[VacanciesTabContent] Rendering, isAdmin prop:", isAdmin);

    // --- JSX Рендеринг ---
    return (
        <div className="vacancies-content">
            {/* Сообщение об ошибке загрузки */}
            {error && <p className="message error">{error}</p>}
            {/* Поиск */}
            <div className="search-container">
                 <input type="text" placeholder="Поиск по названию вакансии..." className="search-input" value={vacancySearchQuery} onChange={(e) => setVacancySearchQuery(e.target.value)} disabled={loading || loadingProfile} />
            </div>
            {/* Кнопка/Форма добавления вакансии */}
            {canAddVacancies && !showAddVacancyForm && (<button onClick={() => setShowAddVacancyForm(true)} className="add-button" disabled={loading || loadingProfile}>+ Добавить вакансию</button> )}
            {canAddVacancies && showAddVacancyForm && ( <AddVacancyForm userStartups={userOwnedStartups} onAdd={handleAddVacancy} onCancel={() => setShowAddVacancyForm(false)} isLoading={loading || loadingProfile} /> )}

            {/* Список вакансий */}
            <div className="vacancy-list card-list">
                 {/* Сообщения о загрузке / отсутствии вакансий */}
                 {(loading || loadingProfile) && vacancies.length === 0 && <p>Загрузка вакансий...</p>}
                 {!loading && !loadingProfile && vacancies.length === 0 && !error && <p>Нет доступных вакансий.</p>}
                 {!loading && !loadingProfile && vacancies.length > 0 && filteredVacancies.length === 0 && ( <p className="no-results-message">По вашему запросу "{vacancySearchQuery}" ничего не найдено.</p> )}

                 {/* Рендер карточек вакансий */}
                 {filteredVacancies.map((vacancy) => (
                    <VacancyCard
                        key={vacancy.id}
                        vacancy={vacancy}
                        currentUserId={userId}
                        isAdmin={isAdmin} // Передаем флаг админа
                        userProfile={currentUserProfile} // Передаем профиль текущего пользователя
                        onApply={handleApply}        // Передаем функцию отклика
                        onApprove={handleApprove}    // Передаем функцию одобрения
                        onReject={handleReject}      // Передаем функцию отклонения
                    />
                 ))}
            </div>
        </div>
    );
}
export default VacanciesTabContent;
