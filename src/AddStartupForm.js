// src/AddStartupForm.js (ПОЛНЫЙ КОД - Добавлен выбор этапа)

import React, { useState } from 'react';
import { STARTUP_STAGES } from './constants'; // Импортируем константу этапов

function AddStartupForm({ onAdd, onCancel, isLoading }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [openseaLink, setOpenseaLink] = useState('');
    // Состояние для выбранного текущего этапа
    const [currentStage, setCurrentStage] = useState(STARTUP_STAGES[0]?.key || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Добавляем currentStage в проверку
        if (!name.trim() || !description.trim() || !openseaLink.trim() || !currentStage) {
            alert('Пожалуйста, заполните все поля, включая текущий этап.'); return;
        }
        if (!openseaLink.trim().toLowerCase().startsWith('http')) {
             alert('Ссылка OpenSea должна начинаться с http:// или https://'); return;
        }
        // Передаем current_stage в onAdd
        onAdd({
            name: name.trim(),
            description: description.trim(),
            opensea_link: openseaLink.trim(),
            current_stage: currentStage // Добавляем выбранный этап
        });
    };

    return (
        <form onSubmit={handleSubmit} className="add-startup-form add-form">
            <h3>Добавить стартап</h3>
            <input type="text" placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
            <textarea placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} required disabled={isLoading} />
            <input type="url" placeholder="Ссылка OpenSea (https://...)" value={openseaLink} onChange={(e) => setOpenseaLink(e.target.value)} required pattern="https?://.+" title="URL" disabled={isLoading} className="input-opensea" />

            {/* ВЫБОР ТЕКУЩЕГО ЭТАПА */}
            <div className="form-field">
                 <label htmlFor="current_stage_select">Текущий этап:</label>
                 <select
                     id="current_stage_select"
                     value={currentStage}
                     onChange={(e) => setCurrentStage(e.target.value)}
                     required
                     disabled={isLoading}
                 >
                     {/*<option value="" disabled>Выберите этап...</option>*/}
                     {STARTUP_STAGES.map(stage => (
                         <option key={stage.key} value={stage.key}>
                             {stage.label}
                         </option>
                     ))}
                 </select>
             </div>

            <div className="form-buttons">
                <button type="submit" disabled={isLoading}>{isLoading ? '...' : 'Добавить'}</button>
                <button type="button" onClick={onCancel} className="cancel-button" disabled={isLoading}>Отмена</button>
            </div>
        </form>
    );
}
export default AddStartupForm;
