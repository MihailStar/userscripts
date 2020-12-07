/**
 * @description Конвертирует закладки Google (Netscape Bookmark File Format) в валидный HTML
 */

const fs = require('fs');

const READ_FILE = './GoogleBookmarks.html';
const WRITE_FILE = './Bookmarks.html';

/**
 * @param {string} fileName
 * @param {string} [encoding]
 */
function readData(fileName, encoding = 'utf-8') {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, encoding, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * @param {string} data
 */
function parseData(data) {
  return data.match(/<dt>[\d\D]+?<\/dl><p>/gi).map((item) => ({
    title: item.match(/<h3.*?>(.*)<\/h3>/i)[1],
    links: item.match(/<a.+<\/a>/gi).map((link) => {
      const [, href, addDate, title] = link.match(
        /<a href="(.*)" add_date="(.*)">(.*)<\/a>/i,
      );
      return { href, addDate, title };
    }),
  }));
}

/**
 * @param {Object[]} data
 * @param {string} data[].title
 * @param {Object[]} data[].links
 * @param {string} data[].links[].href
 * @param {string} data[].links[].addDate
 * @param {string} data[].links[].title
 */
function sortData(data) {
  return data.map(({ title, links }) => ({
    title,
    links: links.sort((a, b) => b.addDate - a.addDate),
  }));
}

/**
 * @param {Object[]} data
 * @param {string} data[].title
 * @param {Object[]} data[].links
 * @param {string} data[].links[].href
 * @param {string} data[].links[].addDate
 * @param {string} data[].links[].title
 */
function generateLayout(data) {
  const bookmarks = data
    .map(({ title: heading, links }) => {
      const items = links
        .map(
          ({ href, addDate, title }) => `
            <li>
              <a href="${href}" data-add-date="${addDate}">
                ${title}
              </a>
            </li>`,
        )
        .join('');

      return `
        <h2>${heading}</h2>
        <ul>
          ${items}
        </ul>`;
    })
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          html {
            font-family: sans-serif;
          }
        </style>
        <title>Bookmarks</title>
      </head>
      <body>
        <h1>Bookmarks</h1>
        ${bookmarks}
      </body>
    </html>`;
}

/**
 * @param {string} fileName
 * @param {string} data
 */
function writeData(fileName, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, data, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

// eslint-disable-next-line no-console
console.time('time');

readData(READ_FILE)
  .then(parseData)
  .then(sortData)
  .then(generateLayout)
  .then(writeData.bind(null, WRITE_FILE))
  .catch((error) => {
    throw error;
  });

// eslint-disable-next-line no-console
console.timeEnd('time');
