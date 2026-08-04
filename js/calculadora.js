(function() {
    // Aguarda o mathjs carregar
    function initCalculator() {
        if (typeof math !== 'undefined') {
            criarCalculadora();
        } else if (typeof window.math !== 'undefined') {
            window.math = window.math || math;
            criarCalculadora();
        } else {
            // Tenta carregar dinamicamente
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.2.3/math.min.js';
            script.onload = function() {
                window.math = math;
                criarCalculadora();
            };
            script.onerror = function() {
                alert('Erro ao carregar a biblioteca de cálculos. Recarregue a página.');
            };
            document.head.appendChild(script);
        }
    }

    function criarCalculadora() {
        // Se já existe, não recria
        if (document.getElementById('financial-calculator-modal')) return;

        const math = window.math || math;

        // HTML do modal
        const modalHTML = `
            <div id="financial-calculator-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style="display:none;">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <div class="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
                        <h3 class="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <i data-lucide="calculator" class="w-5 h-5 text-emerald-600"></i> Calculadora Financeira
                        </h3>
                        <button onclick="fecharCalculadora()" class="text-slate-400 hover:text-red-500">
                            <i data-lucide="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    <div class="p-4 space-y-4">
                        <!-- Abas -->
                        <div class="flex gap-2 border-b">
                            <button onclick="switchCalcTab('simples')" class="tab-btn px-3 py-2 text-sm font-bold text-emerald-600 border-b-2 border-emerald-600" data-tab="simples">Básica</button>
                            <button onclick="switchCalcTab('juros')" class="tab-btn px-3 py-2 text-sm font-bold text-slate-500 border-b-2 border-transparent hover:text-slate-700" data-tab="juros">Juros Compostos</button>
                            <button onclick="switchCalcTab('parcela')" class="tab-btn px-3 py-2 text-sm font-bold text-slate-500 border-b-2 border-transparent hover:text-slate-700" data-tab="parcela">Parcelas</button>
                        </div>

                        <!-- Aba Básica -->
                        <div id="calc-tab-simples" class="calc-tab">
                            <div class="bg-slate-100 p-3 rounded-lg mb-3">
                                <div id="calc-display" class="text-right text-2xl font-mono font-bold text-slate-800 bg-white p-3 rounded border">0</div>
                            </div>
                            <div class="grid grid-cols-4 gap-2">
                                <button onclick="calcInput('7')" class="p-3 bg-white border rounded-lg hover:bg-slate-50 font-bold">7</button>
                                <button onclick="calcInput('8')" class="p-3 bg-white border rounded-lg hover:bg-slate-50 font-bold">8</button>
                                <button onclick="calcInput('9')" class="p-3 bg-white border rounded-lg hover:bg-slate-50 font-bold">9</button>
                                <button onclick="calcInput('/')" class="p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 font-bold text-amber-600">÷</button>
                                
                                <button onclick="calcInput('4')" class="p-3 bg-white border rounded-lg hover:bg-slate-50 font-bold">4</button>
                                <button onclick="calcInput('5')" class="p-3 bg-white border rounded-lg hover:bg-slate-50 font-bold">5</button>
                                <button onclick="calcInput('6')" class="p-3 bg-white border rounded-lg hover:bg-slate-50 font-bold">6</button>
                                <button onclick="calcInput('*')" class="p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 font-bold text-amber-600">×</button>
                                
                                <button onclick="calcInput('1')" class="p-3 bg-white border rounded-lg hover:bg-slate-50 font-bold">1</button>
                                <button onclick="calcInput('2')" class="p-3 bg-white border rounded-lg hover:bg-slate-50 font-bold">2</button>
                                <button onclick="calcInput('3')" class="p-3 bg-white border rounded-lg hover:bg-slate-50 font-bold">3</button>
                                <button onclick="calcInput('-')" class="p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 font-bold text-amber-600">−</button>
                                
                                <button onclick="calcInput('0')" class="p-3 bg-white border rounded-lg hover:bg-slate-50 font-bold">0</button>
                                <button onclick="calcInput('.')" class="p-3 bg-white border rounded-lg hover:bg-slate-50 font-bold">.</button>
                                <button onclick="calcClear()" class="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 font-bold text-red-600">C</button>
                                <button onclick="calcResult()" class="p-3 bg-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-700 font-bold text-white">=</button>
                            </div>
                        </div>

                        <!-- Aba Juros Compostos -->
                        <div id="calc-tab-juros" class="calc-tab hidden">
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase">Valor Presente (PV)</label>
                                    <input type="number" id="calc-pv" value="1000" class="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-200 outline-none">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase">Taxa de Juros (% ao período)</label>
                                    <input type="number" id="calc-rate" value="2" step="0.01" class="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-200 outline-none">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase">Número de Períodos</label>
                                    <input type="number" id="calc-nper" value="12" class="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-200 outline-none">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase">Aporte Mensal (PMT)</label>
                                    <input type="number" id="calc-pmt" value="0" class="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-200 outline-none">
                                </div>
                                <button onclick="calcJurosCompostos()" class="w-full p-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700">
                                    Calcular Valor Futuro
                                </button>
                                <div id="calc-result-juros" class="p-4 bg-slate-50 rounded-lg border text-center">
                                    <span class="text-sm text-slate-500">Resultado:</span>
                                    <span class="block text-2xl font-bold text-emerald-700">R$ 0,00</span>
                                </div>
                            </div>
                        </div>

                        <!-- Aba Parcelas -->
                        <div id="calc-tab-parcela" class="calc-tab hidden">
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase">Valor Total (PV)</label>
                                    <input type="number" id="calc-parc-pv" value="1000" class="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-200 outline-none">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase">Taxa de Juros (% ao mês)</label>
                                    <input type="number" id="calc-parc-rate" value="2" step="0.01" class="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-200 outline-none">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase">Número de Parcelas</label>
                                    <input type="number" id="calc-parc-nper" value="12" class="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-200 outline-none">
                                </div>
                                <button onclick="calcParcela()" class="w-full p-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700">
                                    Calcular Valor da Parcela
                                </button>
                                <div id="calc-result-parcela" class="p-4 bg-slate-50 rounded-lg border text-center">
                                    <span class="text-sm text-slate-500">Valor da Parcela:</span>
                                    <span class="block text-2xl font-bold text-emerald-700">R$ 0,00</span>
                                </div>
                            </div>
                        </div>

                        <!-- Botão para inserir no carrinho -->
                        <div class="border-t pt-4 mt-4 flex gap-2">
                            <button onclick="fecharCalculadora()" class="flex-1 p-2 bg-slate-200 rounded font-bold hover:bg-slate-300">Fechar</button>
                            <button onclick="inserirResultadoNoCarrinho()" class="flex-1 p-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 flex items-center justify-center gap-1">
                                <i data-lucide="shopping-cart" class="w-4 h-4"></i> Inserir no Carrinho
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insere o HTML no body
        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div.firstElementChild);

        // Cria o botão flutuante
        const btn = document.createElement('button');
        btn.id = 'calc-toggle-btn';
        btn.className = 'fixed bottom-24 right-6 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-lg z-30 no-print transition-all hover:scale-110';
        btn.innerHTML = '<i data-lucide="calculator" class="w-6 h-6"></i>';
        btn.onclick = abrirCalculadora;
        document.body.appendChild(btn);

        // Funções globais
        window.abrirCalculadora = function() {
            const modal = document.getElementById('financial-calculator-modal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.remove('hidden');
                lucide.createIcons();
            }
        };

        window.fecharCalculadora = function() {
            const modal = document.getElementById('financial-calculator-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.add('hidden');
            }
        };

        window.switchCalcTab = function(tab) {
            document.querySelectorAll('.calc-tab').forEach(el => el.classList.add('hidden'));
            document.getElementById('calc-tab-' + tab).classList.remove('hidden');
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('text-emerald-600', 'border-emerald-600');
                btn.classList.add('text-slate-500', 'border-transparent');
            });
            const activeBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
            if (activeBtn) {
                activeBtn.classList.remove('text-slate-500', 'border-transparent');
                activeBtn.classList.add('text-emerald-600', 'border-emerald-600');
            }
        };

        // Variáveis para a calculadora básica
        let calcDisplay = '';

        window.calcInput = function(val) {
            calcDisplay += val;
            document.getElementById('calc-display').innerText = calcDisplay || '0';
        };

        window.calcClear = function() {
            calcDisplay = '';
            document.getElementById('calc-display').innerText = '0';
        };

        window.calcResult = function() {
            try {
                const result = math.evaluate(calcDisplay);
                document.getElementById('calc-display').innerText = result;
                calcDisplay = String(result);
            } catch (e) {
                alert('Expressão inválida');
            }
        };

        window.calcJurosCompostos = function() {
            const pv = parseFloat(document.getElementById('calc-pv').value) || 0;
            const rate = parseFloat(document.getElementById('calc-rate').value) || 0;
            const nper = parseFloat(document.getElementById('calc-nper').value) || 0;
            const pmt = parseFloat(document.getElementById('calc-pmt').value) || 0;

            const r = rate / 100;
            // FV = PV*(1+r)^n + PMT * ((1+r)^n - 1) / r
            let fv;
            if (r === 0) {
                fv = pv + pmt * nper;
            } else {
                fv = pv * Math.pow(1 + r, nper) + pmt * ((Math.pow(1 + r, nper) - 1) / r);
            }
            document.getElementById('calc-result-juros').innerHTML = `
                <span class="text-sm text-slate-500">Valor Futuro:</span>
                <span class="block text-2xl font-bold text-emerald-700">${formatMoney(fv)}</span>
            `;
            window._calcResultado = fv;
        };

        window.calcParcela = function() {
            const pv = parseFloat(document.getElementById('calc-parc-pv').value) || 0;
            const rate = parseFloat(document.getElementById('calc-parc-rate').value) || 0;
            const nper = parseFloat(document.getElementById('calc-parc-nper').value) || 0;

            if (nper === 0) {
                alert('Número de parcelas deve ser maior que zero.');
                return;
            }

            const r = rate / 100;
            let pmt;
            if (r === 0) {
                pmt = pv / nper;
            } else {
                pmt = pv * (r * Math.pow(1 + r, nper)) / (Math.pow(1 + r, nper) - 1);
            }
            document.getElementById('calc-result-parcela').innerHTML = `
                <span class="text-sm text-slate-500">Valor da Parcela:</span>
                <span class="block text-2xl font-bold text-emerald-700">${formatMoney(pmt)}</span>
            `;
            window._calcResultado = pmt;
        };

        window.inserirResultadoNoCarrinho = function() {
            const valor = window._calcResultado;
            if (!valor || isNaN(valor) || valor <= 0) {
                alert('Calcule primeiro um valor financeiro!');
                return;
            }
            // Adiciona como item no carrinho
            if (typeof CART !== 'undefined' && typeof renderCart === 'function') {
                CART.push({
                    prodId: 'calc_' + Date.now(),
                    name: 'Resultado Calculadora',
                    price: valor,
                    fixedPrice: valor,
                    qty: 1,
                    total: valor,
                    parceiro: false,
                    porMetro: false,
                    uid: Date.now() + '_' + Math.random().toString(36).substr(2, 6)
                });
                renderCart();
                fecharCalculadora();
                showToast('Valor inserido no carrinho!');
            } else {
                alert('Não foi possível inserir no carrinho.');
            }
        };

        // Inicializa ícones
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Inicia
    initCalculator();
})();
