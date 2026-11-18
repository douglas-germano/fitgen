// Limit credentials and onboarding drafts to the current browser session.
export const getItemAsync = async (key: string) => window.sessionStorage.getItem(key);
export const setItemAsync = async (key: string, value: string) => window.sessionStorage.setItem(key, value);
export const deleteItemAsync = async (key: string) => window.sessionStorage.removeItem(key);
