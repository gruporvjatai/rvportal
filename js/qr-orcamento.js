const WHATSAPP_ORCAMENTO = '556436364861';

function mensagemWhatsAppOrcamento(id, valor) {
    const referencia = id ? `o orçamento nº ${id}` : 'um orçamento';
    return `Olá! Estou vendo ${referencia}, no valor de ${valor}. Gostaria de mais informações.`;
}

function linkWhatsAppOrcamento(id, valor) {
    return `https://wa.me/${WHATSAPP_ORCAMENTO}?text=${encodeURIComponent(mensagemWhatsAppOrcamento(id, valor))}`;
}

let _qrLogoPromise = null;

function carregarLogoQr() {
    if (!_qrLogoPromise) {
        const logoUrl = new URL('logorvnegocios.png', window.location.href).href;
        _qrLogoPromise = new Promise(resolve => {
            const img = new Image();
            let concluido = false;
            const finalizar = (valor) => { if (!concluido) { concluido = true; resolve(valor); } };
            img.onload = () => finalizar(img);
            img.onerror = () => finalizar(null);
            img.src = logoUrl;
            setTimeout(() => finalizar(img.complete && img.naturalWidth ? img : null), 1500);
        });
    }
    return _qrLogoPromise;
}

function desenharRetanguloArredondado(ctx, x, y, largura, altura, raio) {
    const r = Math.min(raio, largura / 2, altura / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + largura, y, x + largura, y + altura, r);
    ctx.arcTo(x + largura, y + altura, x, y + altura, r);
    ctx.arcTo(x, y + altura, x, y, r);
    ctx.arcTo(x, y, x + largura, y, r);
    ctx.closePath();
}

function qrParaCanvasDataURL(texto, tamanhoPx = 520, logoImg = null) {
    if (typeof qrcode === 'undefined') return null;
    try {
        const qr = qrcode(0, 'M');
        qr.addData(texto);
        qr.make();
        const modulos = qr.getModuleCount();
        const margemBranca = 4;
        const totalUnidades = modulos + margemBranca * 2;
        const escala = Math.max(1, Math.floor(tamanhoPx / totalUnidades));
        const lado = totalUnidades * escala;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = lado;
        const ctx = canvas.getContext('2d');

        const linha = Math.max(1, escala * 0.7);
        const inset = linha / 2;
        ctx.fillStyle = '#ffffff';
        desenharRetanguloArredondado(ctx, inset, inset, lado - linha, lado - linha, escala * 7);
        ctx.fill();
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = linha;
        ctx.stroke();

        const origem = margemBranca * escala;
        ctx.fillStyle = '#000000';
        for (let l = 0; l < modulos; l++) {
            for (let c = 0; c < modulos; c++) {
                if (qr.isDark(l, c)) {
                    ctx.fillRect(Math.round(origem + c * escala), Math.round(origem + l * escala), escala, escala);
                }
            }
        }

        if (logoImg && logoImg.naturalWidth) {
            const ladoQr = modulos * escala;
            const caixa = Math.round(ladoQr * 0.19);
            const centro = origem + ladoQr / 2;
            const x = centro - caixa / 2;
            const y = centro - caixa / 2;
            ctx.fillStyle = '#ffffff';
            desenharRetanguloArredondado(ctx, x, y, caixa, caixa, caixa * 0.22);
            ctx.fill();
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = Math.max(1, escala * 0.45);
            ctx.stroke();
            const margemLogo = caixa * 0.14;
            const disponivel = caixa - margemLogo * 2;
            const proporcao = Math.min(disponivel / logoImg.naturalWidth, disponivel / logoImg.naturalHeight);
            const larguraLogo = logoImg.naturalWidth * proporcao;
            const alturaLogo = logoImg.naturalHeight * proporcao;
            ctx.drawImage(logoImg, centro - larguraLogo / 2, centro - alturaLogo / 2, larguraLogo, alturaLogo);
        }

        return canvas.toDataURL('image/png');
    } catch (e) {
        console.warn('Falha ao gerar QR Code do orçamento:', e);
        return null;
    }
}

async function gerarQrOrcamentoDataURL(id, valor, tamanhoPx = 520) {
    const logo = await carregarLogoQr();
    return qrParaCanvasDataURL(linkWhatsAppOrcamento(id, valor), tamanhoPx, logo);
}

function qrOrcamentoHtml(dataUrl) {
    if (!dataUrl) return '';
    return `<div class="qr-page-footer"><img class="qr-card" src="${dataUrl}" alt="QR Code WhatsApp" /><div class="qr-caption"><strong>Fale com a RV</strong>Aponte a câmera do celular<br>(64) 3636-4861</div></div>`;
}
