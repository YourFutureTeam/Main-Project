// src/constants.js

// Определяем этапы стартапа
export const STARTUP_STAGES = [
    { key: 'idea', label: '💡 Идея/Концепт', order: 1 },
    { key: 'mvp', label: '🛠️ MVP/Прототип', order: 2 },
    { key: 'pmf', label: '🎯 Product/Market Fit', order: 3 },
    { key: 'scaling', label: '🚀 Рост/Масштабирование', order: 4 },
    { key: 'established', label: '📈 Зрелость/Стабильность', order: 5 },
  ];
  
  // Вспомогательные функции для работы с этапами
  export const getStageByKey = (key) => STARTUP_STAGES.find(stage => stage.key === key);
  export const getStageLabel = (key) => getStageByKey(key)?.label || key;
  export const getStageOrder = (key) => getStageByKey(key)?.order || 0;
  
  // Список ключей для валидации на бэкенде (чтобы не дублировать)
  export const ALLOWED_STAGE_KEYS = STARTUP_STAGES.map(stage => stage.key);
  