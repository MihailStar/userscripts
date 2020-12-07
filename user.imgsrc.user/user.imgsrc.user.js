// ==UserScript==
// @name user.imgsrc
// @description Добавляет функциональность сортировки альбомов пользователя на imgsrc.ru
// @version 0.0.1
// @license WTFPL
// @author MihailStar
// @include /^https?:\/\/imgsrc\.ru\/main\/user\.php\?user=.+$/
// @grant none
// Chromium based browser + Tampermonkey extension
// ==/UserScript==

'use strict';

{
  class MyEnum {
    /**
     * @param {Object<string, number>} items
     */
    constructor(items) {
      const enumeration = Object.create(null);

      for (const property in items) {
        if (Reflect.apply(Object.hasOwnProperty, items, [property])) {
          enumeration[(enumeration[property] = items[property])] = property;
        }
      }

      return Object.freeze(enumeration);
    }
  }

  /**
   * @enum
   * @typedef AlbumSortType
   * @readonly
   */
  const AlbumSortType = new MyEnum({
    'ALBUM_NAME_ASCENDING': 10,
    'ALBUM_NAME_DESCENDING': 11,
    'NUMBER_OF_PHOTOS_ASCENDING': 20,
    'NUMBER_OF_PHOTOS_DESCENDING': 21,
    'SECTION_NAME_ASCENDING': 30,
    'SECTION_NAME_DESCENDING': 31,
    'NUMBER_OF_VIEWS_ASCENDING': 40,
    'NUMBER_OF_VIEWS_DESCENDING': 41,
    'NUMBER_OF_VOTES_ASCENDING': 50,
    'NUMBER_OF_VOTES_DESCENDING': 51,
    'NUMBER_OF_COMMENTS_ASCENDING': 60,
    'NUMBER_OF_COMMENTS_DESCENDING': 61,
  });

  class MyStorage {
    /**
     * @param {string} namespace
     */
    constructor(namespace) {
      this.getNamespace = function getNamespace() {
        return namespace;
      };

      if (!this.isAvailable()) {
        const error = 'localStorage is not available';

        this.get = () => console.error(error);
        this.set = () => console.error(error);
      }
    }

    /**
     * @returns {boolean}
     */
    isAvailable() {
      const identifier = String(Date.now());

      try {
        localStorage.setItem(identifier, identifier);
        localStorage.removeItem(identifier);

        return true;
      } catch {
        return false;
      }
    }

    /**
     * @returns {?any}
     */
    get() {
      try {
        return JSON.parse(localStorage.getItem(this.getNamespace()));
      } catch (error) {
        console.error(error);

        return null;
      }
    }

    /**
     * @param {any} data
     * @returns {void}
     */
    set(data) {
      localStorage.setItem(this.getNamespace(), JSON.stringify(data));
    }
  }

  /**
   * @class
   * @typedef {Object} MyEventEmitter
   */
  const MyEventEmitter = (() => {
    const events = Symbol('events');

    return class MyEventEmitter {
      constructor() {
        this[events] = {};
      }

      /**
       * @param {string} type
       * @param {Function} listener
       * @returns {void}
       */
      on(type, listener) {
        this[events][type] = (this[events][type] || []).concat(listener);
      }

      /**
       * @param {string} type
       * @param {Function} listener
       * @returns {void}
       */
      off(type, listener) {
        this[events][type] = (this[events][type] || []).filter(
          (func) => func !== listener,
        );
      }

      /**
       * @param {string} type
       * @param {Object} arg
       * @returns {void}
       */
      emit(type, arg) {
        (this[events][type] || []).forEach((listener) => listener(arg));
      }
    };
  })();

  /**
   * @class
   * @typedef {Object} MyModel
   */
  const MyModel = (() => {
    const rows = Symbol('rows');
    const albumSortType = Symbol('albumSortType');

    return class MyModel extends MyEventEmitter {
      /**
       * @param {Array<HTMLTableRowElement>} informationRows
       */
      constructor(informationRows) {
        super();

        this[rows] = [...informationRows];
      }

      /**
       * @param {AlbumSortType} type
       * @returns {Array<HTMLTableRowElement>}
       */
      sort(type) {
        if (type === this[albumSortType] || this[rows].length < 2) {
          return this.get();
        }

        /**
         * @param {HTMLTableRowElement} row
         * @returns {string|number}
         */
        const getValue = (row) => {
          /**
           * @param {string} selector
           * @returns {string}
           */
          const getText = (selector) =>
            row.querySelector(selector).textContent.trim();

          switch (type) {
            case AlbumSortType['ALBUM_NAME_ASCENDING']:
            case AlbumSortType['ALBUM_NAME_DESCENDING']:
            default:
              return getText('td:nth-child(1)').toLowerCase();
            case AlbumSortType['NUMBER_OF_PHOTOS_ASCENDING']:
            case AlbumSortType['NUMBER_OF_PHOTOS_DESCENDING']:
              return Number(getText('td:nth-child(2)'));
            case AlbumSortType['SECTION_NAME_ASCENDING']:
            case AlbumSortType['SECTION_NAME_DESCENDING']:
              return getText('td:nth-child(3)').toLowerCase();
            case AlbumSortType['NUMBER_OF_VIEWS_ASCENDING']:
            case AlbumSortType['NUMBER_OF_VIEWS_DESCENDING']:
              return getText('td:nth-child(4)')
                .split('+')
                .reduce((a, b) => Number(a) + Number(b), 0);
            case AlbumSortType['NUMBER_OF_VOTES_ASCENDING']:
            case AlbumSortType['NUMBER_OF_VOTES_DESCENDING']:
              return Number(getText('td:nth-child(5)'));
            case AlbumSortType['NUMBER_OF_COMMENTS_ASCENDING']:
            case AlbumSortType['NUMBER_OF_COMMENTS_DESCENDING']:
              return Number(getText('td:nth-child(6)'));
          }
        };

        /**
         * @param {string|number} a
         * @param {string|number} b
         * @returns {number}
         */
        const functionCompareAscending = (a, b) => {
          if (a > b) return 1;
          if (a < b) return -1;
          return 0;
        };

        /**
         * @param {string|number} a
         * @param {string|number} b
         * @returns {number}
         */
        const functionCompareDescending = (a, b) => {
          if (b > a) return 1;
          if (b < a) return -1;
          return 0;
        };

        /**
         * @param {HTMLTableRowElement} rowA
         * @param {HTMLTableRowElement} rowB
         * @returns {number}
         */
        const functionCompare = (rowA, rowB) => {
          const valueRowA = getValue(rowA);
          const valueRowB = getValue(rowB);

          switch (type) {
            case AlbumSortType['ALBUM_NAME_ASCENDING']:
            case AlbumSortType['NUMBER_OF_PHOTOS_ASCENDING']:
            case AlbumSortType['SECTION_NAME_ASCENDING']:
            case AlbumSortType['NUMBER_OF_VIEWS_ASCENDING']:
            case AlbumSortType['NUMBER_OF_VOTES_ASCENDING']:
            case AlbumSortType['NUMBER_OF_COMMENTS_ASCENDING']:
            default:
              return functionCompareAscending(valueRowA, valueRowB);
            case AlbumSortType['ALBUM_NAME_DESCENDING']:
            case AlbumSortType['NUMBER_OF_PHOTOS_DESCENDING']:
            case AlbumSortType['SECTION_NAME_DESCENDING']:
            case AlbumSortType['NUMBER_OF_VIEWS_DESCENDING']:
            case AlbumSortType['NUMBER_OF_VOTES_DESCENDING']:
            case AlbumSortType['NUMBER_OF_COMMENTS_DESCENDING']:
              return functionCompareDescending(valueRowA, valueRowB);
          }
        };

        this[rows] = this[rows].sort(functionCompare);
        this[albumSortType] = type;
        this.emit('event:sort', {
          rows: this.get(),
          albumSortType: this.getAlbumSortType(),
        });

        return this.get();
      }

      /**
       * @returns {Array<HTMLTableRowElement>}
       */
      get() {
        return [...this[rows]];
      }

      /**
       * @returns {?string}
       */
      getAlbumSortType() {
        return AlbumSortType[this[albumSortType]] || null;
      }
    };
  })();

  /**
   * @class
   * @typedef {Object} MyView
   */
  const MyView = (() => {
    const firstRow = Symbol('firstRow');
    const lastRow = Symbol('lastRow');
    const rowContainer = Symbol('rowContainer');

    return class MyView extends MyEventEmitter {
      /**
       * @param {Array<HTMLTableRowElement>} headerRows
       * @param {HTMLTableElement} container
       */
      constructor(headerRows, container) {
        super();

        [this[firstRow], this[lastRow]] = headerRows;
        this[rowContainer] = container;

        /**
         * @returns {void}
         */
        const initializeСontrols = () => {
          const styles = `
            display: inline-block;
            padding: 0;
            width: 1em;
            height: 1em;
            border: 0;
            background-color: transparent;
            color: #a06060;
            line-height: 1em;
            cursor: pointer;
          `
            .replace(/\s{2,}/g, ' ')
            .trim();
          const albumSortingTypes = [
            'ALBUM_NAME',
            'NUMBER_OF_PHOTOS',
            'SECTION_NAME',
            'NUMBER_OF_VIEWS',
            'NUMBER_OF_VOTES',
            'NUMBER_OF_COMMENTS',
          ];

          [...this[firstRow].children].slice(0, -1).forEach((th, index) => {
            th.innerHTML = `
              ${th.innerHTML}
              <br>
              <button
                style='${styles}'
                title='По возрастанию'
                data-album-sort-type='${albumSortingTypes[index]}_ASCENDING'
                aria-label='По возрастанию'
              >
                ▲
              </button>
              <button
                style='${styles}'
                title='По убыванию'
                data-album-sort-type='${albumSortingTypes[index]}_DESCENDING'
                aria-label='По убыванию'
              >
                ▼
              </button>
            `;
          });

          this[firstRow]
            .querySelectorAll('button[data-album-sort-type]')
            .forEach((control) => {
              control.addEventListener('click', (event) => {
                this.emit('event:controlСlick', {
                  albumSortType: event.target.dataset.albumSortType,
                });
              });
            });
        };

        initializeСontrols();
      }

      /**
       * @param {Array<HTMLTableRowElement>} rows
       * @returns {void}
       */
      render(rows) {
        this[rowContainer].innerHTML = '';
        this[rowContainer].append(this[firstRow], ...rows, this[lastRow]);
      }
    };
  })();

  const table = document.querySelector('.tdd');
  const rows = table.querySelectorAll('tr');
  const headerRows = [rows[0], rows[rows.length - 1]];
  const informationRows = Reflect.apply(Array.prototype.slice, rows, [1, -1]);

  const myStorage = Reflect.construct(MyStorage, ['album-sort-type']);
  const myModel = Reflect.construct(MyModel, [informationRows]);
  const myView = Reflect.construct(MyView, [headerRows, table]);

  myModel.on('event:sort', ({ rows: trs, albumSortType }) => {
    myView.render(trs);
    myStorage.set(albumSortType);
  });

  myModel.sort(
    AlbumSortType[myStorage.get()] || AlbumSortType['ALBUM_NAME_ASCENDING'],
  );

  myView.on('event:controlСlick', ({ albumSortType }) => {
    myModel.sort(AlbumSortType[albumSortType]);
  });
}
