/*
  Password rules for team leads, following NIST SP 800-63B rather than
  composition rules: length is what makes a password strong, and "must contain
  a symbol" mostly produces "Password1!". So: 12–128 characters, not built
  from the email address, and not on a list of the passwords attackers try
  first. Shared by the API (enforcement) and the form (live feedback).
*/

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

// The most common passwords and patterns that survive a 12-char minimum.
const COMMON = new Set([
  "password1234", "password12345", "password123456", "passwordpassword", "123456789012",
  "1234567890123", "12345678901234", "qwertyuiop12", "qwerty123456", "qwertyuiopasdf",
  "iloveyou1234", "welcome12345", "welcome@1234", "admin1234567", "administrator",
  "letmein12345", "football1234", "baseball1234", "sunshine1234", "princess1234",
  "abcdefghijkl", "abc123456789", "aaaaaaaaaaaa", "111111111111", "000000000000",
  "changeme1234", "p@ssw0rd1234", "passw0rd1234", "india@123456", "qwerty@12345",
  "aczen1234567", "aczenaczen12", "aczenai12345", "aczenstudio1",
  "trustno11234", "monkey123456", "dragon123456", "master123456", "zaq12wsxcde3",
  "1q2w3e4r5t6y", "asdfghjkl123", "zxcvbnm12345", "password@123", "Password@123",
]);

export interface PolicyResult {
  ok: boolean;
  problems: string[];
}

export function checkPassword(password: string, email: string): PolicyResult {
  const problems: string[] = [];
  const lower = password.toLowerCase();
  const normalisedEmail = email.trim().toLowerCase();
  const localPart = normalisedEmail.split("@")[0] ?? "";

  if (password.length < PASSWORD_MIN) problems.push(`Use at least ${PASSWORD_MIN} characters.`);
  if (password.length > PASSWORD_MAX) problems.push(`Use at most ${PASSWORD_MAX} characters.`);
  if (lower === normalisedEmail || lower.includes(normalisedEmail)) {
    problems.push("It can't be, or contain, your email address.");
  } else if (localPart.length >= 4 && lower.includes(localPart)) {
    problems.push("It can't contain the name part of your email address.");
  }
  if (COMMON.has(lower) || COMMON.has(password)) problems.push("That password is too common.");
  if (/^(.)\1+$/.test(password)) problems.push("It can't be one character repeated.");
  if (new Set(password).size < 5) problems.push("Use more varied characters.");

  return { ok: problems.length === 0, problems };
}
