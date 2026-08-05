// mdf.js – Módulo completo para gestão de projetos e orçamentos MDF
// Versão corrigida – com busca de clientes via modal

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ==================== CONFIGURAÇÃO SUPABASE ====================
// As mesmas credenciais usadas no RV Portal (hardcoded no HTML)
const SUPABASE_URL = 'https://lyieiqhkspbowsrlngvn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_B2a4vA22qf4XGcrxPDRAaw_13rW51uI';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== CLASSE PRINCIPAL DO MÓDULO MDF (CORRIGIDA) ====================
class MDFManager {
  constructor(container) {
    this.container = container;
    this.profundidade = 60;
    this.linhas = [];
    this.preenchimentos = [];
    this.activeSubTab = 'projetos';
    this.projetosManager = null;
    this.orcamentosManager = null;
    this.init();
  }

  init() {
    this.renderizarInterface();
    this.mostrarSubAba('projetos');
    this.atualizarEstiloBotoes('projetos'); // adicionado aqui / manter ??
  }

  renderizarInterface() {
    this.container.innerHTML = `
      <div class="flex flex-col h-full">      
       <div class="flex items-center gap-2 ml-auto bg-white/80 backdrop-blur-sm p-1 rounded-2xl shadow-md border border-emerald-100">
        <button data-subaba="projetos" class="subaba-mdf-btn relative flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2">
            <i data-lucide="box" class="w-4 h-4"></i> 
            <span>Projetos</span>
          </button>
          <button data-subaba="orcamentos" class="subaba-mdf-btn relative flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2">
            <i data-lucide="file-text" class="w-4 h-4"></i> 
            <span>Orçamentos</span>
          </button>
          <button data-subaba="agenda" class="subaba-mdf-btn relative flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2">
            <i data-lucide="calendar" class="w-4 h-4"></i> 
            <span>Agenda</span>
          </button>
        </div>
        <div id="subaba-mdf-projetos" class="subaba-mdf-content flex-1"></div>
        <div id="subaba-mdf-orcamentos" class="subaba-mdf-content flex-1 hidden"></div>
        <div id="subaba-mdf-agenda" class="subaba-mdf-content flex-1 hidden"></div>
      </div>
    `;

    // Aplica o estilo ativo no botão correto
    //this.atualizarEstiloBotoes('projetos');

    // Sincroniza a profundidade com o input (se existir)
    const profundidadeInput = document.getElementById('profundidade-input-mdf');
    if (profundidadeInput) {
      profundidadeInput.value = this.profundidade;
      profundidadeInput.addEventListener('change', (e) => {
        this.profundidade = parseFloat(e.target.value) || 60;
        if (this.projetosManager && this.projetosManager.configurador3D) {
          this.projetosManager.configurador3D.reconstruirModelo();
        }
      });
    }

    this.container.querySelectorAll('.subaba-mdf-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const aba = e.currentTarget.dataset.subaba;
        if (aba) this.mostrarSubAba(aba);
      });
    });
  }

  // Método auxiliar para atualizar o estilo dos botões (ativo vs inativo)
 atualizarEstiloBotoes(abaAtiva) {
  const botoes = {
    projetos: this.container.querySelector('[data-subaba="projetos"]'),
    orcamentos: this.container.querySelector('[data-subaba="orcamentos"]'),
    agenda: this.container.querySelector('[data-subaba="agenda"]')
  };
  const estiloAtivo = 'bg-emerald-600 text-white shadow-md border-transparent';
  const estiloInativo = 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50';

  for (const [aba, btn] of Object.entries(botoes)) {
    if (!btn) continue;
    if (aba === abaAtiva) {
      btn.classList.remove(...btn.classList);
      btn.classList.add('subaba-mdf-btn', 'relative', 'flex-1', 'md:flex-none', 'px-6', 'py-2.5', 'rounded-xl', 'font-bold', 'text-sm', 'transition-all', 'duration-200', 'flex', 'items-center', 'justify-center', 'gap-2', ...estiloAtivo.split(' '));
    } else {
      btn.classList.remove(...btn.classList);
      btn.classList.add('subaba-mdf-btn', 'relative', 'flex-1', 'md:flex-none', 'px-6', 'py-2.5', 'rounded-xl', 'font-bold', 'text-sm', 'transition-all', 'duration-200', 'flex', 'items-center', 'justify-center', 'gap-2', ...estiloInativo.split(' '));
    }
  }
}

 mostrarSubAba(nome) {
  this.activeSubTab = nome;
  this.atualizarEstiloBotoes(nome);

  this.container.querySelectorAll('.subaba-mdf-content').forEach(el => el.classList.add('hidden'));
  const area = document.getElementById(`subaba-mdf-${nome}`);
  if (area) area.classList.remove('hidden');

  if (nome === 'projetos') {
    if (!this.projetosManager) {
      this.projetosManager = new ProjetosMDF(area, this);
    }
  } else if (nome === 'orcamentos') {
    if (!this.orcamentosManager) {
      this.orcamentosManager = new OrcamentosMDF(area, this);
    } else {
      this.orcamentosManager.renderizarOrcamentos();
    }
  } else if (nome === 'agenda') {
    if (!this.agendaManager) {
      // Importa o módulo agenda.js (já carregado via script no HTML)
      this.agendaManager = new AgendaManager(area, supabaseClient);
    }
  }
}
  // Métodos auxiliares compartilhados com o editor 2D
  obterDimensoesGerais() {
    if (this.linhas.length > 0) {
      const xs = this.linhas.flatMap(l => [l.x1, l.x2]);
      const ys = this.linhas.flatMap(l => [l.y1, l.y2]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        largura: (maxX - minX) || 80,
        altura: (maxY - minY) || 220,
        offsetX: minX,
        offsetY: minY
      };
    }
    return null;
  }

  obterResumoProjeto() {
    const dims = this.obterDimensoesGerais();
    if (!dims) return null;
    const { largura, altura } = dims;
    const profundidade = this.profundidade;
    let numPortas = 0, numGavetas = 0;
    this.preenchimentos.forEach(p => {
      if (p.tipo === 'porta') numPortas += (p.subdivisoes || 1);
      else if (p.tipo === 'gaveta') numGavetas += (p.subdivisoes || 1);
    });
    const cor = "Branco";
    return {
      descricao: `Armário ${largura.toFixed(0)}x${altura.toFixed(0)}x${profundidade}cm, ${numPortas} porta(s) + ${numGavetas} gaveta(s), ${cor}`,
      largura, altura, profundidade, numPortas, numGavetas, cor
    };
  }

  gerarListaPecas() {
    const pecas = [];
    const d = 1.8;
    const dims = this.obterDimensoesGerais();
    if (!dims) return pecas;
    const { largura, altura, offsetX, offsetY } = dims;
    const profundidade = this.profundidade;

    pecas.push({ nome: 'Lateral Esquerda', qtd: 1, dim: `${d} x ${altura} x ${profundidade}` });
    pecas.push({ nome: 'Lateral Direita', qtd: 1, dim: `${d} x ${altura} x ${profundidade}` });
    pecas.push({ nome: 'Fundo', qtd: 1, dim: `${largura - 2*d} x ${d} x ${profundidade}` });
    pecas.push({ nome: 'Teto', qtd: 1, dim: `${largura} x ${d} x ${profundidade}` });

    this.linhas.forEach(linha => {
      const y = linha.y1;
      if (Math.abs(linha.y1 - linha.y2) < 0.1 && y > offsetY + 5 && y < offsetY + altura - 5) {
        pecas.push({ nome: `Prateleira Fixa (y=${y.toFixed(0)})`, qtd: 1, dim: `${largura - 2*d} x ${d} x ${profundidade - 2*d}` });
      } else if (Math.abs(linha.x1 - linha.x2) < 0.1) {
        const x = linha.x1;
        if (x > offsetX + 5 && x < offsetX + largura - 5) {
          pecas.push({ nome: `Divisória Vertical (x=${x.toFixed(0)})`, qtd: 1, dim: `${d} x ${altura} x ${profundidade - 2*d}` });
        }
      }
    });

    this.preenchimentos.forEach(p => {
      const sub = p.subdivisoes || 1;
      const subW = p.w / sub;
      if (p.tipo === 'porta') {
        pecas.push({ nome: `Porta (${p.w.toFixed(0)}x${p.h.toFixed(0)})`, qtd: sub, dim: `${subW.toFixed(0)} x ${p.h.toFixed(0)} x 1.2` });
      } else if (p.tipo === 'gaveta') {
        pecas.push({ nome: `Frente Gaveta (${subW.toFixed(0)}x${p.h.toFixed(0)})`, qtd: sub, dim: `${subW.toFixed(0)} x ${p.h.toFixed(0)} x 1.2` });
        pecas.push({ nome: `Lateral Gaveta (${subW.toFixed(0)}x${profundidade - 2*d - 2})`, qtd: sub * 2, dim: `${d} x ${p.h.toFixed(0)} x ${profundidade - 2*d - 2}` });
        pecas.push({ nome: `Fundo Gaveta (${subW.toFixed(0)}x${profundidade - 2*d - 2})`, qtd: sub, dim: `${subW.toFixed(0)} x ${d} x ${profundidade - 2*d - 2}` });
      } else if (p.tipo === 'fundo') {
        pecas.push({ nome: `Painel de Fundo (${p.w.toFixed(0)}x${p.h.toFixed(0)})`, qtd: 1, dim: `${p.w.toFixed(0)} x ${p.h.toFixed(0)} x ${d}` });
      }
    });

    return pecas;
  }
}

// ==================== EDITOR DE FACHADA 2D ====================
class EditorFachada2DMDF {
  constructor(container, manager) {
    this.container = container;
    this.manager = manager;
    this.escala = 2;
    this.grade = 10;
    this.modo = 'linha';
    this.drawing = false;
    this.startX = 0; this.startY = 0;
    this.currentPreview = null;
    this.renderizar();
  }

