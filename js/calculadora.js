// ============================================================
// calculadora.js - Calculadora Financeira para PDV
// Dependência: mathjs (carregado via CDN)
// ============================================================

(function() {
    'use strict';

    // === VERIFICAÇÃO DE CARREGAMENTO DO MATHJS ===
    function verificarMathJS() {
        if (typeof math === 'undefined' && typeof window.math === 'undefined') {
            console.error('❌ mathjs não encontrado. Verifique o CDN.');
            return false;
        }
        // Se math estiver no window, atribui para uso local
        if (typeof math === 'undefined' && typeof window.math !== 'undefined') {
            window.math = window.math;
        }
        return true;
    }

    // === VARIÁVEIS DE ESTADO ===
    let calculadoraAberta = false;
    let containerCalculadora = null;

    // === CONFIGURAÇÕES ===
    const CONFIG = {
        titulo: 'Calculadora Financeira',
        corPrimaria: '#059669',
        corSecundaria: '#f1f5f9'
    };

    // === FUNÇÕES FINANCEIRAS ===
    function calcularValorFuturo() {
        const pv = parseFloat(document.getElementById('cf-pv').value) || 0;
        const taxa = parseFloat(document.getElementById('cf-taxa').value) / 100 || 0;
        const n = parseFloat(document.getElementById('cf-n').value) || 0;
        if (n <= 0) { document.getElementById('cf-resultado').innerText = 'Período deve ser > 0'; return; }
        const fv = math.fv(taxa, n, 0, -pv);
        document.getElementById('cf-resultado').innerHTML = `<strong>Valor Futuro:</strong> ${formatMoney(fv)}`;
    }

    function calcularValorPresente() {
        const fv = parseFloat(document.getElementById('cf-fv').value) || 0;
        const taxa = parseFloat(document.getElementById('cf-taxa2').value) / 100 || 0;
        const n = parseFloat(document.getElementById('cf-n2').value) || 0;
        if (n <= 0) { document.getElementById('cf-resultado2').innerText = 'Período deve ser > 0'; return; }
        const pv = math.pv(taxa, n, 0, fv);
        document.getElementById('cf-resultado2').innerHTML = `<strong>Valor Presente:</strong> ${formatMoney(-pv)}`;
    }

    function calcularParcela() {
        const pv = parseFloat(document.getElementById('cp-pv').value) || 0;
        const taxa = parseFloat(document.getElementById('cp-taxa').value) / 100 || 0;
        const n = parseFloat(document.getElementById('cp-n').value) || 0;
        if (n <= 0) { document.getElementById('cp-resultado').innerText = 'Período deve ser > 0'; return; }
        const pmt = math.pmt(taxa, n, pv);
        document.getElementById('cp-resultado').innerHTML = `<strong>Parcela:</strong> ${formatMoney(pmt)}`;
    }

    function calcularTaxa() {
        const pv = parseFloat(document.getElementById('ct-pv').value) || 0;
        const pmt = parseFloat(document.getElementById('ct-pmt').value) || 0;
        const n = parseFloat(document.getElementById('ct-n').value) || 0;
        if (n <= 0 || pv <= 0) { document.getElementById('ct-resultado').innerText = 'Valores inválidos'; return; }
        try {
            const taxa = math.rate(n, pmt, pv);
            document.getElementById('ct-resultado').innerHTML = `<strong>Taxa de Juros:</strong> ${(taxa * 100).toFixed(2)}% a.m.`;
        } catch (e) {
            document.getElementById('ct-resultado').innerText = 'Erro: verifique os valores';
        }
    }

    // === HELPER: Formatação de moeda ===
    function formatMoney(val) {
        return parseFloat(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // === CRIAÇÃO DA INTERFACE ===
    function criarHTMLCalculadora() {
        return `
        <div id="calculadora-financeira" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 95%;
            max-width: 600px;
            max-height: 90vh;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            z-index: 9999;
            display: none;
            flex-direction: column;
            overflow: hidden;
            font-family: 'Segoe UI', sans-serif;
            border: 1px solid #e2e8f0;
        ">
            <!-- HEADER -->
            <div style="background: #059669; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; color: white;">
                <span style="font-size: 18px; font-weight: bold;">🧮 Calculadora Financeira</span>
                <button id="btn-fechar-calculadora" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0 8px;">✕</button>
            </div>

            <!-- CORPO COM ABAS -->
            <div style="padding: 16px; overflow-y: auto; flex: 1; background: #f8fafc;">
                <!-- Abas -->
                <div style="display: flex; gap: 6px; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; flex-wrap: wrap;">
                    <button class="aba-btn ativo" data-aba="vf" style="padding: 8px 16px; border: none; background: transparent; font-weight: bold; color: #059669; border-bottom: 3px solid #059669; cursor: pointer;">Valor Futuro</button>
                    <button class="aba-btn" data-aba="vp" style="padding: 8px 16px; border: none; background: transparent; font-weight: bold; color: #64748b; border-bottom: 3px solid transparent; cursor: pointer;">Valor Presente</button>
                    <button class="aba-btn" data-aba="pmt" style="padding: 8px 16px; border: none; background: transparent; font-weight: bold; color: #64748b; border-bottom: 3px solid transparent; cursor: pointer;">Parcela</button>
                    <button class="aba-btn" data-aba="taxa" style="padding: 8px 16px; border: none; background: transparent; font-weight: bold; color: #64748b; border-bottom: 3px solid transparent; cursor: pointer;">Taxa</button>
                </div>

                <!-- ABAS CONTEÚDO -->
                <div id="aba-vf" class="aba-conteudo">
                    <div style="background: white; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <div style="margin-bottom: 12px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Valor Presente (R$)</label><input type="number" id="cf-pv" value="1000" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <div style="margin-bottom: 12px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Taxa (% a.m.)</label><input type="number" id="cf-taxa" value="2" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <div style="margin-bottom: 16px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Períodos (meses)</label><input type="number" id="cf-n" value="12" step="1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <button onclick="calcularValorFuturo()" style="width: 100%; padding: 10px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer;">Calcular</button>
                        <div id="cf-resultado" style="margin-top: 12px; font-size: 16px; font-weight: bold; color: #0f172a; text-align: center;"></div>
                    </div>
                </div>

                <div id="aba-vp" class="aba-conteudo" style="display: none;">
                    <div style="background: white; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <div style="margin-bottom: 12px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Valor Futuro (R$)</label><input type="number" id="cf-fv" value="1500" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <div style="margin-bottom: 12px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Taxa (% a.m.)</label><input type="number" id="cf-taxa2" value="2" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <div style="margin-bottom: 16px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Períodos (meses)</label><input type="number" id="cf-n2" value="12" step="1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <button onclick="calcularValorPresente()" style="width: 100%; padding: 10px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer;">Calcular</button>
                        <div id="cf-resultado2" style="margin-top: 12px; font-size: 16px; font-weight: bold; color: #0f172a; text-align: center;"></div>
                    </div>
                </div>

                <div id="aba-pmt" class="aba-conteudo" style="display: none;">
                    <div style="background: white; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <div style="margin-bottom: 12px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Valor Presente (R$)</label><input type="number" id="cp-pv" value="5000" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <div style="margin-bottom: 12px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Taxa (% a.m.)</label><input type="number" id="cp-taxa" value="2" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <div style="margin-bottom: 16px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Períodos (meses)</label><input type="number" id="cp-n" value="24" step="1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <button onclick="calcularParcela()" style="width: 100%; padding: 10px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer;">Calcular</button>
                        <div id="cp-resultado" style="margin-top: 12px; font-size: 16px; font-weight: bold; color: #0f172a; text-align: center;"></div>
                    </div>
                </div>

                <div id="aba-taxa" class="aba-conteudo" style="display: none;">
                    <div style="background: white; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <div style="margin-bottom: 12px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Valor Presente (R$)</label><input type="number" id="ct-pv" value="5000" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <div style="margin-bottom: 12px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Parcela (R$)</label><input type="number" id="ct-pmt" value="264" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <div style="margin-bottom: 16px;"><label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Períodos (meses)</label><input type="number" id="ct-n" value="24" step="1" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;"></div>
                        <button onclick="calcularTaxa()" style="width: 100%; padding: 10px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer;">Calcular</button>
                        <div id="ct-resultado" style="margin-top: 12px; font-size: 16px; font-weight: bold; color: #0f172a; text-align: center;"></div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // === TOGGLE: ABRIR/FECHAR CALCULADORA ===
    function toggleCalculadora() {
        if (!verificarMathJS()) {
            alert('Calculadora não disponível: mathjs não carregado.');
            return;
        }

        if (!containerCalculadora) {
            // Cria o container e insere no body
            containerCalculadora = document.createElement('div');
            containerCalculadora.innerHTML = criarHTMLCalculadora();
            document.body.appendChild(containerCalculadora);

            // Evento para fechar
            const btnFechar = document.getElementById('btn-fechar-calculadora');
            if (btnFechar) {
                btnFechar.addEventListener('click', function() {
                    fecharCalculadora();
                });
            }

            // Evento para abas
            const botoesAba = containerCalculadora.querySelectorAll('.aba-btn');
            botoesAba.forEach(btn => {
                btn.addEventListener('click', function() {
                    const abaId = this.dataset.aba;
                    // Remove ativo de todos
                    botoesAba.forEach(b => {
                        b.classList.remove('ativo');
                        b.style.color = '#64748b';
                        b.style.borderBottom = '3px solid transparent';
                    });
                    this.classList.add('ativo');
                    this.style.color = '#059669';
                    this.style.borderBottom = '3px solid #059669';

                    // Mostra/esconde conteúdos
                    const conteudos = containerCalculadora.querySelectorAll('.aba-conteudo');
                    conteudos.forEach(c => c.style.display = 'none');
                    const alvo = document.getElementById(`aba-${abaId}`);
                    if (alvo) alvo.style.display = 'block';
                });
            });

            // Fechar ao clicar fora (backdrop)
            const overlay = document.createElement('div');
            overlay.id = 'overlay-calculadora';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9998;display:none;';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', fecharCalculadora);
        }

        // Toggle
        const calcEl = document.getElementById('calculadora-financeira');
        const overlayEl = document.getElementById('overlay-calculadora');
        if (calculadoraAberta) {
            fecharCalculadora();
        } else {
            calcEl.style.display = 'flex';
            overlayEl.style.display = 'block';
            calculadoraAberta = true;
        }
    }

    function fecharCalculadora() {
        const calcEl = document.getElementById('calculadora-financeira');
        const overlayEl = document.getElementById('overlay-calculadora');
        if (calcEl) calcEl.style.display = 'none';
        if (overlayEl) overlayEl.style.display = 'none';
        calculadoraAberta = false;
    }

    // === EXPOR FUNÇÕES GLOBAIS (para uso no HTML) ===
    window.toggleCalculadora = toggleCalculadora;
    window.fecharCalculadora = fecharCalculadora;
    window.calcularValorFuturo = calcularValorFuturo;
    window.calcularValorPresente = calcularValorPresente;
    window.calcularParcela = calcularParcela;
    window.calcularTaxa = calcularTaxa;
    window.formatMoney = formatMoney;

    console.log('✅ Calculadora Financeira carregada.');
})();
