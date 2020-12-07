// ==UserScript==
// @name rotate-image
// @description Добавляет функциональность поворота изображения, открытого в новой вкладке, по часовой стрелке
// @version 0.0.1
// @license WTFPL
// @author MihailStar
// @include /\.(?:gif|jpg|png|webp)(?:\?.+)?$/
// @grant none
// Браузер на основе Chromium + расширение Tampermonkey
// ==/UserScript==

'use strict';

{
  const $image = document.querySelector('img');
  if ($image === null) throw new Error('Изображение не найдено');
  $image.style.transform = 'rotate(0deg)';

  const $button = document.createElement('button');
  $button.style.cssText = `
    position: fixed;
    top: 0.5em;
    right: 0.5em;
    z-index: 1;
    overflow: hidden;
    padding: 0;
    width: 1.25em;
    height: 1.25em;
    border: 0;
    border-radius: 0.25em;
    background-color: #4f4f4f;
    color: #f4f4f4;
    text-align: center;
    font-size: 16px;
    line-height: 1.25em;
    cursor: pointer;
  `;
  $button.type = 'button';
  $button.title = 'Повернуть изображение (Ctrl + .)';
  $button.textContent = '↷';
  $button.addEventListener('click', () => {
    $image.style.transform = $image.style.transform.replace(
      /(\d+)/,
      (_, digit) => String(Number(digit) + 90)
    );
  });

  document.body.append($button);
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.code === 'Period') {
      $button.click();
    }
  });
}
