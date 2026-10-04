import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';

export default function EventShare({ codigo }) {
  const [qrCode, setQrCode] = useState('');
  const [erro, setErro] = useState('');
  const url = `${window.location.origin}/evento/${encodeURIComponent(codigo)}`;

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
      <span className="eyebrow">PÁGINA PÚBLICA DO EVENTO</span>
      <p><Link to={`/evento/${encodeURIComponent(codigo)}`} target="_blank" rel="noreferrer">Abrir página e fazer inscrição</Link></p>
      <small>Compartilhe o link ou o QR code para os convidados consultarem os detalhes e se inscreverem.</small>
      {erro && <small className="error" role="alert">{erro}</small>}
    </div>
    {qrCode && <img src={qrCode} alt={`QR code da página do evento ${codigo}`} width="110" height="110" />}
  </div>;
}
