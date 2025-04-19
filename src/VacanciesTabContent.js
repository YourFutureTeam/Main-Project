// src/VacanciesTabContent.js (ПОЛНЫЙ КОД с Resume Link)
import React, { useState, useEffect, useCallback } from 'react';
import VacancyCard from './VacancyCard';
import AddVacancyForm from './AddVacancyForm';

function VacanciesTabContent({ token, userId, isAdmin, userRole, authFetch, allStartups }) {
    const [vacancies, setVacancies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAddVacancyForm, setShowAddVacancyForm] = useState(false);
    const [vacancySearchQuery, setVacancySearchQuery] = useState(''); // Поиск

    const userOwnedStartups = allStartups.filter(startup => isAdmin || startup.creator_user_id === userId);
    const canAddVacancies = isAdmin || userOwnedStartups.length > 0;

    const showMessage = (text, type = 'info') => { alert(`${type === 'error' ? 'Ошибка: ' : type === 'success' ? 'Успех: ' : ''}${text}`); };

    // Загрузка вакансий
    const fetchVacancies = useCallback(() => {
        setLoading(true); setError('');
        authFetch('/vacancies')
            .then(data => setVacancies(data))
            .catch(err => { console.error("Ошибка загрузки вакансий:", err); setError(`Не удалось загрузить вакансии: ${err.message}`); })
            .finally(() => setLoading(false));
    }, [authFetch]);

    useEffect(() => { fetchVacancies(); }, [fetchVacancies]);

    // Добавление вакансии (без изменений)
    const handleAddVacancy = async (vacancyData) => { /* ... как раньше ... */
        console.log('[VacanciesTabContent] handleAddVacancy вызван:', vacancyData); setLoading(true); setError('');
        try { console.log('[VacanciesTabContent] Вызов authFetch POST /vacancies'); const data = await authFetch('/vacancies', { method: 'POST', body: JSON.stringify(vacancyData) });
            console.log('[VacanciesTabContent] Успешный ответ:', data); showMessage(data.message || 'Вакансия добавлена!', 'success'); fetchVacancies(); setShowAddVacancyForm(false);
        } catch (err) { console.error('[VacanciesTabContent] Ошибка:', err); showMessage(`Ошибка: ${err.message}`, 'error');
        } finally { console.log('[VacanciesTabContent] handleAddVacancy завершен.'); setLoading(false); }
     };

    // ---> ИЗМЕНЕН Обработчик отклика: принимает resumeLink <---
    const handleApply = async (vacancyId, telegramUsername, resumeLink) => {
        // Проверки на клиенте (хотя они и в VacancyCard)
        if (!telegramUsername || !resumeLink) { alert("Не указан Telegram или ссылка на резюме."); return; }
        console.log(`[VacanciesTabContent] Отклик на ${vacancyId} с TG: ${telegramUsername}, Резюме: ${resumeLink}`);
        setLoading(true);
        try {
            // ---> Передаем оба поля в теле запроса <---
            const data = await authFetch(`/vacancies/${vacancyId}/apply`, {
                method: 'POST',
                body: JSON.stringify({
                    telegram: telegramUsername,
                    resume_link: resumeLink // Передаем ссылку на резюме
                })
            });
             showMessage(data.message || 'Отклик отправлен!', 'success');
             fetchVacancies(); // Обновляем список
        } catch (err) {
             console.error(`[VacanciesTabContent] Ошибка отклика на ${vacancyId}:`, err);
             if (err.message && err.message.includes('409')) { showMessage('Вы уже откликались.', 'info'); }
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
            <div className="search-container">
                <input type="text" placeholder="Поиск по названию вакансии..." className="search-input" value={vacancySearchQuery} onChange={(e) => setVacancySearchQuery(e.target.value)} disabled={loading} />
            </div>

            {/* Кнопка/Форма добавления */}
            {canAddVacancies && !showAddVacancyForm && (<button onClick={() => setShowAddVacancyForm(true)} className="add-button" disabled={loading}>+ Добавить вакансию</button> )}
            {canAddVacancies && showAddVacancyForm && ( <AddVacancyForm userStartups={userOwnedStartups} onAdd={handleAddVacancy} onCancel={() => setShowAddVacancyForm(false)} isLoading={loading} /> )}

            {/* Список вакансий */}
            <div className="vacancy-list card-list">
                 {loading && vacancies.length === 0 && <p>Загрузка...</p>}
                 {!loading && vacancies.length === 0 && !error && <p>Вакансий нет.</p>}
                 {!loading && vacancies.length > 0 && filteredVacancies.length === 0 && ( <p className="no-results-message">Ничего не найдено по запросу "{vacancySearchQuery}".</p> )}

                 {/* Рендер отфильтрованных карточек */}
                 {filteredVacancies.map((vacancy) => (
                    <VacancyCard
                        key={vacancy.id}
                        vacancy={vacancy}
                        currentUserId={userId}
                        isAdmin={isAdmin}
                        onApply={handleApply} // Передаем обновленный обработчик
                    />
                 ))}
            </div>
        </div>
    );
}
export default VacanciesTabContent;
