import { useState } from 'react';
import {
  IconBuilding,
  IconUser,
  IconLock,
  IconArrowRight,
  IconSparkles,
  IconShieldCheck,
} from '../components/Icons';

function Login({ entrar }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState('');

  function enviarFormulario(event) {
    event.preventDefault();
    setErro('');

    const usuarioLimpo = usuario.trim();
    const senhaLimpa = senha.trim();

    if (!usuarioLimpo) {
      setErro('Por favor, informe seu usuário ou e-mail cadastrado.');
      return;
    }

    if (senhaLimpa.length < 4) {
      setErro('A senha deve possuir no mínimo 4 caracteres.');
      return;
    }

    entrar(usuarioLimpo);
  }

  function preencherDemo(nome, pass = '123456') {
    setUsuario(nome);
    setSenha(pass);
    setErro('');
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
          <label htmlFor="usuario">Usuário ou E-mail</label>
          <div className="input-with-icon">
            <span className="input-icon-left">
              <IconUser size={18} />
            </span>
            <input
              id="usuario"
              className="form-input"
              type="text"
              placeholder="Ex.: gustavo.silva"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
              autoFocus
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
              required
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

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
          <span>Entrar no Sistema</span>
          <IconArrowRight size={18} />
        </button>
      </form>

      <div className="quick-demo-box">
        <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', textAlign: 'center' }}>
          Ambiente de Demonstração Rápida:
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="quick-demo-btn"
            style={{ flex: 1 }}
            onClick={() => preencherDemo('Gustavo Silva')}
          >
            <span>Gustavo (Admin)</span>
          </button>
          <button
            type="button"
            className="quick-demo-btn"
            style={{ flex: 1 }}
            onClick={() => preencherDemo('Prof. Ricardo')}
          >
            <span>Prof. Ricardo</span>
          </button>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--slate-400)', fontSize: '0.75rem' }}>
        <IconShieldCheck size={14} />
        <span>Conexão criptografada e segura</span>
      </div>
    </section>
  );
}

export default Login;