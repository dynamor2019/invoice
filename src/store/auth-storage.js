const CURRENT_USER_KEY = 'fa_current_user';
const CURRENT_USER_COOKIE = 'fa_current_user_cookie';
const COOKIE_DAYS = 30;

function getCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}

function clearCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getCurrentUser() {
  const data = localStorage.getItem(CURRENT_USER_KEY) || getCookie(CURRENT_USER_COOKIE);
  if (!data) return null;
  try {
    const user = JSON.parse(data);
    if (user && localStorage.getItem(CURRENT_USER_KEY) !== data) {
      localStorage.setItem(CURRENT_USER_KEY, data);
    }
    return user;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    const data = JSON.stringify(user);
    localStorage.setItem(CURRENT_USER_KEY, data);
    setCookie(CURRENT_USER_COOKIE, data, COOKIE_DAYS);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
    clearCookie(CURRENT_USER_COOKIE);
  }
}
