
import React, { useState, useEffect, useCallback } from 'react';
// --- ИМПОРТЫ ---
import AddVacancyForm from './AddVacancyForm';
import VacancyCard from './VacancyCard';
import './App.css';

function VacanciesTabContent({
    token,
    username,
    userId,
    userRole,
    isAdmin,
    authFetch,
    allStartups,
    showMessage,
    userProfileData,
    isUpdatingParent
}) {
    // --- Состояния ---
    const [vacancies, setVacancies] = useState([]);
    const [loadingVacancies, setLoadingVacancies] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [showOnlyMyVacancies, setShowOnlyMyVacancies] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // --- Функции ---

    // Загрузка вакансий (с учетом фильтра)
    const fetchVacancies = useCallback(() => {
        console.log("Fetching vacancies, filter_by_creator:", showOnlyMyVacancies);
        setLoadingVacancies(true);
        setFetchError('');
        const url = `/vacancies${showOnlyMyVacancies ? '?filter_by_creator=true' : ''}`;
        authFetch(url)
            .then(data => {
                if (data && Array.isArray(data)) {
                    setVacancies(data);
                } else {
                    console.warn("Received non-array or null data for vacancies:", data);
                    setVacancies([]);
                }
            })
            .catch(err => {
                console.error("Vacancy fetch error:", err);
                setFetchError(`Ошибка загрузки вакансий: ${err.message}`);
            })
            .finally(() => {
                setLoadingVacancies(false);
            });
    }, [authFetch, showOnlyMyVacancies]);

    useEffect(() => {
        if (userProfileData) {
             fetchVacancies();
        } else {
            setLoadingVacancies(false);
            console.warn("VacanciesTabContent: Cannot fetch, userProfileData missing.");
        }
    }, [fetchVacancies, userProfileData, showOnlyMyVacancies]);

    // Обработчик отклика
    const handleApply = async (vacancyId) => {
        if (!userProfileData?.telegram || !userProfileData?.resume_link) {
            showMessage('Заполните Telegram и резюме в ЛК.', 'error'); return;
        }
        setUpdating(true);
        try {
            const data = await authFetch(`/vacancies/${vacancyId}/apply`, { method: 'POST' });
            if (data) {
                showMessage(data.message || 'Отклик отправлен!', data.message?.includes("Уже") ? 'info' : 'success');
                fetchVacancies();
            }
        } catch (err) {
            showMessage(`Ошибка отклика: ${err.message}`, 'error');
        } finally {
            setUpdating(false);
        }
    };

    // Обработчик добавления вакансии
    const handleAddVacancy = async (vacancyData) => {
        console.log("Adding new vacancy:", vacancyData);
        setUpdating(true);
        try {
            const data = await authFetch('/vacancies', { method: 'POST', body: JSON.stringify(vacancyData) });
            if (data) {
                showMessage(data.message || 'Вакансия отправлена на рассмотрение!', 'success');
                setShowAddForm(false);
                fetchVacancies();
            }
        } catch (error) {
            if (error.message) { showMessage(`Ошибка добавления вакансии: ${error.message}`, 'error'); }
        } finally {
            setUpdating(false);
        }
    };

    // Обработчик отмены добавления
    const handleCancelAddVacancy = () => {
        setShowAddForm(false);
    };

    // --- ОБРАБОТЧИКИ МОДЕРАЦИИ ---
    const handleApproveVacancy = async (vacancyId) => {
        console.log("Approving vacancy:", vacancyId);
        setUpdating(true);
        try {
            const data = await authFetch(`/vacancies/${vacancyId}/approve`, { method: 'PUT' });
            if (data) {
                showMessage(data.message || 'Вакансия одобрена!', 'success');
                fetchVacancies();
            }
        } catch (error) {
            if (error.message) showMessage(`Ошибка одобрения вакансии: ${error.message}`, 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleRejectVacancy = async (vacancyId, reason) => {
        console.log("Rejecting vacancy:", vacancyId, "Reason:", reason);
         if (!reason || !reason.trim()) {
             return;
         }
        setUpdating(true);
        try {
            const data = await authFetch(`/vacancies/${vacancyId}/reject`, {
                method: 'PUT',
                body: JSON.stringify({ reason: reason.trim() })
            });
            if (data) {
                showMessage(data.message || 'Вакансия отклонена.', 'info');
                fetchVacancies();
            }
        } catch (error) {
            if (error.message) showMessage(`Ошибка отклонения вакансии: ${error.message}`, 'error');
        } finally {
            setUpdating(false);
        }
    };

    // --- УДАЛЕНИЕ ВАКАНСИИ ---
    const handleDeleteVacancy = async (vacancyId) => {
        if (!vacancyId) return;
        setUpdating(true);
        try {
            const data = await authFetch(`/vacancies/${vacancyId}`, {
                method: 'DELETE',
            });
            if (data && (data.success || data.message)) {
                showMessage(data.message || "Вакансия удалена успешно", 'success');
                fetchVacancies();
            } else {
                showMessage("Не удалось удалить вакансию. Попробуйте позже.", "error");
            }
        } catch (error) {
            showMessage(`Ошибка удаления вакансии: ${error.message}`, 'error');
        } finally {
            setUpdating(false);
        }
    };

    // --- КОНЕЦ ОБРАБОТЧИКОВ МОДЕРАЦИИ ---

    // --- ФИЛЬТРАЦИЯ СТАРТАПОВ ДЛЯ ФОРМЫ ---
    const availableStartupsForForm = (allStartups || [])
        .filter(startup =>
            startup.status === 'approved' && (isAdmin || startup.creator_user_id === userId)
        );
    
    const filteredVacancies = vacancies.filter(vacancy =>
        vacancy.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="vacancies-content tab-pane">
            {fetchError && <p className="message error">{fetchError}</p>}
            {(updating || isUpdatingParent) && <div className="loading-indicator"><p>Выполняется операция...</p></div>}
            <div className="search-and-filter-container">
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Поиск по названию вакансии..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={loadingVacancies || updating || isUpdatingParent}
                    />
                 </div>
                 <div className="filter-container">
                     <input
                         type="checkbox"
                         id="showOnlyMyVacancies"
                         checked={showOnlyMyVacancies}
                         onChange={(e) => setShowOnlyMyVacancies(e.target.checked)}
                         disabled={loadingVacancies || updating || isUpdatingParent}
                     />
                     <label htmlFor="showOnlyMyVacancies">Только мои вакансии</label>
                 </div>
            </div>

            {!showAddForm && (availableStartupsForForm.length > 0 || isAdmin) && (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="add-button add-vacancy-button"
                    disabled={loadingVacancies || updating || isUpdatingParent}
                >
                    + Добавить вакансию
                </button>
            )}
            {!showAddForm && !isAdmin && availableStartupsForForm.length === 0 && !loadingVacancies && (
                <p className="info-message">Чтобы добавить вакансию, у вас должен быть хотя бы один одобренный стартап.</p>
            )}

            {showAddForm && (
                <AddVacancyForm
                    onAdd={handleAddVacancy}
                    onCancel={handleCancelAddVacancy}
                    isLoading={updating || isUpdatingParent}
                    availableStartups={availableStartupsForForm}
                />
            )}

            <div className="vacancy-list card-list">
                {loadingVacancies && <p>Загрузка вакансий...</p>}
                {!loadingVacancies && vacancies.length === 0 && !fetchError && (
                    <p>Нет доступных вакансий{showOnlyMyVacancies ? ', созданных вами' : ''}.</p>
                )}
                {!loadingVacancies && filteredVacancies.length > 0 && (
                    filteredVacancies.map(vacancy => (
                        <VacancyCard
                            key={vacancy.id}
                            vacancy={vacancy}
                            currentUserId={userId}
                            isAdmin={isAdmin}
                            userProfile={userProfileData}
                            onApply={handleApply}
                            isCreator={vacancy.creator_user_id === userId}
                            onApprove={handleApproveVacancy}
                            onReject={handleRejectVacancy}
                            onDeleteVacancy={handleDeleteVacancy}
                            isProcessing={updating || isUpdatingParent}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default VacanciesTabContent;
