import { useState } from 'react';
import {
  IconBuilding,
  IconUser,
  IconLock,
  IconArrowRight,
  IconSparkles,
  IconShieldCheck,
} from '../components/Icons';
import api from '../services/api';

function Login({ entrar }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviarFormulario(event) {
    event.preventDefault();
    setErro('');

    if (!email.trim() || senha.length < 12) {
      setErro('Informe seu e-mail cadastrado e uma senha com pelo menos 12 caracteres.');
      return;
    }

    setCarregando(true);
    try {
      const { data } = await api.post('/api/login', { email: email.trim(), senha });
      entrar(data, lembrar);
    } catch (loginError) {
      setErro(loginError.response?.data?.erro || 'Não foi possível entrar. Verifique a conexão com a API.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="login-wrapper page" aria-label="Tela de Autenticação">
      <div className="login-header">
        <div className="login-brand-icon">
          <IconBuilding size={32} />
        </div>
        <div className="login-badge">
          <IconSparkles size={14} />
          <span>Gestão Acadêmica de Salas</span>
        </div>
        <h1>Embrapa Meeting</h1>
        <p>Acesse o portal para gerenciar salas e reservas de recursos</p>
      </div>

      {erro && (
        <div
          role="alert"
          style={{
            background: 'var(--rose-50)',
            border: '1px solid var(--rose-200)',
            color: 'var(--rose-700)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>⚠️</span>
          <span>{erro}</span>
        </div>
      )}

      <form onSubmit={enviarFormulario}>
        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <div className="input-with-icon">
            <span className="input-icon-left">
              <IconUser size={18} />
            </span>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="voce@exemplo.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="username"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="senha">Senha de Acesso</label>
          <div className="input-with-icon">
            <span className="input-icon-left">
              <IconLock size={18} />
            </span>
            <input
              id="senha"
              className="form-input"
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={12}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="input-icon-right"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              title={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
            >
              {mostrarSenha ? 'Ocultar' : 'Ver'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', color: 'var(--slate-600)' }}>
            <input
              type="checkbox"
              checked={lembrar}
              onChange={(e) => setLembrar(e.target.checked)}
              style={{ accentColor: 'var(--primary-600)' }}
            />
            Lembrar acesso
          </label>
          <span style={{ color: 'var(--primary-600)', fontWeight: 600, cursor: 'pointer' }}>
            Precisa de ajuda?
          </span>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }} disabled={carregando}>
          <span>{carregando ? 'Verificando...' : 'Entrar no Sistema'}</span>
          <IconArrowRight size={18} />
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--slate-400)', fontSize: '0.75rem' }}>
        <IconShieldCheck size={14} />
        <span>Acesso protegido por credenciais individuais</span>
      </div>
    </section>
  );
}

export default Login;