module.exports = {
  defineGetter: function defineGetter(obj, name, getter) {
    Object.defineProperty(obj, name, {
      configurable: true,
      enumerable: false,
      get: getter
    })
  },

  getRandomInt: function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  },
}
