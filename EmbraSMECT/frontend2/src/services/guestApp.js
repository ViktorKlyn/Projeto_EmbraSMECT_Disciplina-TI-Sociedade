const baseGuestAppUrl = import.meta.env.VITE_GUEST_APP_URL || 'https://projeto-embra-smect-disciplina-ti-sociedade-zoqo-r45u3k1of.vercel.app';

export function guestPortalUrl() {
  return baseGuestAppUrl.replace(/\/$/, '');
}

export function guestEventUrl(codigo, page = 'inscricao') {
  const baseUrl = guestPortalUrl();
  if (page === 'cadastro') return `${baseUrl}/cadastro?evento=${encodeURIComponent(codigo)}`;

  const eventPath = `/evento/${encodeURIComponent(codigo)}`;
  const pagePath = page === 'acesso' ? '/acesso' : '';
  return `${baseUrl}${eventPath}${pagePath}`;
}
