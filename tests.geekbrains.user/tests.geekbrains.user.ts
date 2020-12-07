// ==UserScript==
// @name tests.geekbrains
// @description Добавляет мемоизацию пройденных тестов на geekbrains.ru
// @version 0.0.1
// @license WTFPL
// @author MihailStar
// @match https://geekbrains.ru/tests/*/run
// @grant none
// Браузер на основе Chromium + расширение Tampermonkey
// ==/UserScript==

'use strict';

const ROOT_ELEMENT = document.querySelector(
  '#questions-wrapper'
) as HTMLDivElement;

if (!(ROOT_ELEMENT instanceof HTMLDivElement)) {
  throw new Error('Element not found');
}

class MyStorage<Type> {
  public getNamespace: () => string;

  constructor(namespace: string) {
    this.getNamespace = () => namespace;
  }

  static isAvailable(): boolean {
    const identifier = Date.now().toString();

    try {
      localStorage.setItem(identifier, identifier);
      localStorage.removeItem(identifier);

      return true;
    } catch {
      return false;
    }
  }

  get(): Type | null {
    try {
      const data = localStorage.getItem(this.getNamespace());

      return typeof data === 'string' ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  set(data: Type): boolean {
    try {
      localStorage.setItem(this.getNamespace(), JSON.stringify(data));

      return true;
    } catch {
      return false;
    }
  }
}

if (!MyStorage.isAvailable()) {
  throw new Error('Storage not available');
}

interface Store<Type> {
  get(): Type | null;
  set(data: Type): boolean;
}

type TestItem = {
  subject: string;
  question: {
    id: string;
    text: string;
    code: string;
  };
  answers: {
    id: string;
    text: string;
    checked: boolean;
  }[];
};

const storageName = `test-${
  (window.location.pathname.match(/tests\/(\d+)/) ?? [])[1]
}`;
const myStorage: Store<Array<TestItem>> = new MyStorage<Array<TestItem>>(
  storageName
);

function parse(rootElement = ROOT_ELEMENT): TestItem {
  const $subject = rootElement.querySelector(
    'div:first-child'
  ) as HTMLDivElement;
  const question = {
    $id: rootElement.querySelector('[data-question-id]') as HTMLDivElement,
    $text: rootElement.querySelector('h3') as HTMLHeadingElement,
    $code: rootElement.querySelector('.highlight') as HTMLDivElement,
  };
  const $items = Array.from(rootElement.querySelectorAll<HTMLLIElement>('li'));
  const answers = $items.map(($item) => ({
    $id: $item.querySelector('input') as HTMLInputElement,
    $text: $item.querySelector('code') as Element,
    get checked() {
      return $item.classList.contains('active');
    },
  }));

  if (
    !($subject instanceof HTMLDivElement) ||
    !(question.$id instanceof HTMLDivElement) ||
    !(question.$text instanceof HTMLHeadingElement) ||
    !$items.length ||
    !answers.every(
      (answer) =>
        answer.$id instanceof HTMLInputElement &&
        answer.$text instanceof Element
    )
  ) {
    throw new Error('Element not found');
  }

  const testItem: TestItem = {
    subject: $subject.textContent?.slice(6) ?? '',
    question: {
      id: question.$id.dataset.questionId ?? '',
      text: question.$text.textContent ?? '',
      code: question.$code?.textContent ?? '',
    },
    answers: answers.map((answer) => ({
      id: answer.$id.dataset.id ?? '',
      text: answer.$text.textContent ?? '',
      get checked() {
        return answer.checked;
      },
    })),
  };

  return testItem;
}

function load(questionId: string, storage = myStorage): TestItem | null {
  const testItems = storage.get();

  if (!testItems) {
    return null;
  }

  return testItems.find((item) => item.question.id === questionId) ?? null;
}

function save(testItem: TestItem, storage = myStorage): void {
  const testItems = storage.get();

  if (!testItems) {
    storage.set([testItem]);
  } else {
    storage.set([
      ...testItems.filter((item) => item.question.id !== testItem.question.id),
      testItem,
    ]);
  }
}

function set(testItem: TestItem, rootElement = ROOT_ELEMENT): void {
  const $inputs = Array.from(
    rootElement.querySelectorAll<HTMLInputElement>('li input')
  );

  if (!$inputs.length) {
    throw new Error('Element not found');
  }

  testItem.answers.forEach((answer) => {
    if (answer.checked) {
      const $matchedInput = $inputs.find(
        ($input) => $input.dataset.id === answer.id
      );

      if ($matchedInput) {
        $matchedInput.style.outline = 'solid';
      }
    }
  });
}

function rootElementMutationHandler(): void {
  const loadedTestItem = load(parse().question.id);

  if (loadedTestItem) {
    set(loadedTestItem);
  }
}

function buttonClickHandler(event: Event): void {
  event.preventDefault();
  event.stopImmediatePropagation();
  save(parse());
  (event.target as HTMLButtonElement).click();
}

function main(): void {
  new MutationObserver(rootElementMutationHandler).observe(ROOT_ELEMENT, {
    childList: true,
  });

  const $button = document.querySelector('#answer-button') as HTMLButtonElement;

  if (!($button instanceof HTMLButtonElement)) {
    throw new Error('Element not found');
  }

  $button.addEventListener('click', buttonClickHandler);
}

main();
