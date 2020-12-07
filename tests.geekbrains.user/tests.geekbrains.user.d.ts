declare const ROOT_ELEMENT: HTMLDivElement;
declare class MyStorage<Type> {
  getNamespace: () => string;
  constructor(namespace: string);
  static isAvailable(): boolean;
  get(): Type | null;
  set(data: Type): boolean;
}
interface Store<Type> {
  get(): Type | null;
  set(data: Type): boolean;
}
declare type TestItem = {
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
declare const storageName: string;
declare const myStorage: Store<Array<TestItem>>;
declare function parse(rootElement?: HTMLDivElement): TestItem;
declare function load(
  questionId: string,
  storage?: Store<TestItem[]>
): TestItem | null;
declare function save(testItem: TestItem, storage?: Store<TestItem[]>): void;
declare function set(testItem: TestItem, rootElement?: HTMLDivElement): void;
declare function rootElementMutationHandler(): void;
declare function buttonClickHandler(event: Event): void;
declare function main(): void;
