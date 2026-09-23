/**
 * Mascara um e-mail para exibição, mantendo só o suficiente para
 * reconhecer de quem é sem expor o endereço completo — ex.:
 * "joaosilva@gmail.com" -> "jo*******@gmail.com".
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;

  const visibleCount = Math.min(2, local.length);
  const visible = local.slice(0, visibleCount);
  const masked = '*'.repeat(Math.max(local.length - visibleCount, 3));

  return `${visible}${masked}@${domain}`;
}
