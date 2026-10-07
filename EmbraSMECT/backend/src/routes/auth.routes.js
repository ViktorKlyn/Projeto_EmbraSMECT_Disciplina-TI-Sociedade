import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { criarToken, exigirAutenticacao } from '../middlewares/auth.js';
import { buscarUsuarioPorEmail } from '../repositories/usuario.repository.js';

const router = Router();

// Limita tentativas de login para reduzir tentativas repetidas de senha.
const limiteLogin = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { erro: 'Muitas tentativas. Aguarde 15 minutos.' } });

// GET não realiza login; a entrada correta é POST com email e senha.
router.get('/', (req, res) => res.status(405).json({ erro: 'Use POST /api/login para entrar.' }));

// Confirma a sessão atual e retorna os dados assinados no token.
router.get('/sessao', exigirAutenticacao, (req, res) => {
    const { id, nome, email, role, principal } = req.usuario;
    return res.json({ usuario: { id, nome, email, role, principal: Boolean(principal) } });
});

async function autenticar(req, res, papelEsperado) {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

    // A validação evita processar entradas claramente inválidas.
    if (!/^\S+@\S+\.\S+$/.test(email) || senha.length < 12) return res.status(400).json({ erro: 'E-mail ou senha inválidos.' });

    const usuario = buscarUsuarioPorEmail(email);
    const senhaValida = usuario ? await bcrypt.compare(senha, usuario.senha) : false;

    // Não revela se o problema foi o e-mail ou a senha.
    if (!usuario || !senhaValida) return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    if (!papelEsperado.includes(usuario.role)) {
        const mensagem = papelEsperado.includes('guest')
            ? 'Este acesso é exclusivo para convidados.'
            : 'Convidados devem entrar pelo link do evento.';
        return res.status(403).json({ erro: mensagem });
    }

    // O frontend recebe o mesmo papel assinado no token para montar a interface.
    return res.json({
        token: criarToken(usuario),
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role, principal: Boolean(usuario.principal) },
    });
}

// Separa o acesso de gestão da autenticação exclusiva para convidados.
router.post('/', limiteLogin, (req, res, next) => autenticar(req, res, ['admin', 'organizer']).catch(next));

router.post('/convidado', limiteLogin, (req, res, next) => autenticar(req, res, ['guest']).catch(next));
export default router;
