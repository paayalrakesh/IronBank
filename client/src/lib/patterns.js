// Email: basic but solid (no spaces, one @, a dot TLD 2+)
export const EMAIL_RX   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Names: letters + spaces/’-/ only, 2–60 chars, must start with a letter
export const NAME_RX    = /^[A-Za-z][A-Za-z\s'-]{1,59}$/;

// SA ID: exactly 13 digits
export const ID_RX      = /^\d{13}$/;

// Bank account: exactly 10 digits
export const ACCOUNT_RX = /^\d{10}$/;

// Password: 8–64, at least 1 lower, 1 upper, 1 digit, 1 special
export const PASSWORD_RX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,64}$/;

// Helper for <input pattern="..."> (turn a RegExp into a string)
export const rxStr = (rx) => rx.source;
