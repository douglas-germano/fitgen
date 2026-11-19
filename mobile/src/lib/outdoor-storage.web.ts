export const outdoorStorage = {
  getItemSync: (key: string) => window.localStorage.getItem(key),
  setItemSync: (key: string, value: string) => window.localStorage.setItem(key, value),
  removeItemSync: (key: string) => window.localStorage.removeItem(key),
};
