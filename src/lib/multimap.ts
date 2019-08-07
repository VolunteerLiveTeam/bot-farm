type CB<K, V, T> = (value: V, key: K, multimap: T) => any;

function isCB<K, V, T>(wat: any): wat is CB<K, V, T> {
  return typeof wat === "function";
}

export default class Multimap<K, V> {
  private data: Map<K, V[]> = new Map();
  get(key: K): V[] {
    const rez = this.data.get(key);
    if (rez) {
      return rez;
    } else {
      return [];
    }
  }
  has(key: K) {
    return this.data.has(key);
  }
  add(key: K, value: V) {
    let val = this.data.get(key);
    if (!val) {
      val = [];
    }
    if (!val.includes(value)) {
      val.push(value);
      this.data.set(key, val);
    }
  }
  remove(key: K, value: V) {
    let val = this.data.get(key);
    if (!val) {
      val = [];
    }
    if (val.includes(value)) {
      val.splice(val.indexOf(value), 1);
      this.data.set(key, val);
    }
  }
  delete(key: K) {
    return this.data.delete(key);
  }
  forEach(key: K, callback: CB<K, V, this>): void;
  forEach(callback: CB<K, V, this>): void;
  forEach(keyOrCallback: K | CB<K, V, this>, cbMaybe?: CB<K, V, this>) {
    if (isCB<K, V, this>(keyOrCallback)) {
      this.data.forEach((vals, key) => {
        vals.forEach(val => keyOrCallback(val, key, this));
      });
    } else {
      (this.data.get(keyOrCallback) || []).forEach(x =>
        cbMaybe!(x, keyOrCallback, this)
      );
    }
  }
  clear() {
    this.data.clear();
  }
  keys() {
    return this.data.keys();
  }
}
