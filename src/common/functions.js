class Functions {
  static async retry(
    taskFn,
    predicateFn = tryIndex => tryIndex <= 5,
    backoffProvider = (tryIndex, previousBackoffMs) => previousBackoffMs * 2
  ) {
    if (typeof taskFn !== 'function') {
      throw new TypeError(`Functions#retry first arg expected to be a function`);
    }

    let tryIndex = 0;
    let backoffMs;
    const taskWrapperFn = async () => {
      tryIndex += 1;
      try {
        const out = await Promise.resolve(taskFn());
        return out;
      } catch (ex) {
        if (predicateFn(tryIndex, ex)) {
          backoffMs = backoffProvider(tryIndex, backoffMs);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          return taskWrapperFn();
        }
        throw ex;
      }
    };
    return taskWrapperFn();
  }
}

module.exports.Functions = Functions;
