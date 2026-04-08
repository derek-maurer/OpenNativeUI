export function applyThemeClass(
  theme: "light" | "dark" | "system",
  systemTheme: "light" | "dark"
): void {
  const effective = theme === "system" ? systemTheme : theme;
  document.documentElement.classList.toggle("dark", effective === "dark");
}
