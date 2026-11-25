// Shared test accounts for people trying papr, set in Vercel as TEST_LOGINS. They skip the email step.
// Format: email:code[:role], separated by commas. The code is 6 digits; role is student, lecturer or reader.
//   TEST_LOGINS="student@test.papr.edu.gh:483920, lecturer@test.papr.edu.gh:771204:lecturer, reader@test.papr.app:550318:reader"
// Test accounts can never be admins or moderators. Remove TEST_LOGINS to switch them off.
export type TestLogin = { email: string; code: string; role: "student" | "lecturer" | "reader" };

export function testLogin(email: string): TestLogin | null {
  for (const item of (process.env.TEST_LOGINS || "").split(",")) {
    const [e, code, role] = item.trim().split(":").map((s) => s.trim());
    if (!e || e.toLowerCase() !== email || !/^\d{6}$/.test(code || "")) continue;
    const r = role === "lecturer" || role === "reader" ? role : "student";
    return { email: e.toLowerCase(), code, role: r };
  }
  return null;
}
