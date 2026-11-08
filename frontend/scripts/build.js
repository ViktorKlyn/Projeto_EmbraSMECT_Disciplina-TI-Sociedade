const apiUrl = process.env.REACT_APP_API_URL || process.env.VITE_API_URL;

if (process.env.NODE_ENV !== 'development' && !apiUrl?.trim()) {
  console.error('Configure REACT_APP_API_URL (ou VITE_API_URL) com a URL pública do backend antes do build de produção.');
  process.exit(1);
}

if (apiUrl) {
  process.env.REACT_APP_API_URL = apiUrl.trim();
}

require('react-scripts/scripts/build');
