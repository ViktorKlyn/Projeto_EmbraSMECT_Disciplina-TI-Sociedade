import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { criarToken } from '../middlewares/auth.js';

const router = Router();
const limiteLogin = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { erro: 'Muitas tentativas. Aguarde 15 minutos.' } });
const usuarios = [
    { id: 1, nome: 'Joao Klein', email: 'joaoklein@email.com', senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
    { id: 2, nome: 'Gustavo Lira', email: 'gustavolira@email.com', senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
    { id: 3, nome: 'Fernando Vinícuis', email: 'fernandovinicius@email.com', senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
    { id: 4, nome: 'Nicolas Toshio', email: 'nicolastoshio@email.com', senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
    { id: 5, nome: 'Lormilus Kendy', email: 'lormiluskendy@email.com', senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
    { id: 6, nome: 'Helton Azevedo', email: 'heltonazevedo@email.com', senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
    { id: 7, nome: 'Visitante', email: 'visituser@email.local', senha: '$2a$12$3S6QBrMkmWBPd2OqoaFDl.Uhvw8Y2CdVg6PnPCwyMqlfp4l2iD9Xq' },
];

router.get('/', (req, res) => res.status(405).json({ erro: 'Use POST /api/login para entrar.' }));
router.post('/', limiteLogin, async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const senha = typeof req.body.senha === 'string' ? req.body.senha : '';
    if (!/^\S+@\S+\.\S+$/.test(email) || senha.length < 12) return res.status(400).json({ erro: 'E-mail ou senha inválidos.' });
    const usuario = usuarios.find((item) => item.email === email);
    const senhaValida = usuario ? await bcrypt.compare(senha, usuario.senha) : false;
    if (!usuario || !senhaValida) return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    return res.json({ token: criarToken(usuario), usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
});
export default router;
