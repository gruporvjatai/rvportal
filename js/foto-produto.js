// Fallback visual para fotos de produto que nao carregam.
// Mantem o layout estavel quando o objeto foi removido do Storage ou a URL
// esta invalida, em vez de mostrar o icone de imagem quebrada do navegador.
(function () {
  function classesDeTamanho(el) {
    const cls = String((el && el.className) || '');
    return (cls.match(/\b(?:w|h|min-w|min-h)-[^\s]+/g) || []).join(' ');
  }

  function trocarPorPlaceholder(img) {
    if (!img) return;
    const host = img.closest('button') || img;
    if (host.dataset && host.dataset.rvFotoFallback === '1') return;

    const tamanho = classesDeTamanho(host) || classesDeTamanho(img) || 'w-12 h-12';
    const div = document.createElement('div');
    div.dataset.rvFotoFallback = '1';
    div.className = (tamanho + ' shrink-0 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300').trim();
    div.title = 'Foto indisponivel';
    div.innerHTML = '<i data-lucide="image" class="w-5 h-5"></i>';
    host.replaceWith(div);
    if (window.lucide) window.lucide.createIcons();
  }

  window.rvFotoProdutoErro = function (img) {
    try {
      trocarPorPlaceholder(img);
    } catch (_) {
      if (img) img.style.display = 'none';
    }
  };
})();