  renderizar() {
    this.container.innerHTML = `
      <div class="flex flex-col gap-2 h-full">
        <div class="flex gap-2 bg-white p-2 rounded-lg shadow-sm border items-center">
          <button class="tool-btn-mdf px-3 py-1 rounded text-sm font-bold bg-[#b8a94e] text-white" data-tool="linha">✏️ Linha</button>
          <button class="tool-btn-mdf px-3 py-1 rounded text-sm font-bold bg-slate-200 text-slate-700" data-tool="retangulo">🚪 Porta / Gaveta / Fundo</button>
          <button class="tool-btn-mdf px-3 py-1 rounded text-sm font-bold bg-red-100 text-red-700" data-tool="desfazer">↩️ Desfazer</button>
          <button class="tool-btn-mdf px-3 py-1 rounded text-sm font-bold bg-red-300 text-red-900" data-tool="limpar">🗑️ Limpar Tudo</button>
          <span class="text-xs text-slate-500 ml-2">Grade: ${this.grade}cm | Arraste para desenhar</span>
        </div>
        <div class="flex-1 bg-white rounded-xl border shadow-sm relative overflow-hidden" id="canvas-fachada-mdf" style="min-height:500px;">
          <canvas id="fachada-canvas-mdf" class="absolute inset-0 w-full h-full"></canvas>
        </div>
      </div>
      <div id="modal-tipo-preenchimento-mdf" class="hidden fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
        <div class="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full">
          <h3 class="font-bold text-lg mb-4">Selecionar tipo</h3>
          <div class="grid grid-cols-1 gap-2" id="opcoes-modal-mdf"></div>
          <button onclick="document.getElementById('modal-tipo-preenchimento-mdf').classList.add('hidden')" class="mt-4 w-full py-2 bg-slate-200 rounded-lg font-bold">Cancelar</button>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('fachada-canvas-mdf');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.desenhar();
    this.bindEventos();
  }

  resizeCanvas() {
    const c = document.getElementById('canvas-fachada-mdf');
    if (!c) return;
    this.canvas.width = c.clientWidth;
    this.canvas.height = c.clientHeight;
    this.desenhar();
  }

  snap(v) { return Math.round(v / this.grade) * this.grade; }

  obterCoordenadas(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / this.escala, y: (e.clientY - rect.top) / this.escala };
  }

  desenhar() {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const passo = this.grade * this.escala;
    ctx.strokeStyle = '#e8ecf0'; ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += passo) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += passo) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3;
    this.manager.linhas.forEach(l => {
      ctx.beginPath();
      ctx.moveTo(l.x1 * this.escala, l.y1 * this.escala);
      ctx.lineTo(l.x2 * this.escala, l.y2 * this.escala);
      ctx.stroke();
    });

    this.manager.preenchimentos.forEach(p => {
      let color;
      if (p.tipo === 'porta') color = 'rgba(139,90,43,0.6)';
      else if (p.tipo === 'gaveta') color = 'rgba(160,120,60,0.6)';
      else color = 'rgba(200,200,200,0.5)';
      ctx.fillStyle = color;
      ctx.fillRect(p.x * this.escala, p.y * this.escala, p.w * this.escala, p.h * this.escala);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2;
      ctx.strokeRect(p.x * this.escala, p.y * this.escala, p.w * this.escala, p.h * this.escala);
      ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif';
      ctx.fillText(p.tipo + (p.subdivisoes ? ` (${p.subdivisoes}x)` : ''), p.x * this.escala + 4, p.y * this.escala + 14);
    });

    if (this.currentPreview) {
      const { x, y, w, h, tipo } = this.currentPreview;
      if (tipo === 'linha') {
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(w, h); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
      }
    }
  }

  bindEventos() {
    this.container.querySelectorAll('.tool-btn-mdf').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tool = e.target.dataset.tool;
        if (tool === 'desfazer') {
          if (this.manager.preenchimentos.length) this.manager.preenchimentos.pop();
          else if (this.manager.linhas.length) this.manager.linhas.pop();
          this.desenhar();
        } else if (tool === 'limpar') {
          this.manager.linhas = [];
          this.manager.preenchimentos = [];
          this.desenhar();
        } else {
          this.modo = tool;
          this.container.querySelectorAll('.tool-btn-mdf').forEach(b => { b.classList.remove('bg-[#b8a94e]', 'text-white'); b.classList.add('bg-slate-200', 'text-slate-700'); });
          e.target.classList.add('bg-[#b8a94e]', 'text-white');
        }
      });
    });

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  onMouseDown(e) {
    const { x, y } = this.obterCoordenadas(e);
    this.startX = this.snap(x);
    this.startY = this.snap(y);
    this.drawing = true;
    this.currentPreview = null;
    this.desenhar();
  }

  onMouseMove(e) {
    if (!this.drawing) return;
    const { x, y } = this.obterCoordenadas(e);
    const sx = this.snap(x), sy = this.snap(y);
    if (this.modo === 'linha') {
      const dx = Math.abs(sx - this.startX), dy = Math.abs(sy - this.startY);
      let x2 = sx, y2 = sy;
      if (dx > dy) y2 = this.startY; else x2 = this.startX;
      this.currentPreview = { tipo: 'linha', x: this.startX * this.escala, y: this.startY * this.escala, w: x2 * this.escala, h: y2 * this.escala };
    } else {
      const w = Math.abs(sx - this.startX) * this.escala;
      const h = Math.abs(sy - this.startY) * this.escala;
      const px = (sx >= this.startX ? this.startX : sx) * this.escala;
      const py = (sy >= this.startY ? this.startY : sy) * this.escala;
      this.currentPreview = { tipo: 'retangulo', x: px, y: py, w, h };
    }
    this.desenhar();
  }

  onMouseUp(e) {
    if (!this.drawing) return;
    this.drawing = false;
    const { x, y } = this.obterCoordenadas(e);
    const sx = this.snap(x), sy = this.snap(y);

    if (this.modo === 'linha') {
      const dx = Math.abs(sx - this.startX), dy = Math.abs(sy - this.startY);
      let x1 = this.startX, y1 = this.startY, x2 = sx, y2 = sy;
      if (dx > dy) y2 = y1; else x2 = x1;
      if (x1 !== x2 || y1 !== y2) {
        this.manager.linhas.push({ x1, y1, x2, y2 });
      }
    } else {
      const w = Math.abs(sx - this.startX);
      const h = Math.abs(sy - this.startY);
      if (w > 0 && h > 0) {
        const px = Math.min(this.startX, sx);
        const py = Math.min(this.startY, sy);
        this.abrirModalPreenchimento(px, py, w, h);
      }
    }
    this.currentPreview = null;
    this.desenhar();
  }

  abrirModalPreenchimento(px, py, w, h) {
    const modal = document.getElementById('modal-tipo-preenchimento-mdf');
    const opcoes = document.getElementById('opcoes-modal-mdf');
    const opcoesTipo = [
      { label: 'Porta (1 folha)', tipo: 'porta', sub: 1 },
      { label: 'Porta (2 folhas)', tipo: 'porta', sub: 2 },
      { label: 'Porta (3 folhas)', tipo: 'porta', sub: 3 },
      { label: 'Porta (4 folhas)', tipo: 'porta', sub: 4 },
      { label: '1 Gaveta', tipo: 'gaveta', sub: 1 },
      { label: '2 Gavetas', tipo: 'gaveta', sub: 2 },
      { label: '3 Gavetas', tipo: 'gaveta', sub: 3 },
      { label: '4 Gavetas', tipo: 'gaveta', sub: 4 },
      { label: 'Fundo / Painel Cego', tipo: 'fundo', sub: 1 },
    ];
    opcoes.innerHTML = opcoesTipo.map(o => `
      <button class="w-full py-3 border rounded-lg font-bold hover:bg-amber-50 transition text-left px-4"
              data-tipo="${o.tipo}" data-sub="${o.sub}">${o.label}</button>
    `).join('');
    opcoes.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const tipo = btn.dataset.tipo;
        const sub = parseInt(btn.dataset.sub);
        this.manager.preenchimentos.push({ x: px, y: py, w, h, tipo, subdivisoes: sub });
        modal.classList.add('hidden');
        this.desenhar();
      });
    });
    modal.classList.remove('hidden');
  }
}

// ==================== CONFIGURADOR 3D COMPLETO (igual ao original) ====================
class ConfiguradorArmarioMDF {
  constructor(container, manager) {
    this.container = container;
    this.manager = manager;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.armarioGrupo = null;
    this.init();
  }

  init() {
    this.container.innerHTML = '';
    this.criarCena();
    this.reconstruirModelo();
    this.animar();
  }

  criarCena() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f1f5f9');

    const w = this.container.clientWidth || 600;
    const h = this.container.clientHeight || 400;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 10, 2000);
    this.camera.position.set(250, 180, 350);
    this.camera.lookAt(0, 100, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(0, 200, 200);
    this.scene.add(dir);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 100, 0);
    this.controls.update();

    const gridHelper = new THREE.GridHelper(400, 20, 0xcccccc, 0xe0e0e0);
    this.scene.add(gridHelper);
  }

  reconstruirModelo() {
    if (this.armarioGrupo) {
      this.scene.remove(this.armarioGrupo);
      this.armarioGrupo = null;
    }

    const dims = this.manager.obterDimensoesGerais();
    if (!dims) return;

    const { largura, altura, offsetX, offsetY } = dims;
    const profundidade = this.manager.profundidade;
    const d = 1.8;
    const matCorpo = new THREE.MeshStandardMaterial({ color: '#A67B5B', roughness: 0.5 });
    const matPorta = new THREE.MeshStandardMaterial({ color: '#8B5A2B', roughness: 0.4 });
    const matGaveta = new THREE.MeshStandardMaterial({ color: '#b89a6b', roughness: 0.5 });
    const matFundo = new THREE.MeshStandardMaterial({ color: '#d0c8b0', roughness: 0.6 });

    this.armarioGrupo = new THREE.Group();

    const to3D = (canvasX, canvasY) => {
      const x3D = canvasX - offsetX - largura / 2;
      const y3D = altura - (canvasY - offsetY);
      return { x: x3D, y: y3D };
    };

    // Estrutura fixa
    const leftX = offsetX;
    const rightX = offsetX + largura;
    this.armarioGrupo.add(new THREE.Mesh(new THREE.BoxGeometry(d, altura, profundidade), matCorpo).translateX(to3D(leftX, 0).x).translateY(altura / 2));
    this.armarioGrupo.add(new THREE.Mesh(new THREE.BoxGeometry(d, altura, profundidade), matCorpo).translateX(to3D(rightX, 0).x).translateY(altura / 2));
    this.armarioGrupo.add(new THREE.Mesh(new THREE.BoxGeometry(largura - 2 * d, d, profundidade), matCorpo).translateY(d / 2));
    this.armarioGrupo.add(new THREE.Mesh(new THREE.BoxGeometry(largura, d, profundidade), matCorpo).translateY(altura - d / 2));

    // Prateleiras
    this.manager.linhas.forEach(linha => {
      if (Math.abs(linha.y1 - linha.y2) < 0.1) {
        const yCanvas = linha.y1;
        if (yCanvas > offsetY + 5 && yCanvas < offsetY + altura - 5) {
          const y3D = to3D(0, yCanvas).y;
          this.armarioGrupo.add(new THREE.Mesh(new THREE.BoxGeometry(largura - 2 * d, d, profundidade - 2 * d), matCorpo).translateY(y3D));
        }
      }
    });

    // Divisórias
    this.manager.linhas.forEach(linha => {
      if (Math.abs(linha.x1 - linha.x2) < 0.1) {
        const xCanvas = linha.x1;
        if (xCanvas > offsetX + 5 && xCanvas < offsetX + largura - 5) {
          const x3D = to3D(xCanvas, 0).x;
          this.armarioGrupo.add(new THREE.Mesh(new THREE.BoxGeometry(d, altura, profundidade - 2 * d), matCorpo).translateX(x3D).translateY(altura / 2));
        }
      }
    });

    // Portas, gavetas e fundos
    const espessuraFrente = d * 0.8;
    this.manager.preenchimentos.forEach(p => {
      const baseX3D = to3D(p.x, 0).x;
      const centroY3D = to3D(0, p.y + p.h / 2).y;
      const faceFrontalZ = profundidade / 2;

      if (p.tipo === 'porta') {
        const sub = p.subdivisoes || 1;
        const subW = p.w / sub;
        for (let i = 0; i < sub; i++) {
          const cx = baseX3D + subW / 2 + i * subW;
          const porta = new THREE.Mesh(new THREE.BoxGeometry(subW, p.h, espessuraFrente), matPorta);
          porta.position.set(cx, centroY3D, faceFrontalZ - espessuraFrente / 2);
          this.armarioGrupo.add(porta);
          porta.add(new THREE.LineSegments(new THREE.EdgesGeometry(porta.geometry), new THREE.LineBasicMaterial({ color: '#1e293b' })));
          const puxador = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.2 }));
          puxador.position.set(subW / 2 - 4, p.h / 2 - 10, espessuraFrente / 2 + 0.5);
          porta.add(puxador);
        }
      } else if (p.tipo === 'gaveta') {
        const sub = p.subdivisoes || 1;
        const subH = p.h / sub;
        const centroX = baseX3D + p.w / 2;
        for (let i = 0; i < sub; i++) {
          const cy = centroY3D + (p.h / 2) - subH / 2 - i * subH;
          const frenteGeom = new THREE.BoxGeometry(p.w, subH, espessuraFrente);
          const frente = new THREE.Mesh(frenteGeom, matGaveta);
          frente.position.set(centroX, cy, faceFrontalZ - espessuraFrente / 2);
          this.armarioGrupo.add(frente);
          frente.add(new THREE.LineSegments(new THREE.EdgesGeometry(frenteGeom), new THREE.LineBasicMaterial({ color: '#1e293b' })));
          const friso = new THREE.Mesh(new THREE.BoxGeometry(p.w - 0.4, 0.4, espessuraFrente + 0.3), new THREE.MeshBasicMaterial({ color: '#1e293b' }));
          friso.position.set(0, -subH / 2 + 2.5, 0);
          frente.add(friso);
          // Corpo da gaveta
          const profundidadeCorpo = profundidade - 2 * d - 2;
          const alturaCorpo = subH - d * 2;
          const larguraCorpo = p.w - d * 2;
          const zFrenteTraseira = faceFrontalZ - espessuraFrente;
          const zCentroCorpo = zFrenteTraseira - profundidadeCorpo / 2;
          const geoLat = new THREE.BoxGeometry(d, alturaCorpo, profundidadeCorpo);
          this.armarioGrupo.add(new THREE.Mesh(geoLat, matGaveta).translateX(centroX - p.w / 2 + d / 2).translateY(cy).translateZ(zCentroCorpo));
          this.armarioGrupo.add(new THREE.Mesh(geoLat, matGaveta).translateX(centroX + p.w / 2 - d / 2).translateY(cy).translateZ(zCentroCorpo));
          this.armarioGrupo.add(new THREE.Mesh(new THREE.BoxGeometry(larguraCorpo, d, profundidadeCorpo), matGaveta).translateX(centroX).translateY(cy - alturaCorpo / 2 + d / 2).translateZ(zCentroCorpo));
        }
      } else if (p.tipo === 'fundo') {
        const centroX = baseX3D + p.w / 2;
        this.armarioGrupo.add(new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, d), matFundo).translateX(centroX).translateY(centroY3D).translateZ(-profundidade / 2 + d / 2));
      }
    });

    this.scene.add(this.armarioGrupo);
  }

  animar() {
    requestAnimationFrame(() => this.animar());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }
}

// ==================== SUB-ABA PROJETOS ====================
class ProjetosMDF {
  constructor(container, parentManager) {
    this.container = container;
    this.parentManager = parentManager;
    this.editor2D = null;
    this.configurador3D = null;
    this.init();
  }

  init() {
    this.renderizar();
    this.mostrarSubSubAba('fachada');
  }

  renderizar() {
   this.container.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="flex flex-wrap justify-between items-center gap-2 mb-4 bg-white p-2 rounded-xl shadow-sm border">
        <div class="flex gap-2">
          <button data-subsubaba="fachada" class="subsubaba-mdf-btn px-4 py-2 rounded-lg font-bold text-sm bg-[#b8a94e] text-white shadow">📐 Fachada 2D</button>
          <button data-subsubaba="3d" class="subsubaba-mdf-btn px-4 py-2 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100">🧊 3D</button>
          <button data-subsubaba="detalhamento" class="subsubaba-mdf-btn px-4 py-2 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100">📋 Detalhamento</button>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-600">Profundidade (cm):</label>
          <input type="number" id="profundidade-input-mdf" value="60" min="30" max="80" class="w-16 p-1 border rounded text-xs">
          <button onclick="window.open('https://flatma.com/pt/create/designer', '_blank')" title="Abrir Flatma" class="px-3 py-1 border border-[#b8a94e] text-[#b8a94e] rounded text-xs font-bold hover:bg-amber-50 transition">📐 Flatma</button>
        </div>
      </div>
      <div id="subsubaba-fachada" class="subsubaba-mdf-content flex-1"></div>
      <div id="subsubaba-3d" class="subsubaba-mdf-content flex-1 hidden"></div>
      <div id="subsubaba-detalhamento" class="subsubaba-mdf-content flex-1 hidden"></div>
    </div>
  `;

    // Sincronizar profundidade com o manager principal
      const profundidadeInput = document.getElementById('profundidade-input-mdf');
      if (profundidadeInput) {
        profundidadeInput.value = this.parentManager.profundidade;
        profundidadeInput.addEventListener('change', (e) => {
          const novaProfundidade = parseFloat(e.target.value) || 60;
          this.parentManager.profundidade = novaProfundidade;
          if (this.configurador3D) {
            this.configurador3D.reconstruirModelo();
          }
          const areaDetalhamento = document.getElementById('subsubaba-detalhamento');
          if (areaDetalhamento && !areaDetalhamento.classList.contains('hidden')) {
            this.atualizarDetalhamento(areaDetalhamento);
          }
        });
      }

    
    this.container.querySelectorAll('.subsubaba-mdf-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.mostrarSubSubAba(e.target.dataset.subsubaba));
    });
  }

  mostrarSubSubAba(nome) {
    this.container.querySelectorAll('.subsubaba-mdf-btn').forEach(btn => {
      btn.classList.remove('bg-[#b8a94e]', 'text-white', 'shadow');
      btn.classList.add('text-slate-600', 'hover:bg-slate-100');
    });
    const btnAtivo = this.container.querySelector(`[data-subsubaba="${nome}"]`);
    if (btnAtivo) {
      btnAtivo.classList.add('bg-[#b8a94e]', 'text-white', 'shadow');
      btnAtivo.classList.remove('text-slate-600', 'hover:bg-slate-100');
    }

    this.container.querySelectorAll('.subsubaba-mdf-content').forEach(el => el.classList.add('hidden'));
    const area = document.getElementById(`subsubaba-${nome}`);
    if (area) area.classList.remove('hidden');

    if (nome === 'fachada' && !this.editor2D) {
      this.editor2D = new EditorFachada2DMDF(area, this.parentManager);
    } else if (nome === '3d') {
      if (!this.configurador3D) {
        this.configurador3D = new ConfiguradorArmarioMDF(area, this.parentManager);
      } else {
        this.configurador3D.reconstruirModelo();
      }
    } else if (nome === 'detalhamento') {
      this.atualizarDetalhamento(area);
    }
  }

  atualizarDetalhamento(area) {
    const pecas = this.parentManager.gerarListaPecas();
    area.innerHTML = `
      <div class="bg-white rounded-xl shadow border p-4 flex flex-col h-full">
        <h3 class="font-bold text-lg mb-3">Detalhamento do Projeto</h3>
        <div class="flex-1 overflow-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-100"><tr><th class="p-2 text-left">Peça</th><th class="p-2 text-center">Qtd</th><th class="p-2 text-right">Dimensões (cm)</th></tr></thead>
            <tbody>${pecas.map(p => `<tr class="border-b"><td class="p-2">${p.nome}</td><td class="p-2 text-center">${p.qtd}</td><td class="p-2 text-right">${p.dim}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="mt-4 flex gap-2 justify-end">
          <button id="btn-imprimir-detalhamento-mdf" class="btn-outline px-4 py-2 rounded-lg font-bold">🖨️ Imprimir Detalhamento</button>
          <button id="btn-enviar-resumo-mdf" class="btn-primary px-6 py-2 rounded-lg font-bold shadow">📤 Enviar para Orçamento (Resumo)</button>
        </div>
      </div>`;

    document.getElementById('btn-imprimir-detalhamento-mdf').addEventListener('click', () => {
      this.imprimirDetalhamento(pecas);
    });
    document.getElementById('btn-enviar-resumo-mdf').addEventListener('click', () => {
      this.enviarResumoParaOrcamento();
    });
  }

  imprimirDetalhamento(pecas) {
    const html = `
      <div style="font-family: Helvetica; padding: 20px; max-width: 800px; margin: auto; background: white;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2>RV PORTAL MADEIRAS</h2>
          <h3>Detalhamento do Projeto</h3>
        </div>
        <table style="width:100%; border-collapse: collapse; font-size: 12px;">
          <thead><tr style="background:#eee;"><th style="padding:6px; text-align:left;">Peça</th><th style="padding:6px; text-align:center;">Qtd</th><th style="padding:6px; text-align:right;">Dimensões</th></tr></thead>
          <tbody>${pecas.map(p => `<tr><td style="padding:6px;">${p.nome}</td><td style="text-align:center;">${p.qtd}</td><td style="text-align:right;">${p.dim}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    `;
    const w = window.open('', '', 'width=800,height=600');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }

  async enviarResumoParaOrcamento() {
    const resumo = this.parentManager.obterResumoProjeto();
    if (!resumo) {
      window.showToast("Desenhe o projeto primeiro.", true);
      return;
    }

    let fotoUrl = '';
    if (this.configurador3D && this.configurador3D.renderer) {
      try {
        const canvas = this.configurador3D.renderer.domElement;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const formData = new FormData();
          formData.append('image', blob);
          const resp = await fetch(`https://api.imgbb.com/1/upload?key=c201a949389ed2c50aabd3731b4d1932`, { // Substitua pela sua chave real
            method: 'POST',
            body: formData
          });
          const data = await resp.json();
          if (data.success) {
            fotoUrl = data.data.url;
          }
        }
      } catch (e) {
        console.warn("Erro ao capturar imagem 3D:", e);
      }
    }

    this.modalSelecaoOrcamento(resumo, fotoUrl);
  }

  modalSelecaoOrcamento(resumo, fotoUrl) {
    const overlay = document.createElement('div');
    overlay.id = 'modal-selecao-orcamento-mdf';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;';
    overlay.innerHTML = `
      <div style="background:white; border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,0.2); max-width:400px; width:90%; padding:20px; position:relative;">
        <button style="position:absolute; top:10px; right:15px; background:none; border:none; font-size:1.5rem; cursor:pointer; color:#64748b;" 
                onclick="this.closest('#modal-selecao-orcamento-mdf').remove()">&times;</button>
        <h3 style="font-size:1.2rem; font-weight:700; margin-bottom:15px;">Enviar para Orçamento</h3>
        <p style="margin-bottom:20px;">Deseja criar um <strong>novo orçamento</strong> ou adicionar a um <strong>existente</strong>?</p>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button id="btn-novo-orcamento-mdf" style="padding:10px 20px; background:#b8a94e; color:#1e293b; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">Novo Orçamento</button>
          <button id="btn-orcamento-existente-mdf" style="padding:10px 20px; background:transparent; border:1.5px solid #b8a94e; color:#b8a94e; border-radius:8px; font-weight:bold; cursor:pointer;">Adicionar a Existente</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-novo-orcamento-mdf').addEventListener('click', () => {
      overlay.remove();
      this.criarNovoOrcamento(resumo, fotoUrl);
    });
    document.getElementById('btn-orcamento-existente-mdf').addEventListener('click', () => {
      overlay.remove();
      this.selecionarOrcamentoExistente(resumo, fotoUrl);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  criarNovoOrcamento(resumo, fotoUrl) {
    let orcManager = this.parentManager.orcamentosManager;
    if (!orcManager) {
      const areaOrc = document.getElementById('subaba-mdf-orcamentos');
      if (areaOrc) {
        orcManager = new OrcamentosMDF(areaOrc, this.parentManager);
        this.parentManager.orcamentosManager = orcManager;
      } else {
        window.showToast("Módulo de orçamentos não disponível.", true);
        return;
      }
    }
    orcManager.abrirNovoOrcamento();
    setTimeout(() => {
      orcManager.adicionarItem({
        nome: resumo.descricao,
        descricao: `Projeto gerado automaticamente.`,
        preco: 0,
        desconto: 0,
        foto_url: fotoUrl
      });
    }, 600);
    this.parentManager.mostrarSubAba('orcamentos');
  }

  async selecionarOrcamentoExistente(resumo, fotoUrl) {
    try {
      const { data: orcamentos, error } = await supabaseClient
        .from('mdf_orcamentos')
        .select('id, cliente_nome, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!orcamentos || orcamentos.length === 0) {
        window.showToast("Nenhum orçamento encontrado. Crie um novo primeiro.", true);
        return;
      }
      this.modalListaOrcamentos(resumo, fotoUrl, orcamentos);
    } catch (err) {
      console.error(err);
      window.showToast("Erro ao carregar orçamentos.", true);
    }
  }

  modalListaOrcamentos(resumo, fotoUrl, orcamentos) {
    const overlay = document.createElement('div');
    overlay.id = 'modal-lista-orcamentos-mdf';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;';
    overlay.innerHTML = `
      <div style="background:white; border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,0.2); max-width:500px; width:90%; padding:20px; position:relative;">
        <button style="position:absolute; top:10px; right:15px; background:none; border:none; font-size:1.5rem; cursor:pointer; color:#64748b;" 
                onclick="this.closest('#modal-lista-orcamentos-mdf').remove()">&times;</button>
        <h3 style="font-size:1.2rem; font-weight:700; margin-bottom:15px;">Selecione o Orçamento</h3>
        <p style="font-size:0.9rem; margin-bottom:15px;">Escolha um orçamento existente para adicionar o item:</p>
        <div style="max-height:300px; overflow-y:auto;">
          ${orcamentos.map(o => `
            <div class="orcamento-item-mdf" data-id="${o.id}" style="padding:12px; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:6px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; background:white; transition:background 0.2s;">
              <div>
                <span style="font-weight:600;">#${o.id} - ${o.cliente_nome || 'Sem nome'}</span><br>
                <span style="font-size:0.8rem; color:#64748b;">${new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <i data-lucide="plus-circle" style="color:#b8a94e;"></i>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:15px; text-align:right;">
          <button style="padding:8px 16px; border:1.5px solid #b8a94e; color:#b8a94e; background:transparent; border-radius:8px; font-weight:bold; cursor:pointer;" 
                  onclick="this.closest('#modal-lista-orcamentos-mdf').remove()">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    overlay.querySelectorAll('.orcamento-item-mdf').forEach(el => {
      el.addEventListener('click', async () => {
        const id = el.dataset.id;
        overlay.remove();
        await this.adicionarItemAOrcamento(id, resumo, fotoUrl);
      });
    });
  }

  async adicionarItemAOrcamento(orcamentoId, resumo, fotoUrl) {
    let orcManager = this.parentManager.orcamentosManager;
    if (!orcManager) {
      const areaOrc = document.getElementById('subaba-mdf-orcamentos');
      if (areaOrc) {
        orcManager = new OrcamentosMDF(areaOrc, this.parentManager);
        this.parentManager.orcamentosManager = orcManager;
      } else {
        window.showToast("Módulo de orçamentos não disponível.", true);
        return;
      }
    }
    await orcManager.editarOrcamento(orcamentoId);
    setTimeout(() => {
      orcManager.adicionarItem({
        nome: resumo.descricao,
        descricao: `Projeto gerado automaticamente.`,
        preco: 0,
        desconto: 0,
        foto_url: fotoUrl
      });
    }, 800);
    this.parentManager.mostrarSubAba('orcamentos');
  }
}

// ==================== SUB-ABA ORÇAMENTOS (COMPLETA) ====================
class OrcamentosMDF {
  constructor(container, parentManager) {
    this.container = container;
    this.parentManager = parentManager;
    this.itens = [];
    this.orcamentoAtualId = null;
    this.renderizarInterface();
  }

  renderizarInterface() {
    this.container.innerHTML = `
      <div class="flex flex-col h-full">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <i data-lucide="folder-open" class="text-emerald-600"></i> Orçamentos MDF
          </h2>
          <div class="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div class="relative w-full md:w-64">
              <i data-lucide="search" class="absolute left-2 top-2.5 text-slate-400 w-4 h-4"></i>
              <input type="text" id="search-quotes-mdf" placeholder="Buscar cliente..." class="w-full pl-8 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm" onkeyup="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.renderizarOrcamentos()">
            </div>
            <select id="status-filter-mdf" class="w-full md:w-auto p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm font-medium text-slate-600" onchange="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.renderizarOrcamentos()">
              <option value="">Todos os Status</option>
              <option value="ABERTO">Abertos</option>
              <option value="EM NEGOCIAÇÃO">Em Negociação</option>
              <option value="APROVADO">Aprovados (Faturados)</option>
              <option value="PERDIDO">Perdidos</option>
            </select>
            <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.abrirNovoOrcamento()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2 whitespace-nowrap">
              <i data-lucide="plus"></i> Novo Orçamento
            </button>
          </div>
        </div>

        <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-50 text-slate-700">
                <tr>
                  <th class="p-4 w-32">Orçamento</th>
                  <th class="p-4">Cliente / Info</th>
                  <th class="p-4">Valor</th>
                  <th class="p-4 text-center">Status</th>
                  <th class="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody id="lista-orcamentos-mdf" class="divide-y">
                <tr><td colspan="5" class="p-8 text-center text-slate-400">Carregando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal de Orçamento MDF -->
      <div id="modal-orcamento-mdf" class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-[70] hidden">
        <div class="modal-container bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div class="p-5 border-b flex justify-between items-center bg-amber-50 rounded-t-2xl">
            <h3 class="font-bold text-slate-800 text-lg flex items-center gap-2">
              <i data-lucide="file-text" class="text-emerald-600"></i>
              <span id="modal-titulo-mdf">Novo Orçamento</span>
            </h3>
            <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.fecharModal()" class="text-slate-400 hover:text-red-500"><i data-lucide="x"></i></button>
          </div>
          <div class="p-6 space-y-4">
            <input type="hidden" id="orcamento-id-mdf">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1">Cliente *</label>
                <div class="flex gap-2">
                  <input type="text" id="cliente-nome-mdf" readonly placeholder="Nenhum cliente selecionado" 
                         class="flex-1 p-2 border rounded-lg bg-slate-50 text-sm cursor-pointer" 
                         onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.abrirModalClientes()">
                  <button type="button" onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.abrirModalClientes()" 
                          class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1 hover:bg-emerald-700">
                    <i data-lucide="search" class="w-4 h-4"></i> Buscar
                  </button>
                </div>
                <input type="hidden" id="cliente-id-mdf" value="">
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1">Status</label>
                <select id="status-mdf" class="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="ABERTO">Aberto</option>
                  <option value="EM NEGOCIAÇÃO">Em Negociação</option>
                  <option value="APROVADO">Aprovado</option>
                  <option value="PERDIDO">Perdido</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1">Observações</label>
              <textarea id="observacoes-mdf" rows="2" placeholder="Detalhes do projeto..." class="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"></textarea>
            </div>
            <div class="border-t pt-4">
              <div class="flex justify-between items-center mb-3">
                <h4 class="font-bold text-slate-700">Itens do Projeto</h4>
                <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.adicionarItem()" class="border border-emerald-600 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-emerald-50">
                  <i data-lucide="plus" class="w-4 h-4"></i> Adicionar Item
                </button>
              </div>
              <div id="container-itens-mdf" class="space-y-3"></div>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border">
              <div class="flex justify-between text-sm mb-1"><span>Subtotal</span> <span id="subtotal-mdf">R$ 0,00</span></div>
              <div class="flex justify-between text-sm mb-1">
                <span>Desconto</span>
                <div class="flex items-center gap-1">
                  <select id="tipo-desconto-mdf" class="text-xs border rounded p-0.5 bg-white" onchange="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.atualizarTotais()">
                    <option value="$">R$</option>
                    <option value="%">%</option>
                  </select>
                  <input type="number" id="valor-desconto-mdf" value="0" step="0.01" class="w-20 p-1 border rounded text-sm text-right" onchange="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.atualizarTotais()">
                </div>
              </div>
              <div class="flex justify-between font-bold text-lg border-t pt-2 mt-1">
                <span>Total</span> <span id="total-geral-mdf" class="text-emerald-700">R$ 0,00</span>
              </div>
            </div>
          </div>
          <div class="p-5 border-t bg-slate-50 rounded-b-2xl flex justify-end gap-3">
            <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.fecharModal()" class="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100 transition">Cancelar</button>
            <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.salvarOrcamento()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold shadow flex items-center gap-2">
              <i data-lucide="save"></i> Salvar Orçamento
            </button>
            <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.gerarPDF()" class="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition flex items-center gap-2">
              <i data-lucide="download"></i> Baixar PDF
            </button>
            <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.imprimirOrcamento()" class="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition flex items-center gap-2">
              <i data-lucide="printer"></i> Imprimir
            </button>
          </div>
        </div>
      </div>
    `;
    // Não usamos mais carregarClientesSelect, pois usamos modal de busca
    this.renderizarOrcamentos();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async renderizarOrcamentos() {
    const lista = document.getElementById('lista-orcamentos-mdf');
    if (!lista) return;
    lista.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">Carregando...</td></tr>';

    const search = document.getElementById('search-quotes-mdf')?.value.toLowerCase() || '';
    const statusFiltro = document.getElementById('status-filter-mdf')?.value || '';

    let query = supabaseClient.from('mdf_orcamentos').select('*').order('created_at', { ascending: false });
    if (statusFiltro) query = query.eq('status', statusFiltro);

    const { data: orcamentos, error } = await query;
    if (error) {
      lista.innerHTML = `<td><td colspan="5" class="p-8 text-center text-red-400">Erro ao carregar: ${error.message}</td></tr>`;
      return;
    }

    const filtrados = orcamentos.filter(o => !search || (o.cliente_nome && o.cliente_nome.toLowerCase().includes(search)));

    if (!filtrados.length) {
      lista.innerHTML = '<td><td colspan="5" class="p-8 text-center text-slate-400">Nenhum orçamento encontrado.</td></tr>';
      return;
    }

    const dados = await Promise.all(filtrados.map(async (orc) => {
      const { data: itensData } = await supabaseClient.from('mdf_itens').select('preco, desconto').eq('orcamento_id', orc.id);
      let total = itensData ? itensData.reduce((s, i) => s + parseFloat(i.preco) - parseFloat(i.desconto || 0), 0) : 0;
      // Aplica desconto geral do orçamento
      if (orc.desconto && orc.desconto > 0) {
        const descontoAplicado = orc.tipo_desconto === '%' ? total * (orc.desconto / 100) : orc.desconto;
        total = Math.max(0, total - descontoAplicado);
      }
      return { ...orc, total, itensCount: itensData?.length || 0 };
    }));

    lista.innerHTML = dados.map(orc => {
      const statusClass = {
        'ABERTO': 'bg-amber-100 text-amber-800',
        'EM NEGOCIAÇÃO': 'bg-blue-100 text-blue-800',
        'APROVADO': 'bg-green-100 text-green-800',
        'PERDIDO': 'bg-red-100 text-red-800'
      }[orc.status] || 'bg-gray-100 text-gray-800';

      const isAprovado = orc.status === 'APROVADO';
      
      return `
        <tr class="hover:bg-slate-50 transition border-b">
          <td class="p-4">
            <div class="font-black text-slate-700">#${orc.id}</div>
            <div class="text-[10px] text-slate-400">${new Date(orc.created_at).toLocaleDateString('pt-BR')}</div>
          </td>
          <td class="p-4">
            <div class="font-bold text-slate-800">${orc.cliente_nome || 'Consumidor Final'}</div>
            <div class="text-xs text-slate-500">${orc.itensCount} itens</div>
          </td>
          <td class="p-4 font-bold text-slate-800">R$ ${orc.total.toFixed(2)}</td>
          <td class="p-4 text-center"><span class="px-2 py-1 rounded-full text-xs font-bold ${statusClass}">${orc.status}</span></td>
          <td class="p-4">
            <div class="flex items-center justify-center gap-2 flex-wrap">
              ${isAprovado ? `
                <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.estornarOrcamento(${orc.id})" class="p-2 border border-red-200 bg-white text-red-500 hover:bg-red-50 rounded-lg shadow-sm" title="Estornar Venda">
                  <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                </button>
                <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.agendarInstalacao(${orc.id})" class="p-2 border border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50 rounded-lg shadow-sm" title="Agendar Instalação">
                  <i data-lucide="calendar" class="w-4 h-4"></i>
                </button>
                <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.baixarPDF(${orc.id})" class="p-2 border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm" title="Baixar PDF">
                  <i data-lucide="download" class="w-4 h-4"></i>
                </button>
                <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.imprimirOrcamento(${orc.id})" class="p-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-lg shadow-sm" title="Imprimir">
                  <i data-lucide="printer" class="w-4 h-4"></i>
                </button>
              ` : `
                <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.faturarOrcamento(${orc.id})" class="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm" title="Faturar">
                  <i data-lucide="credit-card" class="w-4 h-4"></i>
                </button>
                <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.editarOrcamento(${orc.id})" class="p-2 border border-emerald-600 bg-white text-emerald-600 hover:bg-emerald-50 rounded-lg shadow-sm" title="Editar">
                  <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.duplicarOrcamento(${orc.id})" class="p-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-lg shadow-sm" title="Duplicar">
                  <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
                <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.baixarPDF(${orc.id})" class="p-2 border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm" title="Baixar PDF">
                  <i data-lucide="download" class="w-4 h-4"></i>
                </button>
                <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.imprimirOrcamento(${orc.id})" class="p-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-lg shadow-sm" title="Imprimir">
                  <i data-lucide="printer" class="w-4 h-4"></i>
                </button>
                <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.excluirOrcamento(${orc.id})" class="p-2 border border-red-200 bg-white text-red-500 hover:bg-red-50 rounded-lg shadow-sm" title="Excluir">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  abrirNovoOrcamento() {
    this.orcamentoAtualId = null;
    document.getElementById('modal-titulo-mdf').innerText = 'Novo Orçamento';
    document.getElementById('orcamento-id-mdf').value = '';
    document.getElementById('cliente-nome-mdf').value = '';
    document.getElementById('cliente-id-mdf').value = '';
    document.getElementById('status-mdf').value = 'ABERTO';
    document.getElementById('observacoes-mdf').value = '';
    document.getElementById('tipo-desconto-mdf').value = '$';
    document.getElementById('valor-desconto-mdf').value = '0';
    this.itens = [];
    this.renderizarItens();
    this.atualizarTotais();
    document.getElementById('modal-orcamento-mdf').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  fecharModal() {
    document.getElementById('modal-orcamento-mdf').classList.add('hidden');
  }

  async editarOrcamento(id) {
    this.orcamentoAtualId = id;
    document.getElementById('modal-titulo-mdf').innerText = `Editar Orçamento #${id}`;

    const { data: orc } = await supabaseClient.from('mdf_orcamentos').select('*').eq('id', id).single();
    if (orc) {
      document.getElementById('status-mdf').value = orc.status || 'ABERTO';
      document.getElementById('observacoes-mdf').value = orc.observacoes || '';
      document.getElementById('tipo-desconto-mdf').value = orc.tipo_desconto || '$';
      document.getElementById('valor-desconto-mdf').value = orc.desconto || 0;
      
      // Preencher cliente
      if (orc.cliente_nome) {
        document.getElementById('cliente-nome-mdf').value = orc.cliente_nome;
        // Buscar ID do cliente para guardar no hidden
        const { data: cliente } = await supabaseClient
          .from('clientes')
          .select('id')
          .eq('nome', orc.cliente_nome)
          .maybeSingle();
        document.getElementById('cliente-id-mdf').value = cliente?.id || '';
      } else {
        document.getElementById('cliente-nome-mdf').value = '';
        document.getElementById('cliente-id-mdf').value = '';
      }
    }

    const { data: itensData } = await supabaseClient.from('mdf_itens').select('*').eq('orcamento_id', id);
    this.itens = itensData ? itensData.map(i => ({
      id: i.id,
      nome: i.nome,
      descricao: i.descricao || '',
      preco: parseFloat(i.preco),
      desconto: parseFloat(i.desconto || 0),
      foto_url: i.foto_url || '',
      removido: false
    })) : [];

    this.renderizarItens();
    this.atualizarTotais();
    document.getElementById('modal-orcamento-mdf').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  adicionarItem(dados = {}) {
    this.itens.push({
      id: null,
      nome: dados.nome || '',
      descricao: dados.descricao || '',
      preco: dados.preco || 0,
      desconto: dados.desconto || 0,
      foto_url: dados.foto_url || '',
      removido: false
    });
    this.renderizarItens();
    this.atualizarTotais();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  removerItem(index) {
    if (this.itens[index].id) {
      this.itens[index].removido = true;
    } else {
      this.itens.splice(index, 1);
    }
    this.renderizarItens();
    this.atualizarTotais();
  }

  renderizarItens() {
    const container = document.getElementById('container-itens-mdf');
    if (!container) return;
    container.innerHTML = this.itens.filter(i => !i.removido).map((item, idx) => `
      <div class="flex flex-col md:flex-row gap-3 items-start border border-slate-200 rounded-xl p-3 bg-white">
        <div class="w-40 h-40 rounded-lg border bg-slate-100 flex items-center justify-center cursor-pointer overflow-hidden relative" onclick="this.querySelector('input[type=file]').click()">
          ${item.foto_url 
            ? `<img src="${item.foto_url}" class="w-full h-full object-cover" alt="Foto" style="position: absolute; inset: 0;">`
            : `<i data-lucide="camera" class="w-15 h-15 text-slate-400"></i>`
          }
          <input type="file" accept="image/*" class="hidden" onchange="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.uploadImagemItem(this, ${idx})">
        </div>
        <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
          <input type="text" placeholder="Nome do móvel" value="${item.nome.replace(/"/g, '&quot;')}" onchange="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.atualizarItem(${idx}, 'nome', this.value)" class="p-2 border rounded text-sm w-full">
          <input type="text" placeholder="Medidas / descrição" value="${item.descricao.replace(/"/g, '&quot;')}" onchange="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.atualizarItem(${idx}, 'descricao', this.value)" class="p-2 border rounded text-sm w-full">
          <input type="number" placeholder="Preço R$" value="${item.preco}" onchange="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.atualizarItem(${idx}, 'preco', parseFloat(this.value) || 0)" class="p-2 border rounded text-sm w-full" step="0.01">
          <input type="number" placeholder="Desconto R$" value="${item.desconto}" onchange="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.atualizarItem(${idx}, 'desconto', parseFloat(this.value) || 0)" class="p-2 border rounded text-sm w-full" step="0.01">
        </div>
        <button onclick="if(window.mdfOrcamentosManager) window.mdfOrcamentosManager.removerItem(${idx})" class="text-red-400 hover:text-red-600 p-2"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
      </div>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  atualizarItem(index, campo, valor) {
    this.itens[index][campo] = valor;
    this.atualizarTotais();
  }

  async uploadImagemItem(input, index) {
    const file = input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const resp = await fetch(`https://api.imgbb.com/1/upload?key=c201a949389ed2c50aabd3731b4d1932`, {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      if (data.success) {
        this.itens[index].foto_url = data.data.url;
        this.renderizarItens();
        if (typeof lucide !== 'undefined') lucide.createIcons();
      } else {
        window.showToast('Erro ao enviar imagem.', true);
      }
    } catch (e) {
      window.showToast('Erro de conexão ao enviar imagem.', true);
    }
  }

  atualizarTotais() {
    const subtotal = this.itens.filter(i => !i.removido).reduce((s, i) => s + i.preco, 0);
    const tipo = document.getElementById('tipo-desconto-mdf').value;
    const valor = parseFloat(document.getElementById('valor-desconto-mdf').value) || 0;
    const desconto = tipo === '%' ? subtotal * (valor / 100) : valor;
    const total = Math.max(0, subtotal - desconto);
    document.getElementById('subtotal-mdf').innerText = `R$ ${subtotal.toFixed(2)}`;
    document.getElementById('total-geral-mdf').innerText = `R$ ${total.toFixed(2)}`;
  }

  async salvarOrcamento() {
    const clienteId = document.getElementById('cliente-id-mdf').value;
    const clienteNome = document.getElementById('cliente-nome-mdf').value.trim() || 'Consumidor Final';
    if (!clienteId) {
      window.showToast('Selecione um cliente válido.', true);
      return;
    }
    const status = document.getElementById('status-mdf').value;
    const obs = document.getElementById('observacoes-mdf').value.trim();
    const descontoValor = parseFloat(document.getElementById('valor-desconto-mdf').value) || 0;
    const tipoDesconto = document.getElementById('tipo-desconto-mdf').value;

    if (!clienteNome) {
      window.showToast("Selecione um cliente.", true);
      return;
    }

    const itensAtivos = this.itens.filter(i => !i.removido);
    if (itensAtivos.length === 0) {
      window.showToast("Adicione pelo menos um item ao orçamento.", true);
      return;
    }

    itensAtivos.forEach(item => {
      item.preco = parseFloat(item.preco) || 0;
      item.desconto = parseFloat(item.desconto) || 0;
    });

    if (this.orcamentoAtualId) {
      // Atualização
      const { error: errOrc } = await supabaseClient
        .from('mdf_orcamentos')
        .update({
          cliente_nome: clienteNome,
          status,
          observacoes: obs,
          desconto: descontoValor,
          tipo_desconto: tipoDesconto
        })
        .eq('id', this.orcamentoAtualId);
      if (errOrc) {
        window.showToast('Erro ao atualizar orçamento: ' + errOrc.message, true);
        return;
      }

      const itensParaRemover = this.itens.filter(i => i.removido && i.id);
      for (const item of itensParaRemover) {
        await supabaseClient.from('mdf_itens').delete().eq('id', item.id);
      }

      for (const item of itensAtivos) {
        const payload = {
          orcamento_id: this.orcamentoAtualId,
          nome: item.nome,
          descricao: item.descricao || '',
          preco: item.preco,
          desconto: item.desconto,
          foto_url: item.foto_url || ''
        };
        if (item.id) {
          await supabaseClient.from('mdf_itens').update(payload).eq('id', item.id);
        } else {
          await supabaseClient.from('mdf_itens').insert(payload);
        }
      }
    } else {
      // Novo orçamento
      const { data: novoOrc, error: errOrc } = await supabaseClient
        .from('mdf_orcamentos')
        .insert({
          cliente_nome: clienteNome,
          status,
          observacoes: obs,
          desconto: descontoValor,
          tipo_desconto: tipoDesconto
        })
        .select()
        .single();
      if (errOrc) {
        window.showToast('Erro ao criar orçamento: ' + errOrc.message, true);
        return;
      }

      const itensParaInserir = itensAtivos.map(item => ({
        orcamento_id: novoOrc.id,
        nome: item.nome,
        descricao: item.descricao || '',
        preco: item.preco,
        desconto: item.desconto,
        foto_url: item.foto_url || ''
      }));
      const { error: errItens } = await supabaseClient.from('mdf_itens').insert(itensParaInserir);
      if (errItens) console.error("Erro ao inserir itens:", errItens);
    }

    this.itens = [];
    this.fecharModal();
    this.renderizarOrcamentos();
    window.showToast('Orçamento salvo com sucesso!');
  }

  async excluirOrcamento(id) {
    if (!confirm('Excluir este orçamento?')) return;
    await supabaseClient.from('mdf_itens').delete().eq('orcamento_id', id);
    await supabaseClient.from('mdf_orcamentos').delete().eq('id', id);
    this.renderizarOrcamentos();
  }

  async duplicarOrcamento(id) {
    if (!confirm('Duplicar este orçamento?')) return;
    const { data: orc } = await supabaseClient.from('mdf_orcamentos').select().eq('id', id).single();
    if (!orc) return;
    const { data: itensData } = await supabaseClient.from('mdf_itens').select().eq('orcamento_id', id);
    const { data: novo } = await supabaseClient.from('mdf_orcamentos').insert({
      cliente_nome: orc.cliente_nome,
      status: 'ABERTO',
      observacoes: orc.observacoes,
      desconto: orc.desconto,
      tipo_desconto: orc.tipo_desconto
    }).select().single();
    if (novo && itensData) {
      const novosItens = itensData.map(i => ({
        orcamento_id: novo.id,
        nome: i.nome,
        descricao: i.descricao,
        preco: i.preco,
        desconto: i.desconto,
        foto_url: i.foto_url
      }));
      await supabaseClient.from('mdf_itens').insert(novosItens);
    }
    this.renderizarOrcamentos();
    window.showToast('Orçamento duplicado!');
  }

  async baixarPDF(id) {
    const { data: orc } = await supabaseClient.from('mdf_orcamentos').select().eq('id', id).single();
    if (!orc) return;
    const { data: itensData } = await supabaseClient.from('mdf_itens').select().eq('orcamento_id', id);
    const itens = itensData || [];

    const rowsHtml = itens.map((item, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">
        <td style="padding: 8px;">${item.foto_url ? `<img src="${item.foto_url}" style="width:40px; height:40px; border-radius:4px; vertical-align:middle;"> ` : ''}${item.nome}</td>
        <td style="padding: 8px;">${item.descricao || ''}</td>
        <td style="padding: 8px; text-align: right;">R$ ${parseFloat(item.preco).toFixed(2)}</td>
        <td style="padding: 8px; text-align: right;">R$ ${parseFloat(item.desconto || 0).toFixed(2)}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold;">R$ ${(parseFloat(item.preco) - parseFloat(item.desconto || 0)).toFixed(2)}</td>
      </tr>
    `).join('');

    // Aplica desconto geral
    let subtotal = itens.reduce((s, i) => s + parseFloat(i.preco) - parseFloat(i.desconto || 0), 0);
    let descontoTotal = parseFloat(orc.desconto) || 0;
    if (orc.tipo_desconto === '%') descontoTotal = subtotal * (descontoTotal / 100);
    const total = Math.max(0, subtotal - descontoTotal);

    const html = `
      <div style="font-family: Helvetica; padding: 20px; max-width: 800px; margin: auto; background: white;">
        <div style="text-align: center;">
          <img src="logo.png" style="height: 60px;" onerror="this.style.display='none'">
          <h2 style="color: #b8a94e;">RV PORTAL MADEIRAS</h2>
          <p style="font-size: 14px;">CNPJ: 30.942.123/0001-02 | Rua Mineiros, 532 - Jataí/GO</p>
          <h3>ORÇAMENTO #${orc.id}</h3>
        </div>
        <p><strong>Cliente:</strong> ${orc.cliente_nome}</p>
        <p><strong>Data:</strong> ${new Date(orc.created_at).toLocaleDateString('pt-BR')}</p>
        ${orc.observacoes ? `<p><strong>Obs:</strong> ${orc.observacoes}</p>` : ''}
        <table style="width:100%; border-collapse: collapse; margin-top:15px;">
          <thead><tr style="background:#1e293b; color:white;"><th>Item</th><th>Desc.</th><th>Preço</th><th>Desc.</th><th>Total</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="text-align:right; margin-top:15px; font-size:18px; font-weight:bold;">Total: R$ ${total.toFixed(2)}</div>
      </div>
    `;

    const opt = {
      margin: 10,
      filename: `orcamento_${orc.cliente_nome}_#${orc.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    const printArea = document.getElementById('print-area');
    if (printArea) {
      printArea.innerHTML = html;
      await html2pdf().set(opt).from(html).save();
      printArea.innerHTML = '';
    } else {
      window.showToast("Elemento print-area não encontrado.", true);
    }
  }

  gerarPDF() {
    const clienteNome = document.getElementById('cliente-nome-mdf').value || 'Consumidor Final';
    const obs = document.getElementById('observacoes-mdf').value;
    const itensAtivos = this.itens.filter(i => !i.removido);
    const subtotal = itensAtivos.reduce((s, i) => s + i.preco, 0);
    const tipo = document.getElementById('tipo-desconto-mdf').value;
    const valor = parseFloat(document.getElementById('valor-desconto-mdf').value) || 0;
    const desconto = tipo === '%' ? subtotal * (valor / 100) : valor;
    const total = Math.max(0, subtotal - desconto);

    const rowsHtml = itensAtivos.map((item, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">
        <td style="padding: 12px;">
          ${item.foto_url ? `<img src="${item.foto_url}" style="width:100px; height:100px; object-fit:cover; border-radius:4px; vertical-align:middle;"> ` : ''}
          ${item.nome}
        </td>
        <td style="padding: 8px;">${item.descricao}</td>
        <td style="padding: 8px; text-align: right;">R$ ${item.preco.toFixed(2)}</td>
        <td style="padding: 8px; text-align: right;">R$ ${item.desconto.toFixed(2)}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold;">R$ ${(item.preco - item.desconto).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: Helvetica; padding: 20px; max-width: 800px; margin: auto; background: white;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="logo.png" style="height: 60px; display: block; margin: 0 auto;" onerror="this.style.display='none'">
          <h2 style="color: #b8a94e; margin-top: 5px;">RV PORTAL MADEIRAS</h2>
          <p style="font-size: 14px; color: #475569;">CNPJ: 30.942.123/0001-02 | Rua Mineiros, 532 - Jataí/GO</p>
          <h3 style="margin-top: 20px;">ORÇAMENTO</h3>
        </div>
        <div style="margin-bottom: 20px;">
          <p><strong>Cliente:</strong> ${clienteNome}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
          ${obs ? `<p><strong>Observações:</strong> ${obs}</p>` : ''}
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #1e293b; color: white;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: left;">Descrição</th>
              <th style="padding: 8px; text-align: right;">Preço</th>
              <th style="padding: 8px; text-align: right;">Desc.</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="text-align: right; font-size: 18px; font-weight: bold; border-top: 2px solid #1e293b; padding-top: 10px;">
          Total: R$ ${total.toFixed(2)}
        </div>
        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #64748b;">
          RV Portal Madeiras - Obrigado pela preferência!
        </div>
      </div>
    `;

    const opt = {
      margin: 10,
      filename: `orcamento_${clienteNome.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(html).save();
  }

  imprimirOrcamento(id) {
    if (id) {
      this.baixarPDF(id);
    } else {
      this.gerarPDF();
    }
  }

  // ========== NOVOS MÉTODOS DE FATURAMENTO E AGENDA ==========
  async faturarOrcamento(id) {
    if (!confirm(`Faturar orçamento #${id}? Isso criará uma venda no sistema financeiro.`)) return;
    if (typeof showLoading === 'function') showLoading(true);

    try {
      // 1. Buscar orçamento e itens
      const { data: orc, error: errOrc } = await supabaseClient
        .from('mdf_orcamentos')
        .select('*')
        .eq('id', id)
        .single();
      if (errOrc) throw errOrc;

      const { data: itens, error: errItens } = await supabaseClient
        .from('mdf_itens')
        .select('*')
        .eq('orcamento_id', id);
      if (errItens) throw errItens;
      if (!itens.length) throw new Error('Orçamento sem itens');

      // 2. Calcular totais e distribuir desconto
      const subtotal = itens.reduce((acc, i) => acc + parseFloat(i.preco), 0);
      let descontoTotal = parseFloat(orc.desconto) || 0;
      if (orc.tipo_desconto === '%') {
        descontoTotal = subtotal * (descontoTotal / 100);
      }
      const totalLiquido = Math.max(0, subtotal - descontoTotal);
      const fator = subtotal > 0 ? totalLiquido / subtotal : 0;

      // 3. Buscar cliente (para log)
      const { data: cliente } = await supabaseClient
        .from('clientes')
        .select('nome')
        .eq('nome', orc.cliente_nome)
        .maybeSingle();
      const nomeCliente = cliente?.nome || orc.cliente_nome || 'Consumidor Final';

      // 4. Buscar o próximo ID disponível na tabela logs
      const { data: maxIdData, error: maxIdError } = await supabaseClient
        .from('logs')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
      if (maxIdError) throw maxIdError;
      let novoId = 1;
      if (maxIdData && maxIdData.length > 0) {
        novoId = maxIdData[0].id + 1;
      }
      const vendaId = novoId;

      // 5. Criar logs de venda (tipo 'venda')
      const timestamp = new Date().toISOString();
      const logs = itens.map(item => ({
        id: vendaId,
        tipo: 'venda',
        produto_nome: item.nome,
        quantidade: 1,
        data: timestamp,
        observacao: `MDF Orçamento #${id} - ${item.descricao || ''}`,
        valor_total: parseFloat(item.preco) * fator,
        cliente_nome: nomeCliente,
        forma_pagamento: 'A Faturar',
        status: 'ATIVO',
        status_entrega: '',
        qtd_entregue: 0,
        desconto: 0,
        status_financeiro: 'PENDENTE',
        vencimento: timestamp,
        valor_pago: 0,
        endereco_entrega: ''
      }));

      const { error: errInsert } = await supabaseClient.from('logs').insert(logs);
      if (errInsert) throw errInsert;

      // 6. Atualizar status do orçamento para APROVADO
      const { error: errUpdate } = await supabaseClient
        .from('mdf_orcamentos')
        .update({ status: 'APROVADO' })
        .eq('id', id);
      if (errUpdate) throw errUpdate;

      window.showToast(`Orçamento #${id} faturado com sucesso! Venda registrada.`);
      this.renderizarOrcamentos();
      window.loadData();
    } catch (err) {
      console.error(err);
      window.showToast('Erro ao faturar: ' + err.message, true);
    } finally {
      if (typeof showLoading === 'function') showLoading(false);  
    }   
  }

  async estornarOrcamento(id) {
    if (!confirm(`Estornar venda do orçamento #${id}? Isso removerá a venda do financeiro.`)) return;
    if (typeof showLoading === 'function') showLoading(true);

    try {
      // 1. Buscar os logs de venda associados (observação contém "MDF Orçamento #id")
      const { data: logs, error: errLogs } = await supabaseClient
        .from('logs')
        .select('*')
        .like('observacao', `%MDF Orçamento #${id}%`)
        .eq('tipo', 'venda');
      if (errLogs) throw errLogs;

      if (logs.length) {
        // Excluir logs (ou marcar como cancelados)
        const idsParaExcluir = logs.map(l => l.id);
        const { error: errDel } = await supabaseClient
          .from('logs')
          .delete()
          .in('id', idsParaExcluir);
        if (errDel) throw errDel;
      }

      // 2. Atualizar status do orçamento para ABERTO
      const { error: errUpdate } = await supabaseClient
        .from('mdf_orcamentos')
        .update({ status: 'ABERTO' })
        .eq('id', id);
      if (errUpdate) throw errUpdate;

      window.showToast(`Estorno realizado. Orçamento #${id} voltou para ABERTO.`);
      this.renderizarOrcamentos();
      window.loadData();
    } catch (err) {
      console.error(err);
      window.showToast('Erro ao estornar: ' + err.message, true);
    } finally {
      if (typeof showLoading === 'function') showLoading(false);
    }
  }

  // ========== MÉTODOS DE AGENDA ==========
  async agendarInstalacao(orcamentoId) {
    // Buscar dados do orçamento e possível agendamento existente
    const { data: orc } = await supabaseClient
      .from('mdf_orcamentos')
      .select('*')
      .eq('id', orcamentoId)
      .single();

    const { data: agendaExistente } = await supabaseClient
      .from('mdf_agenda')
      .select('*')
      .eq('orcamento_id', orcamentoId)
      .maybeSingle();
   
    this.abrirModalAgenda(orcamentoId, orc, agendaExistente);
  }

  abrirModalAgenda(orcamentoId, orc, agenda) {
    // Remove modal antigo se existir
    const modalAntigo = document.getElementById('modal-agenda-mdf');
    if (modalAntigo) modalAntigo.remove();

    // Cria estrutura do modal
    const modal = document.createElement('div');
    modal.id = 'modal-agenda-mdf';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4';
    //modal.style.backdropFilter = 'blur(2px)';

    // Formatar datas para o input date (YYYY-MM-DD)
    const dataHoje = new Date().toISOString().split('T')[0];
    const dataAgendada = agenda ? agenda.data_agendada.split('T')[0] : dataHoje;
    const horarioAgendado = agenda ? agenda.horario.slice(0,5) : '14:00';
    const statusAtual = agenda ? agenda.status : 'AGENDADO';

    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-emerald-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <h3 class="text-xl font-bold flex items-center gap-2">
            <i data-lucide="calendar" class="w-5 h-5"></i> 
            Agenda de Instalação
          </h3>
          <button onclick="document.getElementById('modal-agenda-mdf').remove()" class="text-white hover:text-emerald-200">
            <i data-lucide="x" class="w-6 h-6"></i>
          </button>
        </div>
        
        <div class="p-6 space-y-5">
          <div class="bg-slate-50 p-3 rounded-lg">
            <p class="text-xs text-slate-500 uppercase font-bold">Orçamento / Cliente</p>
            <p class="font-bold text-slate-800">#${orcamentoId} - ${orc.cliente_nome}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1">Data da Instalação *</label>
              <input type="date" id="agenda-data" value="${dataAgendada}" min="${dataHoje}" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1">Horário *</label>
              <input type="time" id="agenda-horario" value="${horarioAgendado}" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">Status</label>
            <select id="agenda-status" class="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="AGENDADO" ${statusAtual === 'AGENDADO' ? 'selected' : ''}>Agendado</option>
              <option value="REAGENDADO" ${statusAtual === 'REAGENDADO' ? 'selected' : ''}>Reagendado</option>
              <option value="CONCLUIDO" ${statusAtual === 'CONCLUIDO' ? 'selected' : ''}>Concluído</option>
              <option value="CANCELADO" ${statusAtual === 'CANCELADO' ? 'selected' : ''}>Cancelado</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1">Instalador (nome)</label>
              <input type="text" id="agenda-instalador-nome" value="${agenda?.instalador_nome || ''}" placeholder="Ex: João Silva" class="w-full p-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1">Telefone do Instalador</label>
              <input type="tel" id="agenda-instalador-tel" value="${agenda?.instalador_telefone || ''}" placeholder="(64) 99999-9999" class="w-full p-2 border rounded-lg">
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">Observações</label>
            <textarea id="agenda-obs" rows="3" placeholder="Detalhes da instalação, endereço, etc." class="w-full p-2 border rounded-lg">${agenda?.observacoes || ''}</textarea>
          </div>

          <!-- Campo reservado para foto (futuro) -->
          <div class="border-t pt-3">
            <p class="text-xs text-slate-400 flex items-center gap-1"><i data-lucide="image" class="w-3 h-3"></i> Reservado para foto do produto instalado (em breve)</p>
            <div id="foto-preview-area" class="hidden mt-2"></div>
          </div>

          <div class="flex gap-3 pt-4">
            ${agenda && agenda.status !== 'CANCELADO' ? `
              <button id="btn-cancelar-agenda" class="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-bold py-2 rounded-lg transition flex items-center justify-center gap-2">
                <i data-lucide="ban" class="w-4 h-4"></i> Cancelar Instalação
              </button>
            ` : ''}
            <button id="btn-salvar-agenda" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg shadow flex items-center justify-center gap-2">
              <i data-lucide="save"></i> Salvar Agendamento
            </button>
            <button id="btn-whatsapp-instalador" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg shadow flex items-center justify-center gap-2 ${!agenda?.instalador_telefone ? 'opacity-50 cursor-not-allowed' : ''}" ${!agenda?.instalador_telefone ? 'disabled' : ''}>
              <i data-lucide="message-circle"></i> WhatsApp
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Eventos
    document.getElementById('btn-salvar-agenda').addEventListener('click', () => this.salvarAgenda(orcamentoId, modal));
    if (agenda && agenda.status !== 'CANCELADO') {
      document.getElementById('btn-cancelar-agenda')?.addEventListener('click', () => this.cancelarAgenda(orcamentoId, modal));
    }
    document.getElementById('btn-whatsapp-instalador')?.addEventListener('click', () => this.enviarWhatsAppInstalador(orcamentoId, agenda));
  }

  async salvarAgenda(orcamentoId, modal) {
    const data = document.getElementById('agenda-data').value;
    const horario = document.getElementById('agenda-horario').value;
    const status = document.getElementById('agenda-status').value;
    const instalador_nome = document.getElementById('agenda-instalador-nome').value;
    const instalador_telefone = document.getElementById('agenda-instalador-tel').value;
    const observacoes = document.getElementById('agenda-obs').value;

    if (!data || !horario) {
      window.showToast('Preencha data e horário.', true);
      return;
    }

    // Verificar se já existe agendamento
    const { data: existente } = await supabaseClient
      .from('mdf_agenda')
      .select('id')
      .eq('orcamento_id', orcamentoId)
      .maybeSingle();

    let error;
    if (existente) {
      const { error: err } = await supabaseClient
        .from('mdf_agenda')
        .update({
          data_agendada: data,
          horario,
          status,
          instalador_nome,
          instalador_telefone,
          observacoes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existente.id);
      error = err;
    } else {
      const { error: err } = await supabaseClient
        .from('mdf_agenda')
        .insert({
          orcamento_id: orcamentoId,
          data_agendada: data,
          horario,
          status,
          instalador_nome,
          instalador_telefone,
          observacoes
        });
      error = err;
    }

    if (error) {
      window.showToast('Erro ao salvar agenda: ' + error.message, true);
    } else {
      window.showToast('Agendamento salvo com sucesso!');
      modal.remove();
      this.renderizarOrcamentos();
    }
  }

  async cancelarAgenda(orcamentoId, modal) {
    if (!confirm('Cancelar esta instalação? O status será alterado para CANCELADO.')) return;

    const { error } = await supabaseClient
      .from('mdf_agenda')
      .update({ status: 'CANCELADO', updated_at: new Date().toISOString() })
      .eq('orcamento_id', orcamentoId);

    if (error) {
      window.showToast('Erro ao cancelar: ' + error.message, true);
    } else {
      window.showToast('Instalação cancelada.');
      modal.remove();
      this.renderizarOrcamentos();
    }
  }

  enviarWhatsAppInstalador(orcamentoId, agenda) {
    if (!agenda || !agenda.instalador_telefone) {
      window.showToast('Telefone do instalador não cadastrado.', true);
      return;
    }

    // Formatar número (remover não dígitos)
    let numero = agenda.instalador_telefone.replace(/\D/g, '');
    if (numero.length === 11) numero = '55' + numero;
    else if (numero.length === 10) numero = '55' + numero;

    // Mensagem padrão
    const dataFormatada = new Date(agenda.data_agendada + 'T' + agenda.horario).toLocaleString('pt-BR');
    const msg = `Olá ${agenda.instalador_nome || 'instalador'}! Temos uma instalação agendada para o orçamento #${orcamentoId} no dia ${dataFormatada}. Detalhes: ${agenda.observacoes || 'sem observações adicionais'}. Obrigado!`;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  // ========== MÉTODOS DE BUSCA DE CLIENTES (MODAL) ==========
  abrirModalClientes() {
    // Remove modal existente se houver
    const modalExistente = document.getElementById('modal-busca-clientes-mdf');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-busca-clientes-mdf';
    modal.className = 'fixed inset-0 bg-black/50 flex items-start justify-center z-[80] p-4';
    //modal.style.backdropFilter = 'blur(2px)';

    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div class="p-4 border-b flex justify-between items-center bg-emerald-50 rounded-t-2xl">
          <h3 class="font-bold text-slate-800 text-lg flex items-center gap-2">
            <i data-lucide="users" class="text-emerald-600"></i> Selecionar Cliente
          </h3>
          <button onclick="this.closest('#modal-busca-clientes-mdf').remove()" class="text-slate-400 hover:text-red-500">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
        <div class="p-4">
          <div class="relative">
            <i data-lucide="search" class="absolute left-3 top-3 text-slate-400 w-4 h-4"></i>
            <input type="text" id="filtro-cliente-mdf" placeholder="Digite o nome ou parte..." 
                   class="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm">
          </div>
        </div>
        <div class="flex-1 overflow-y-auto px-4 pb-4" id="lista-clientes-modal">
          <div class="text-center text-slate-400 py-8">Digite para buscar...</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Foco no input de busca
    const inputFiltro = document.getElementById('filtro-cliente-mdf');
    inputFiltro.focus();

    // Evento de busca em tempo real (debounce de 300ms)
    let timeoutId = null;
    inputFiltro.addEventListener('input', () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        this.buscarClientesModal(inputFiltro.value);
      }, 300);
    });

    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  async buscarClientesModal(filtro) {
    const lista = document.getElementById('lista-clientes-modal');
    if (!lista) return;

    if (!filtro || filtro.length < 2) {
      lista.innerHTML = '<div class="text-center text-slate-400 py-8">Digite pelo menos 2 caracteres para buscar...</div>';
      return;
    }

    lista.innerHTML = '<div class="text-center text-slate-400 py-8">Buscando...</div>';

    try {
      const { data: clientes, error } = await supabaseClient
        .from('clientes')
        .select('id, nome')
        .ilike('nome', `%${filtro}%`)
        .order('nome')
        .limit(20); // Limite para performance

      if (error) throw error;

      if (!clientes || clientes.length === 0) {
        lista.innerHTML = '<div class="text-center text-slate-400 py-8">Nenhum cliente encontrado.</div>';
        return;
      }

      lista.innerHTML = clientes.map(cliente => `
        <div class="cliente-item-modal p-3 border-b hover:bg-emerald-50 cursor-pointer transition flex items-center gap-3"
             data-id="${cliente.id}" data-nome="${cliente.nome}">
          <i data-lucide="user" class="w-4 h-4 text-slate-400"></i>
          <span class="font-medium text-slate-700">${cliente.nome}</span>
        </div>
      `).join('');

      if (typeof lucide !== 'undefined') lucide.createIcons();

      // Adicionar evento de clique em cada item
      lista.querySelectorAll('.cliente-item-modal').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          const nome = item.dataset.nome;
          this.selecionarCliente(id, nome);
          document.getElementById('modal-busca-clientes-mdf').remove();
        });
      });

    } catch (err) {
      console.error(err);
      lista.innerHTML = `<div class="text-center text-red-400 py-8">Erro ao buscar: ${err.message}</div>`;
    }
  }

  selecionarCliente(id, nome) {
    document.getElementById('cliente-id-mdf').value = id;
    document.getElementById('cliente-nome-mdf').value = nome;
    // Se quiser, pode também disparar atualização de totais ou outra ação
  }
  
} // FIM DA CLASSE ORCAMENTOSMDF

// ==================== INICIALIZAÇÃO GLOBAL ====================
window.iniciarMDF = function() {
  const container = document.getElementById('view-mdf');
  if (!container || container.dataset.mdfIniciado === 'true') return;
  container.dataset.mdfIniciado = 'true';
  container.classList.remove('hidden-section');
  container.classList.add('active-section');
  container.innerHTML = ''; // Limpa qualquer conteúdo anterior
  const manager = new MDFManager(container);
  // Expor referências globais para os eventos onclick
  window.mdfOrcamentosManager = manager.orcamentosManager;
  // Atualizar a referência quando o orcamentosManager for criado
  const originalMostrarSubAba = manager.mostrarSubAba.bind(manager);
  manager.mostrarSubAba = function(nome) {
    originalMostrarSubAba(nome);
    if (nome === 'orcamentos' && manager.orcamentosManager) {
      window.mdfOrcamentosManager = manager.orcamentosManager;
    }
  };
};

// Aguarda o carregamento do DOM e das dependências
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.navigate !== 'undefined') {
      const originalNavigate = window.navigate;
      window.navigate = function(viewId) {
        originalNavigate(viewId);
        if (viewId === 'mdf') {
          setTimeout(() => window.iniciarMDF(), 100);
        }
      };
    }
  });
} else {
  if (typeof window.navigate !== 'undefined') {
    const originalNavigate = window.navigate;
    window.navigate = function(viewId) {
      originalNavigate(viewId);
      if (viewId === 'mdf') {
        setTimeout(() => window.iniciarMDF(), 100);
      }
    };
  }
}
