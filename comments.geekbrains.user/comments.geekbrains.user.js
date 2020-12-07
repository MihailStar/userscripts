// ==UserScript==
// @name comments.geekbrains
// @description Отображает даты комментариев на geekbrains.ru
// @version 0.0.1
// @license WTFPL
// @author MihailStar
// @match https://geekbrains.ru/*
// @grant none
// Chromium based browser + Tampermonkey extension
// ==/UserScript==

(function() {
  'use strict';

  /**
   * @param {NodeListOf<HTMLElement>} elements
   * @param {Function=} [callback]
   */
  function showElements(elements, callback) {
    elements.forEach((element) => {
      if (typeof callback === 'function') {
        callback(element);
      }

      element.classList.remove('ng-hide');
    });
  }

  /**
   * @param {NodeListOf<HTMLElement>} dateElements
   */
  function showDateElements(dateElements) {
    showElements(dateElements, (dateElement) => {
      dateElement.textContent = ` • ${dateElement.textContent}`;
    });
  }

  function initialize() {
    const container = document.querySelector('.gb__comments-list');

    if (container) {
      const dateElements = container.querySelectorAll('[datepublished]');

      showDateElements(dateElements);

      const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          const dateElements = mutation.addedNodes[0].querySelectorAll('[datepublished]');

          showDateElements(dateElements);
        });
      });

      mutationObserver.observe(container, {
        childList: true
      });
    }
  }

  window.addEventListener('load', initialize);
})();
