export const EMAIL_RX   = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
export const NAME_RX    = /^[A-Za-z][A-Za-z\s'\-]{1,49}$/;   // 2–50 chars
export const ID_RX      = /^\d{13}$/;                        // 13 digits
export const ACCOUNT_RX = /^\d{10}$/;                        // 10 digits
export const PASSWORD_RX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{10,}$/;
