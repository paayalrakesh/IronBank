// Email: simple, safe
export const EMAIL_RX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

// Names: letters, spaces, apostrophe, hyphen (2–50 chars total)
export const NAME_RX = /^[A-Za-z][A-Za-z\s'\-]{1,49}$/;

// South African ID: exactly 13 digits
export const ID_RX = /^\d{13}$/;

// Bank account: exactly 10 digits
export const ACCOUNT_RX = /^\d{10}$/;

// Strong password: >=10 chars, upper+lower+digit+symbol
export const PASSWORD_RX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{10,}$/;
