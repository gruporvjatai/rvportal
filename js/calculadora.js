// ============================
// CALCULADORA FINANCEIRA - RV PORTAL
// ============================

(function() {
    "use strict";

    // Verifica se mathjs está disponível
    const math = window.math || (() => { throw new Error("mathjs não carregado!"); })();

    // Estado da calculadora
    let state = {
        display: "0",
        expression: "",
        memory: 0,
        history: [],
        isNewEntry: true
    };

    // DOM elements (preenchidos na inicialização)
    let displayEl, expressionEl, historyEl;

    // ============================
    // FUNÇÕES DE CÁLCULO
    // ============================

    function evaluate(expr) {
        try {
            // Substitui símbolos matemáticos
            let sanitized = expr
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/x²/g, '^2')
                .replace(/√/g, 'sqrt');

            // Avalia usando mathjs
            const result = math.evaluate(sanitized);
            if (typeof result === 'number') {
                return math.format(result, 8);
            }
            return result.toString();
        } catch (e) {
            return "Erro";
        }
    }

    // Funções financeiras
    function calcJurosCompostos(principal, taxa, periodo) {
        try {
            return math.fv(taxa / 100, periodo, 0, -principal);
        } catch (e) {
            return "Erro";
        }
    }

    function calcParcela(valor, taxa, parcelas) {
        try {
            return math.pmt(taxa / 100, parcelas, -valor);
        } catch (e) {
            return "Erro";
        }
    }

    function calcTIR(fluxos) {
        // Espera array de números (primeiro é o investimento inicial negativo)
        try {
            return math.irr(fluxos);
        } catch (e) {
            return "Erro";
        }
    }

    function calcVPL(taxa, fluxos) {
        try {
            return math.npv(taxa / 100, fluxos);
        } catch (e) {
            return "Erro";
        }
    }

    // ============================
    // INTERFACE
    // ============================

    function render() {
        if (displayEl) displayEl.innerText = state.display;
        if (expressionEl) expressionEl.innerText = state.expression || '\u00A0';
        if (historyEl) {
            historyEl.innerHTML = state.history.slice(-5).map(h => 
                `<div class="history-item">${h}</div>`
            ).join('');
        }
    }

    function updateDisplay(value) {
        if (state.isNewEntry) {
            state.display = value;
            state.isNewEntry = false;
        } else {
            state.display = state.display === "0" ? value : state.display + value;
        }
        render();
    }

    function clearAll() {
        state.display = "0";
        state.expression = "";
        state.isNewEntry = true;
        render();
    }

    function backspace() {
        if (state.display.length > 1) {
            state.display = state.display.slice(0, -1);
        } else {
            state.display = "0";
            state.isNewEntry = true;
        }
        render();
    }

    function inputOperation(op) {
        state.expression = state.display;
        state.isNewEntry = true;
        // Salva a expressão atual para exibição
        render();
        // A operação será aplicada no próximo número
        window._pendingOp = op;
    }

    function calculateResult() {
        const expr = state.expression + state.display;
        const result = evaluate(expr);
        state.history.push(`${expr} = ${result}`);
        state.display = result;
        state.expression = "";
        state.isNewEntry = true;
        render();
    }

    function handleNumberClick(value) {
        updateDisplay(value);
    }

    function handleFinancialFunction(type) {
        // Abre um modal simples para parâmetros
        let promptMsg = "";
        let params = [];
        switch(type) {
            case 'juros':
                promptMsg = "Digite: Capital, Taxa (%), Período (meses)";
                params = [1000, 5, 12];
                break;
            case 'parcela':
                promptMsg = "Digite: Valor, Taxa (%), Parcelas";
                params = [10000, 2.5, 12];
                break;
            case 'tir':
                promptMsg = "Digite fluxos de caixa separados por vírgula (ex: -5000,2000,3000,4000)";
                params = [-5000, 2000, 3000, 4000];
                break;
            case 'vpl':
                promptMsg = "Digite: Taxa (%), e fluxos separados por vírgula";
                params = [10, -5000, 2000, 3000, 4000];
                break;
            default: return;
        }

        const input = prompt(promptMsg + "\n(use valores separados por vírgula)");
        if (input === null) return;
        const parts = input.split(',').map(s => parseFloat(s.trim()));
        if (parts.some(isNaN)) {
            alert("Valor inválido!");
            return;
        }

        let result;
        switch(type) {
            case 'juros':
                const [principal, taxa, periodo] = parts;
                result = calcJurosCompostos(principal, taxa, periodo);
                state.history.push(`Juros Compostos: ${principal} @ ${taxa}% por ${periodo}m = ${result}`);
                break;
            case 'parcela':
                const [valor, taxaParcela, parcelas] = parts;
                result = calcParcela(valor, taxaParcela, parcelas);
                state.history.push(`Parcela: ${valor} @ ${taxaParcela}% em ${parcelas}x = ${result}`);
                break;
            case 'tir':
                result = calcTIR(parts);
                state.history.push(`TIR: ${parts.join(',')} = ${result}`);
                break;
            case 'vpl':
                const [taxaVPL, ...fluxosVPL] = parts;
                result = calcVPL(taxaVPL, fluxosVPL);
                state.history.push(`VPL: ${taxaVPL}% ${fluxosVPL.join(',')} = ${result}`);
                break;
        }
        state.display = result;
        state.expression = "";
        state.isNewEntry = true;
        render();
    }

    // ============================
    // INICIALIZAÇÃO E DOM
    // ============================

    function initCalculator(container) {
        // Criar elementos se não existirem
        container.innerHTML = `
            <div class="calc-wrapper">
                <div class="calc-display">
                    <div class="calc-expression"></div>
                    <div class="calc-result"></div>
                </div>
                <div class="calc-history"></div>
                <div class="calc-buttons">
                    <div class="calc-row">
                        <button class="calc-btn calc-clear">AC</button>
                        <button class="calc-btn calc-back">⌫</button>
                        <button class="calc-btn calc-op">%</button>
                        <button class="calc-btn calc-op">÷</button>
                    </div>
                    <div class="calc-row">
                        <button class="calc-btn calc-num">7</button>
                        <button class="calc-btn calc-num">8</button>
                        <button class="calc-btn calc-num">9</button>
                        <button class="calc-btn calc-op">×</button>
                    </div>
                    <div class="calc-row">
                        <button class="calc-btn calc-num">4</button>
                        <button class="calc-btn calc-num">5</button>
                        <button class="calc-btn calc-num">6</button>
                        <button class="calc-btn calc-op">−</button>
                    </div>
                    <div class="calc-row">
                        <button class="calc-btn calc-num">1</button>
                        <button class="calc-btn calc-num">2</button>
                        <button class="calc-btn calc-num">3</button>
                        <button class="calc-btn calc-op">+</button>
                    </div>
                    <div class="calc-row">
                        <button class="calc-btn calc-num calc-zero">0</button>
                        <button class="calc-btn calc-num">.</button>
                        <button class="calc-btn calc-equals">=</button>
                    </div>
                    <div class="calc-row calc-financial">
                        <button class="calc-btn calc-fin-btn" data-fn="juros">Juros</button>
                        <button class="calc-btn calc-fin-btn" data-fn="parcela">Parcela</button>
                        <button class="calc-btn calc-fin-btn" data-fn="tir">TIR</button>
                        <button class="calc-btn calc-fin-btn" data-fn="vpl">VPL</button>
                    </div>
                </div>
            </div>
        `;

        // Referências
        displayEl = container.querySelector('.calc-result');
        expressionEl = container.querySelector('.calc-expression');
        historyEl = container.querySelector('.calc-history');

        // Eventos
        container.querySelectorAll('.calc-num').forEach(btn => {
            btn.addEventListener('click', () => handleNumberClick(btn.innerText));
        });

        container.querySelectorAll('.calc-op').forEach(btn => {
            btn.addEventListener('click', () => {
                const op = btn.innerText;
                inputOperation(op);
            });
        });

        container.querySelector('.calc-clear').addEventListener('click', clearAll);
        container.querySelector('.calc-back').addEventListener('click', backspace);
        container.querySelector('.calc-equals').addEventListener('click', calculateResult);

        container.querySelectorAll('.calc-fin-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const fn = btn.dataset.fn;
                handleFinancialFunction(fn);
            });
        });

        // Teclado
        container.addEventListener('keydown', (e) => {
            const key = e.key;
            if (key >= '0' && key <= '9') handleNumberClick(key);
            else if (key === '.') handleNumberClick('.');
            else if (key === '+') inputOperation('+');
            else if (key === '-') inputOperation('−');
            else if (key === '*') inputOperation('×');
            else if (key === '/') inputOperation('÷');
            else if (key === 'Enter') { e.preventDefault(); calculateResult(); }
            else if (key === 'Backspace') backspace();
            else if (key === 'Escape') clearAll();
        });

        render();
    }

    // Expor a função de inicialização globalmente
    window.initCalculadoraFinanceira = initCalculator;
})();
