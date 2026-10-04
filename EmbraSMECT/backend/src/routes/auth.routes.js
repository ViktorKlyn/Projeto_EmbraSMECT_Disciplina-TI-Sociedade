import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { criarToken } from '../middlewares/auth.js';
import { buscarUsuarioPorEmail } from '../repositories/usuario.repository.js';

const router = Router();

// Limita tentativas de login para reduzir tentativas repetidas de senha.
const limiteLogin = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { erro: 'Muitas tentativas. Aguarde 15 minutos.' } });

// GET não realiza login; a entrada correta é POST com email e senha.
router.get('/', (req, res) => res.status(405).json({ erro: 'Use POST /api/login para entrar.' }));

// Valida as credenciais, compara a senha criptografada e devolve um JWT.
router.post('/', limiteLogin, async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

    // A validação evita processar entradas claramente inválidas.
    if (!/^\S+@\S+\.\S+$/.test(email) || senha.length < 12) return res.status(400).json({ erro: 'E-mail ou senha inválidos.' });

    const usuario = buscarUsuarioPorEmail(email);
    const senhaValida = usuario ? await bcrypt.compare(senha, usuario.senha) : false;

    // Não revela se o problema foi o e-mail ou a senha.
    if (!usuario || !senhaValida) return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });

    // O frontend recebe o mesmo papel assinado no token para montar a interface.
    return res.json({
        token: criarToken(usuario),
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role, principal: Boolean(usuario.principal) },
    });
});
export default router;
