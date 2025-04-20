// src/VacanciesTabContent.js (ПОЛНЫЙ КОД)

import React, { useState, useEffect, useCallback } from 'react';
// Возможно, понадобится форма добавления, если будешь ее делать
// import AddVacancyForm from './AddVacancyForm';

function VacanciesTabContent({
    token,
    username, // Может понадобиться для отображения создателя, если нужно
    userId,
    userRole,
    isAdmin,
    authFetch,
    allStartups, // Может понадобиться для формы добавления
    showMessage,
    userProfileData // Может понадобиться для проверки профиля перед действиями
}) {
    const [vacancies, setVacancies] = useState([]);
    const [loadingVacancies, setLoadingVacancies] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false); // Состояние для показа формы добавления
    const [updating, setUpdating] = useState(false); // Общий флаг для операций (отклик, модерация)
    // Можно добавить состояние для фильтров, если нужно

    // Функция загрузки вакансий
    const fetchVacancies = useCallback(() => {
        console.log("Fetching vacancies...");
        setLoadingVacancies(true);
        setFetchError('');
        authFetch('/vacancies') // Бэкенд уже фильтрует held для не-админов
            .then(data => {
                if (data) {
                    console.log("Vacancies received:", data);
                    setVacancies(data);
                }
            })
            .catch(err => {
                console.error("Vacancy fetch error:", err);
                setFetchError(`Ошибка загрузки вакансий: ${err.message}`);
            })
            .finally(() => {
                setLoadingVacancies(false);
            });
    }, [authFetch]);

    // Загружаем вакансии при монтировании или при изменении зависимостей
    useEffect(() => {
        // Загружаем, только если профиль пользователя загружен (если это важно)
        if (userProfileData) {
            fetchVacancies();
        }
    }, [fetchVacancies, userProfileData]);

    // Обработчик отклика на вакансию
    const handleApply = async (vacancyId) => {
         // Проверка профиля перед откликом
         if (!userProfileData?.telegram || !userProfileData?.resume_link) {
            showMessage('Пожалуйста, заполните Telegram и ссылку на резюме в Личном кабинете перед откликом.', 'error');
            return;
         }

        console.log(`Applying for vacancy ${vacancyId}`);
        setUpdating(true);
        try {
            // Бэкенд проверит статус вакансии и стартапа
            const data = await authFetch(`/vacancies/${vacancyId}/apply`, { method: 'POST' });
            if (data) {
                showMessage(data.message || 'Отклик отправлен!', data.message?.includes("Уже") ? 'info' : 'success');
                // Опционально: обновить состояние вакансии или перезагрузить список
                // fetchVacancies(); // Перезагрузка может быть излишней, если не меняется статус
            }
        } catch (err) {
            showMessage(`Ошибка отклика: ${err.message}`, 'error');
        } finally {
            setUpdating(false);
        }
    };

     // --- Рендеринг компонента ---
    return (
        <div className="vacancies-content tab-pane"> {/* Добавлен класс tab-pane для консистентности */}
            <h2>Доступные вакансии</h2>

            {fetchError && <p className="message error">{fetchError}</p>}

            {/* Можно добавить кнопку "Добавить вакансию", если нужно */}
            {/* {isAdmin && !showAddForm && (
                <button onClick={() => setShowAddForm(true)} className="add-button">
                    + Добавить вакансию
                </button>
            )}
            {showAddForm && (
                <AddVacancyForm
                    // Пропсы для формы
                    onAdd={handleAddVacancy} // Нужно будет создать эту функцию
                    onCancel={() => setShowAddForm(false)}
                    isLoading={updating}
                    startups={allStartups} // Передаем список стартапов
                />
            )} */}

            <div className="vacancy-list card-list">
                {loadingVacancies && <p>Загрузка вакансий...</p>}
                {!loadingVacancies && vacancies.length === 0 && !fetchError && (
                    <p>Сейчас нет активных вакансий.</p>
                )}

                {/* Отображение списка вакансий */}
                {vacancies.map(vacancy => (
                    <div
                        key={vacancy.id}
                        // Добавляем класс 'held' если вакансия приостановлена
                        className={`card vacancy-card ${vacancy.is_effectively_held ? 'held' : ''}`}
                        // Анимация появления (если .card уже имеет ее в App.css)
                    >
                        <div className="card-header">
                            <div className="vacancy-title-status">
                                <h4 className="card-title">{vacancy.title}</h4>
                                {/* Отображение статуса для админа/создателя, если не approved */}
                                {(isAdmin || userId === vacancy.creator_user_id) && vacancy.status !== 'approved' && (
                                    <span className={`status-badge status-${vacancy.status}`}>
                                        {vacancy.status === 'pending' ? 'Рассмотрение' : 'Отклонена'}
                                    </span>
                                )}
                                {/* Индикатор приостановки для админа */}
                                {isAdmin && vacancy.is_effectively_held && (
                                    <span className="status-badge status-held" title="Стартап приостановлен">⏸️ Пауза</span>
                                )}
                            </div>
                            {/* Информация о стартапе */}
                            <div className="vacancy-startup-info">
                                В стартап: <span className="startup-name">{vacancy.startup_name || 'Неизвестно'}</span>
                            </div>
                        </div>
                        <div className="card-body">
                            {/* Добавляем <p> для лучшей структуры */}
                            <p><strong>Описание:</strong> {vacancy.description}</p>
                            <p><strong>Требования:</strong> {vacancy.requirements}</p>
                            {vacancy.salary && vacancy.salary !== "N/A" && (
                                <p><strong>Зарплата:</strong> {vacancy.salary}</p>
                            )}
                             {/* Причина отклонения для создателя/админа */}
                             {(isAdmin || userId === vacancy.creator_user_id) && vacancy.status === 'rejected' && vacancy.rejection_reason && (
                                 <p className="rejection-reason-vacancy"><strong>Причина отклонения:</strong> {vacancy.rejection_reason}</p>
                             )}
                        </div>
                        <div className="card-actions">
                            {/* Можно добавить кнопки модерации для админа */}
                            {/* {isAdmin && vacancy.status === 'pending' && (
                                <div className="admin-actions">
                                     <button onClick={() => handleApproveVacancy(vacancy.id)} className="button-approve small" disabled={updating}>Одобрить</button>
                                     <button onClick={() => handleRejectVacancy(vacancy.id)} className="button-reject small" disabled={updating}>Отклонить</button>
                                </div>
                            )} */}

                            {/* Кнопка "Откликнуться" для обычных пользователей */}
                            {!isAdmin && vacancy.status === 'approved' && (
                                <button
                                    onClick={() => handleApply(vacancy.id)}
                                    className="button-apply"
                                    // Блокируем, если идет операция ИЛИ вакансия/стартап приостановлены
                                    disabled={updating || vacancy.is_effectively_held}
                                    title={vacancy.is_effectively_held ? "Отклик невозможен (стартап приостановлен)" : "Откликнуться на вакансию"}
                                >
                                    {vacancy.is_effectively_held ? 'Недоступно' : 'Откликнуться'}
                                </button>
                            )}

                             {/* Счетчик откликов для админа или создателя СТАРТАПА */}
                             {(isAdmin || userId === vacancy.startup_creator_id) && vacancy.applicant_count !== undefined && (
                                 <span className="applicant-count">
                                     Откликов: {vacancy.applicant_count}
                                     {/* Здесь можно добавить ссылку/кнопку для просмотра откликов */}
                                 </span>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- (Предполагается, что есть стили для .vacancy-card, .held, .status-badge, .button-apply, .applicant-count в App.css) ---

// --- (Предполагается, что компоненты MeetupsTabContent, ProfileTabContent, AddVacancyForm существуют или будут созданы) ---

// --- Экспорт компонента ---
// Если это файл src/VacanciesTabContent.js, то:
export default VacanciesTabContent;