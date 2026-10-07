import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { guestEventUrl } from '../services/guestApp';

export default function EventShare({ codigo, mostrarLinkInscricao = true }) {
  const [qrCode, setQrCode] = useState('');
  const [erro, setErro] = useState('');
  const url = guestEventUrl(codigo, 'acesso');
  const inscricaoUrl = guestEventUrl(codigo);

  useEffect(() => {
    let ativo = true;
    QRCode.toDataURL(url, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      .then((imagem) => {
        if (ativo) setQrCode(imagem);
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível gerar o QR code.');
      });

    return () => {
      ativo = false;
    };
  }, [url]);

  return <div className="event-share">
    <div>
      <span className="eyebrow">PÁGINA DO CONVIDADO</span>
      <p><a href={url} target="_blank" rel="noreferrer">Abrir acesso do convidado</a></p>
      <small>Compartilhe o link ou o QR code para o convidado entrar e ver a programação após a inscrição.</small>
      {mostrarLinkInscricao && <p><a href={inscricaoUrl} target="_blank" rel="noreferrer">Abrir página pública de inscrição</a></p>}
      {erro && <small className="error" role="alert">{erro}</small>}
    </div>
    {qrCode && <img src={qrCode} alt={`QR code do acesso do convidado ao evento ${codigo}`} width="110" height="110" />}
  </div>;
}
