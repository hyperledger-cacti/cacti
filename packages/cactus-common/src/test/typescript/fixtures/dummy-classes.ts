// tslint:disable: max-classes-per-file

export class Base {
  private readonly y: string;

  constructor() {
    this.y = "y";
  }

  getX() {
    return "x";
  }
}

export class A extends Base {
  private readonly b: string;

  constructor() {
    super();
    this.b = "b";
  }

  getA() {
    return "a";
  }
}
