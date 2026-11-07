import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { guestEventUrl } from '../services/guestApp';

export default function EventShare({ codigo, reservado = false }) {
  const [qrCode, setQrCode] = useState('');
  const [erro, setErro] = useState('');
  const url = guestEventUrl(codigo, 'acesso');

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

  if (reservado) {
    return <div className="event-share">
      <div>
        <span className="eyebrow">EVENTO RESERVADO</span>
        <p>Código para compartilhar com os convidados autorizados: <strong>{codigo}</strong></p>
        <small>O convidado deve entrar no portal e informar este código para localizar o evento.</small>
      </div>
    </div>;
  }

  return <div className="event-share">
    <div>
      <span className="eyebrow">PÁGINA DO CONVIDADO</span>
      <p><a href={url} target="_blank" rel="noreferrer">Abrir acesso do convidado</a></p>
      <small>Compartilhe o link ou o QR code para o convidado entrar e ver a programação após a inscrição.</small>
      {erro && <small className="error" role="alert">{erro}</small>}
    </div>
    {qrCode && <img src={qrCode} alt={`QR code do acesso do convidado ao evento ${codigo}`} width="110" height="110" />}
  </div>;
}
