// src/InlineExpandableText.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './InlineExpandableText.css'; // Стили для line clamp

/**
 * Компонент для отображения только первых `lines` строк текста с возможностью раскрытия всего текста по клику.
 * @param {string} text - Отображаемый текст.
 * @param {number} lines - Количество строк для отображения в свернутом состоянии.
 * @param {string} [className] - Дополнительный CSS-класс для контейнера.
 * @param {string} [expandText='Развернуть'] - Текст кнопки для разворачивания.
 * @param {string} [collapseText='Свернуть'] - Текст кнопки для сворачивания.
 */
function InlineExpandableText({
  text = "",
  lines = 2,
  className = "",
  expandText = 'Развернуть',
  collapseText = 'Свернуть'
}) {
  const [expanded, setExpanded] = useState(false);
  const [needTruncate, setNeedTruncate] = useState(false);
  const contentRef = useRef(null); // Используем null как начальное значение

  const checkTruncation = useCallback(() => {
    if (contentRef.current) {
      // Сбрасываем стиль line-clamp перед измерением реальной высоты
      contentRef.current.style.webkitLineClamp = 'unset';

      const computedStyle = getComputedStyle(contentRef.current);
      const lineHeight = parseInt(computedStyle.lineHeight, 10);
      // Добавляем небольшую погрешность (например, 1px) для надежности
      const maxHeightThreshold = (lineHeight * lines) + 1;

      // Проверяем, превышает ли реальная высота контента максимальную высоту для заданного числа строк
      if (contentRef.current.scrollHeight > maxHeightThreshold) {
        setNeedTruncate(true);
      } else {
        setNeedTruncate(false);
        // Если обрезка не нужна, всегда показываем полный текст
        setExpanded(true);
      }
    }
  }, [lines]);

  // Пересчитываем при изменении текста или количества строк
  useEffect(() => {
    checkTruncation();
  }, [text, lines, checkTruncation]);

  // Пересчитываем при изменении размера окна (опционально, но полезно для адаптивности)
  useEffect(() => {
    window.addEventListener('resize', checkTruncation);
    return () => {
      window.removeEventListener('resize', checkTruncation);
    };
  }, [checkTruncation]);


  const toggleExpand = (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события, если компонент внутри кликабельного элемента
    setExpanded(!expanded);
  };

  // Определяем стили и классы для контента
  const contentStyle = {};
  let contentClassName = 'iet-content';

  if (needTruncate && !expanded) {
    contentClassName += ' iet-truncated';
    // Применяем -webkit-line-clamp через инлайн-стиль для динамичности
    contentStyle.WebkitLineClamp = lines; // Обратите внимание на CamelCase для React style
    // Дублируем для совместимости, если React не преобразует
    contentStyle.webkitLineClamp = lines;
  }

  return (
    <div className={`inline-expandable-text ${className}`}>
      <div
        ref={contentRef}
        className={contentClassName}
        style={contentStyle}
        // Добавляем aria-expanded для доступности
        aria-expanded={expanded}
      >
        {text}
      </div>
      {/* Показываем кнопку только если текст действительно нужно обрезать */}
      {needTruncate && (
        <button
          type="button" // Важно для кнопок не в форме
          onClick={toggleExpand}
          className={expanded ? 'iet-collapse-btn' : 'iet-expand-btn'}
          aria-expanded={expanded} // Атрибут для доступности
        >
          {expanded ? collapseText : expandText}
        </button>
      )}
    </div>
  );
}

export default InlineExpandableText;
