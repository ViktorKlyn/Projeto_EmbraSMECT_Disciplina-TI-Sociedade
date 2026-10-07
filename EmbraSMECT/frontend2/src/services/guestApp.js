const baseGuestAppUrl = import.meta.env.VITE_GUEST_APP_URL || window.location.origin;

export function guestEventUrl(codigo, page = 'inscricao') {
  const baseUrl = baseGuestAppUrl.replace(/\/$/, '');
  if (page === 'cadastro') return `${baseUrl}/cadastro?evento=${encodeURIComponent(codigo)}`;

  const eventPath = `/evento/${encodeURIComponent(codigo)}`;
  const pagePath = page === 'acesso' ? '/acesso' : '';
  return `${baseUrl}${eventPath}${pagePath}`;
}
