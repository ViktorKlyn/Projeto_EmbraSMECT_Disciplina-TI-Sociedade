import { useState } from 'react';

function Login({ entrar }) {
    // Os dados são usados apenas para simular um login local.
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');

    function enviarFormulario(event) {
        event.preventDefault();
        if (usuario.trim() && senha.trim()) entrar(usuario.trim());
    }

    return (
        <section className="page login-page">
            <h1>EmbraSMECT</h1>
            <p>Entre para acessar o sistema.</p>
            <form className="form-card" onSubmit={enviarFormulario}>
                <label htmlFor="usuario">Usuário</label>
                <input id="usuario" value={usuario} onChange={(event) => setUsuario(event.target.value)} required />
                <label htmlFor="senha">Senha</label>
                <input id="senha" type="password" value={senha} onChange={(event) => setSenha(event.target.value)} required />
                <button type="submit">Entrar</button>
            </form>
        </section>
    );
}

export default Login;