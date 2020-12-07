// ==UserScript==
// @name users.imgsrc
// @description Добавляет функциональность сортировки пользователей на imgsrc.ru
// @version 0.0.1
// @license WTFPL
// @author MihailStar
// @match http://imgsrc.ru/main/users.php*
// @grant none
// Chromium based browser + Tampermonkey extension
// ==/UserScript==

((window) => {
  'use strict';

  /**
   * @enum {number}
   */
  const NodeType = Object.freeze({
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
  });

  /**
   * @enum {number}
   */
  const UserSortType = Object.freeze({
    USER_NAME_ASCENDING: 0,
    USER_NAME_DESCENDING: 1,
    NUMBER_OF_PHOTOS_ASCENDING: 2,
    NUMBER_OF_PHOTOS_DESCENDING: 3,
  });

  const storage = Symbol('storage');

  class User {
    /**
     * @param {Object} options
     * @param {boolean} options.isRecommended
     * @param {boolean} options.isTrusted
     * @param {number} options.numberOfPhotos
     * @param {string} options.userName
     */
    constructor(options) {
      Object.assign(this, options);
    }

    /**
     * @return {string}
     */
    toString() {
      return `
        <a href="/main/user.php?user=${this.userName}" target="_blank">
          ${this.isTrusted ? `<b>${this.userName}</b> ` : `${this.userName} `}
          (${this.numberOfPhotos} photos)
          ${this.isRecommended ? ' <span title="Recommended">[R]</span>' : ''}
          ${this.isTrusted ? ' <span title="Trusted">[T]</span>' : ''}
        </a>
      `.replace(/\n| {2}/g, '');
    }
  }

  class Model {
    /**
     * @param {Object} options
     * @param {string} options.hyperLinkSelector
     */
    constructor({ hyperLinkSelector }) {
      this[storage] = [];

      document.body.querySelectorAll(hyperLinkSelector).forEach((element) => {
        const [, userName, numberOfPhotos] = element.textContent.match(
          /(.+)\s\((\d+)\s.*\)/,
        );

        this[storage] = this[storage].concat(
          new User({
            isRecommended: Boolean(
              element.nextElementSibling &&
                element.nextElementSibling.href &&
                /\.html$/.test(element.nextElementSibling.href),
            ),
            isTrusted: Boolean(
              element.firstChild &&
                element.firstChild.nodeType === NodeType.ELEMENT_NODE &&
                /<b>.+<\/b>/g.test(element.innerHTML),
            ),
            numberOfPhotos: Number(numberOfPhotos),
            userName,
          }),
        );
      });
    }

    /**
     * @return {Array<User>}
     */
    get storage() {
      return this[storage];
    }

    /**
     * @param {UserSortType} type
     * @return {Array<User>}
     */
    sort(type) {
      const clonedStorage = [...this.storage];
      const compareFunction = {
        [UserSortType.USER_NAME_ASCENDING]: (a, b) => {
          if (a.userName > b.userName) return 1;
          if (a.userName < b.userName) return -1;
          return 0;
        },
        [UserSortType.USER_NAME_DESCENDING]: (a, b) => {
          if (b.userName > a.userName) return 1;
          if (b.userName < a.userName) return -1;
          return 0;
        },
        [UserSortType.NUMBER_OF_PHOTOS_ASCENDING]: (a, b) => {
          return a.numberOfPhotos - b.numberOfPhotos;
        },
        [UserSortType.NUMBER_OF_PHOTOS_DESCENDING]: (a, b) => {
          return b.numberOfPhotos - a.numberOfPhotos;
        },
      }[type];

      localStorage.setItem(
        'users-sort-type',
        Object.entries(UserSortType).find(([, value]) => {
          return value === type;
        })[0],
      );

      return clonedStorage.sort(compareFunction);
    }
  }

  class View {
    /**
     * @param {Object} options
     * @param {string} options.usersContainerSelector
     * @param {string} options.menuSelector
     * @param {string} options.titleSelector
     */
    constructor({ usersContainerSelector, menuSelector, titleSelector }) {
      const fragment = document.createDocumentFragment();

      fragment.appendChild(
        document.createTextNode(`${String.fromCharCode(160)} |`),
      );

      this.inputs = Object.entries(UserSortType).map(([key, value]) => {
        const input = document.createElement('input');
        const title = {
          [UserSortType.USER_NAME_ASCENDING]:
            'Sort by user name in ascending order',
          [UserSortType.USER_NAME_DESCENDING]:
            'Sort by user name in descending order',
          [UserSortType.NUMBER_OF_PHOTOS_ASCENDING]:
            'Sort by number of photos in ascending order',
          [UserSortType.NUMBER_OF_PHOTOS_DESCENDING]:
            'Sort by number of photos in descending order',
        }[value];

        input.name = 'users-sort-type';
        input.type = 'radio';
        input.title = title;
        input.value = key;
        input.style.cssText = 'cursor: pointer;';

        fragment.appendChild(
          document.createTextNode(`${String.fromCharCode(160)} `),
        );
        fragment.appendChild(input);

        return input;
      });

      document.querySelector(menuSelector).appendChild(fragment);

      this.usersContainer = document.body.querySelector(usersContainerSelector);
      this.title = document.body.querySelector(titleSelector);
    }

    /**
     * @param {Array<User>} users
     * @return {void}
     */
    renderTitle(users) {
      this.title.innerHTML = `
        ${this.title.textContent}
        <span title="Total">[${users.length}]</span>
        <span title="Recommended">[R ${
          users.filter((user) => {
            return user.isRecommended;
          }).length
        }]</span>
        <span title="Trusted">[T ${
          users.filter((user) => {
            return user.isTrusted;
          }).length
        }]</span>
      `;
    }

    /**
     * @param {Array<User>} users
     * @return {void}
     */
    renderUsers(users) {
      this.usersContainer.innerHTML = users
        .map((user) => {
          return `${user}<br>`;
        })
        .join('');
    }
  }

  class Controller {
    /**
     * @param {Object} options
     * @param {Model} options.model
     * @param {View} options.view
     */
    constructor(options) {
      Object.assign(this, options);

      this.onInputClick = this.onInputClick.bind(this);
      this.view.inputs.forEach((input) => {
        return input.addEventListener('change', this.onInputClick);
      });
      this.view.inputs
        .find((input) => {
          return (
            UserSortType[input.value] ===
            (UserSortType[localStorage.getItem('users-sort-type')] || 0)
          );
        })
        .click();
      this.view.renderTitle(this.model.storage);
    }

    /**
     * @param {Event} event
     * @return {void}
     */
    onInputClick(event) {
      this.view.renderUsers(this.model.sort(UserSortType[event.target.value]));
    }
  }

  window.addEventListener(
    'load',
    new Controller({
      model: new Model({
        hyperLinkSelector: '[href^="/main/user.php?user="]',
      }),
      view: new View({
        usersContainerSelector: 'table tr:nth-child(3) p:nth-of-type(2)',
        menuSelector: 'table tr:nth-child(3) p:nth-of-type(1)',
        titleSelector: 'table tr:nth-child(3) h1',
      }),
    }),
    { once: true },
  );
})(window);
