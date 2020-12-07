// ==UserScript==
// @name methods.jquery
// @description Добавляет функциональность фильтрации устаревших методов на jquery.com
// @version 0.0.1
// @license WTFPL
// @author MihailStar
// @match https://api.jquery.com/*
// @grant none
// Браузер на основе Chromium + расширение Tampermonkey
// ==/UserScript==

'use strict';

{
  const $deprecated = $('.post').has(
    'a[href="//api.jquery.com/category/deprecated/"]'
  );

  if ($deprecated.length) {
    let isDeprecatedVisible = true;

    try {
      const value = sessionStorage.getItem('isDeprecatedVisible');

      if (value !== null) {
        isDeprecatedVisible = JSON.parse(value);
      }
    } catch (error) {
      console.error(error);
    }

    $deprecated[isDeprecatedVisible ? 'show' : 'hide']();

    const $checkbox = $(`
      <input
        type="checkbox"
        title="Фильтровать устаревшие методы"
      >
    `);

    $checkbox.css({
      position: 'fixed',
      top: '4px',
      right: '4px',
      zIndex: '1',
      marginRight: '0',
      width: '20px',
      height: '20px',
      cursor: 'pointer',
    });
    $checkbox.prop('checked', isDeprecatedVisible);
    $checkbox.on('change', () => {
      const isChecked = $checkbox.prop('checked');

      $deprecated[isChecked ? 'show' : 'hide']();

      try {
        const value = JSON.stringify(isChecked);

        sessionStorage.setItem('isDeprecatedVisible', value);
      } catch (error) {
        console.error(error);
      }
    });

    $(document.body).append($checkbox);
  }
}
