// src/VacanciesTabContent.js
import React, { useState, useEffect, useCallback } from 'react';
// Импорты дочерних компонентов
import VacancyCard from './VacancyCard';
import AddVacancyForm from './AddVacancyForm';

// Принимаем необходимые пропсы от AppContent
function VacanciesTabContent({ token, userId, isAdmin, userRole, authFetch, allStartups }) {
    // Состояния для списка вакансий, загрузки и ошибок
    const [vacancies, setVacancies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // Состояние для отображения формы добавления
    const [showAddVacancyForm, setShowAddVacancyForm] = useState(false);
    // ---> НОВОЕ СОСТОЯНИЕ: Для строки поиска вакансий <---
    const [vacancySearchQuery, setVacancySearchQuery] = useState('');

    // Фильтруем стартапы, где текущий пользователь - создатель, ИЛИ если пользователь - админ, берем все
    const userOwnedStartups = allStartups.filter(startup =>
        isAdmin || startup.creator_user_id === userId
    );
    // Определяем, может ли пользователь в принципе добавлять вакансии
    const canAddVacancies = isAdmin || userOwnedStartups.length > 0;

    // Функция для отображения сообщений (используем alert для простоты)
    const showMessage = (text, type = 'info') => {
        alert(`${type === 'error' ? 'Ошибка: ' : type === 'success' ? 'Успех: ' : ''}${text}`);
    };

    // Функция для загрузки вакансий с сервера
    const fetchVacancies = useCallback(() => {
        setLoading(true); // Включаем индикатор загрузки
        setError('');     // Сбрасываем предыдущие ошибки
        authFetch('/vacancies') // Используем authFetch для GET запроса
            .then(data => {
                setVacancies(data); // Обновляем состояние списка вакансий
            })
            .catch(err => {
                console.error("Ошибка загрузки вакансий:", err);
                setError(`Не удалось загрузить вакансии: ${err.message}`);
            })
            .finally(() => {
                setLoading(false); // Выключаем индикатор загрузки
            });
    }, [authFetch]); // Зависимость от authFetch

    // Загружаем вакансии при первом рендере компонента
    useEffect(() => {
        fetchVacancies();
    }, [fetchVacancies]);

    // Обработчик добавления новой вакансии
    const handleAddVacancy = async (vacancyData) => {
        console.log('[VacanciesTabContent] handleAddVacancy вызван с данными:', vacancyData);
        setLoading(true); setError('');
        try {
            console.log('[VacanciesTabContent] Вызов authFetch POST /vacancies');
            const data = await authFetch('/vacancies', { method: 'POST', body: JSON.stringify(vacancyData) });
            console.log('[VacanciesTabContent] Успешный ответ:', data);
            showMessage(data.message || 'Вакансия успешно добавлена!', 'success');
            fetchVacancies(); // Перезагружаем список
            setShowAddVacancyForm(false); // Скрываем форму
        } catch (err) {
            console.error('[VacanciesTabContent] Ошибка в handleAddVacancy:', err);
            showMessage(`Ошибка добавления вакансии: ${err.message}`, 'error');
        } finally {
             console.log('[VacanciesTabContent] handleAddVacancy завершен. Установка loading = false.');
            setLoading(false);
        }
    };

    // Обработчик отклика на вакансию
    const handleApply = async (vacancyId, telegramUsername) => {
        if (!telegramUsername) { alert("Не указан Telegram username."); return; }
        console.log(`[VacanciesTabContent] Попытка отклика на вакансию ${vacancyId} с TG: ${telegramUsername}`);
        setLoading(true);
        try {
            const data = await authFetch(`/vacancies/${vacancyId}/apply`, { method: 'POST', body: JSON.stringify({ telegram: telegramUsername }) });
             showMessage(data.message || 'Отклик отправлен!', 'success');
             fetchVacancies(); // Обновляем список
        } catch (err) {
             console.error(`[VacanciesTabContent] Ошибка при отклике на вакансию ${vacancyId}:`, err);
             if (err.message && err.message.includes('409')) { showMessage('Вы уже откликались на эту вакансию.', 'info'); }
             else { showMessage(`Ошибка при отклике: ${err.message}`, 'error'); }
        } finally {
             setLoading(false);
        }
    };

    // ---> ДОБАВЛЕНО: Фильтрация вакансий для поиска <---
    const filteredVacancies = vacancies.filter(vacancy =>
        // Проверяем название вакансии (title) без учета регистра
        vacancy.title.toLowerCase().includes(vacancySearchQuery.toLowerCase())
    );

    // Логи для отладки кнопки "Добавить" (оставлены на всякий случай)
    // console.log('[VacanciesTabContent] Props: userId=', userId, 'isAdmin=', isAdmin);
    // console.log('[VacanciesTabContent] allStartups:', allStartups);
    // console.log('[VacanciesTabContent] userOwnedStartups (отфильтрованные):', userOwnedStartups);
    // console.log('[VacanciesTabContent] Вычислено canAddVacancies:', canAddVacancies);
    // console.log('[VacanciesTabContent] Состояние showAddVacancyForm:', showAddVacancyForm);

    // --- Начало JSX разметки VacanciesTabContent ---
    return (
        <div className="vacancies-content">
            {/* Отображение ошибки загрузки */}
            {error && <p className="message error">{error}</p>}

            {/* ---> ДОБАВЛЕНО: Поле для поиска вакансий <--- */}
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Поиск по названию вакансии..."
                    className="search-input" // Используем тот же стиль, что и для стартапов
                    value={vacancySearchQuery}
                    onChange={(e) => setVacancySearchQuery(e.target.value)} // Обновляем состояние поиска вакансий
                    disabled={loading} // Блокируем во время загрузки
                />
            </div>

            {/* Кнопка "+ Добавить новую вакансию" (видна, если есть права И форма скрыта) */}
            {/* Позиция кнопки осталась после поиска */}
            {canAddVacancies && !showAddVacancyForm && (
                <button
                    onClick={() => {
                         console.log('[VacanciesTabContent] Клик по кнопке "Добавить вакансию". Установка showAddVacancyForm в true.');
                         if (!loading) { setShowAddVacancyForm(true); }
                    }}
                    className="add-button"
                    disabled={loading}
                >
                    + Добавить новую вакансию
                </button>
            )}

            {/* Форма добавления вакансии (видна, если есть права И showAddVacancyForm === true) */}
            {canAddVacancies && showAddVacancyForm && (
                <AddVacancyForm
                    userStartups={userOwnedStartups}
                    onAdd={handleAddVacancy}
                    onCancel={() => setShowAddVacancyForm(false)}
                    isLoading={loading}
                />
            )}

            {/* Список карточек вакансий */}
            <div className="vacancy-list card-list">
                 {/* Сообщения о состоянии загрузки/отсутствии вакансий/результатов поиска */}
                 {loading && vacancies.length === 0 && <p>Загрузка вакансий...</p>}
                 {!loading && vacancies.length === 0 && !error && <p>Открытых вакансий пока нет.</p>}
                 {/* ---> ДОБАВЛЕНО: Сообщение "Ничего не найдено" для поиска вакансий <--- */}
                 {!loading && vacancies.length > 0 && filteredVacancies.length === 0 && (
                     <p className="no-results-message">По вашему запросу "{vacancySearchQuery}" ничего не найдено.</p>
                 )}

                 {/* ---> ИЗМЕНЕНО: Рендерим ОТФИЛЬТРОВАННЫЕ вакансии <--- */}
                 {filteredVacancies.map((vacancy) => (
                    <VacancyCard
                        key={vacancy.id}
                        vacancy={vacancy}
                        currentUserId={userId}
                        isAdmin={isAdmin}
                        onApply={handleApply}
                    />
                 ))}
            </div>
        </div> // Конец vacancies-content
    );
}
export default VacanciesTabContent;

