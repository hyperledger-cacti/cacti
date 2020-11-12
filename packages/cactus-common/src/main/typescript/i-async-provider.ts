/**
 * A generic interface to be implemented by objects/classes that want to express
 * their ability of returning a certain type of object or value in an async
 * manner (e.g. by returning a Promise of what is actually being provided).
 */
export interface IAsyncProvider<T> {
  /**
   * Obtains the value/object meant to be provided by this `IAsyncProvider`
   * implementation.
   */
  get(): Promise<T>;
}
