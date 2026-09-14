// ==UserScript==
// @name         Filtros Rápidos para NEs Trabalhistas (v2.1.5)
// @namespace    http://tampermonkey.net/
// @version      2.1.5
// @description  Adiciona botões de filtro rápidos que grudam no topo da página. O botão do filtro ativo fica destacado e funciona como toggle (liga/desliga).
// @author       Paulo
// @match        *://parla.pge.reders/app/nes_trab*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pge.rs.gov.br
// @grant        none
// @updateURL    https://raw.githubusercontent.com/rfoPaulo/scripts-tampermonkey/main/filtros_nes_trabalhistas.user.js
// @downloadURL  https://raw.githubusercontent.com/rfoPaulo/scripts-tampermonkey/main/filtros_nes_trabalhistas.user.js
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Script para adicionar botões de filtro rápido.
     * VERSÃO 2.1.5
     * - destaque em diários dif de trt4
     * - NOVO: destaque (roxo) do trecho entre "INTIMADO(S) / CITADO(S)" e "|||"
     */

    const filters = [
        '#proc',
        '[exprovas] [n] #pge',
        '[corag]',
        'graficas]',
        '[audiencia] [s]',
        '[pauta] [s]',
        '[audiencia] [n] #pge_repint',
        '[pauta] [n] #pge_repint',
        '[audiencia] [n] #PGE_Extinta',
        '[pauta] [n] #PGE_Extinta',
        'int[CEEE',
        '[ELETRICA PARTICIPACOES]'
    ];

    const customCSS = `
        <style id="custom-filter-styles-v19">
            #custom-filters-container {
                position: sticky;
                top: 0;
                background-color: #ffffff;
                padding: 0 0 0 4px;
                z-index: 1; /* Valor baixo para ficar atrás de pop-ups como o calendário */
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                width: fit-content;
                margin: 1px auto !important;
                border-radius: 10px;
            }
            .custom-filter-btn {
                display: inline-flex; justify-content: space-between; align-items: center;
                gap: 3px; background-color: #4B5563; color: #F3F4F6;
                border: 1px solid transparent;
                padding: 3px 5px; font-size: 0.7rem;
                font-weight: 500; border-radius: 0.375rem;
                transition: all 0.15s ease-in-out;
                cursor: pointer; line-height: 1.5; min-width: 50px;
            }
            .custom-filter-btn:hover { background-color: #6B7280; }
            .custom-filter-btn.active {
                background-color: #2563EB;
                color: #FFFFFF;
                border-color: #93C5FD;
                box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
            }
            .count-badge-inside {
                display: inline-block; padding: 1px 6px; font-size: 0.75rem;
                font-weight: bold; border-radius: 10px; min-width: 10px;
                text-align: center; background-color: #374151; color: #6B7280;
                transition: all 0.15s ease-in-out;
            }
            .count-badge-inside.non-zero { background-color: #3B82F6; color: #FFFFFF; }
            .custom-filter-btn.active .count-badge-inside {
                 background-color: #FFFFFF; color: #2563EB;
            }
            /* NOVO: destaque do trecho INTIMADO(S) / CITADO(S) ... ||| */
            .intimado-highlight {
                background-color: #7C3AED;  /* Roxo */
                color: #FFFFFF;
                font-weight: 600;
                padding: 1px 3px;
                border-radius: 3px;
            }
            /* Garante que <mark> dentro do trecho não sobreponha o roxo */
            .intimado-highlight mark {
                background-color: transparent !important;
                color: inherit !important;
            }
        </style>
    `;

    if (document.getElementById('custom-filter-styles-v19')) {
        document.getElementById('custom-filter-styles-v19').remove();
    }
    document.head.insertAdjacentHTML('beforeend', customCSS);

    function createAndInsertButtons() {
        if (document.getElementById('custom-filters-container')) return;
        const targetTable = document.getElementById('tabela');
        if (!targetTable) return;

        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'custom-filters-container';
        buttonContainer.className = 'd-flex flex-wrap align-items-center';

        filters.forEach(filter => {
            const elementId = filter.replace(/\[|\]|#|\s/g, '');
            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'my-1 mr-1';
            buttonWrapper.innerHTML = `
                <button id="btn-${elementId}" class="custom-filter-btn" data-filter="${filter}">
                    <span>${filter}</span>
                    <span id="count-${elementId}" class="count-badge-inside">0</span>
                </button>
            `;
            buttonContainer.appendChild(buttonWrapper);
        });

        targetTable.parentNode.insertBefore(buttonContainer, targetTable);

        filters.forEach(filter => {
            const elementId = filter.replace(/\[|\]|#|\s/g, '');
            document.getElementById(`btn-${elementId}`).addEventListener('click', function() {
                if (window.myTable && window.myTable.datatable) {
                    const table = window.myTable.datatable;
                    const currentFilter = table.search();
                    const newFilter = (currentFilter === filter) ? '' : filter;
                    table.search(newFilter).draw();
                }
            });
        });
    }

    function updateFilterCounts() {
        if (!document.getElementById('custom-filters-container') || !window.myTable || !window.myTable.datatable) return;
        const table = window.myTable.datatable;
        const originalSearchTerm = table.search();

        filters.forEach(filterTerm => {
            const elementId = filterTerm.replace(/\[|\]|#|\s/g, '');
            const countId = `count-${elementId}`;
            const count = table.search(filterTerm).rows({ search: 'applied' }).count();
            const countBadge = document.getElementById(countId);
            if (countBadge) {
                countBadge.textContent = count;
                countBadge.classList.toggle('non-zero', count > 0);
            }
        });

        table.search(originalSearchTerm); // Restaura a busca original
    }

    function updateActiveButtonState() {
        if (!window.myTable || !window.myTable.datatable) return;
        const currentFilter = window.myTable.datatable.search();

        filters.forEach(filter => {
            const elementId = filter.replace(/\[|\]|#|\s/g, '');
            const button = document.getElementById(`btn-${elementId}`);
            if (button) {
                button.classList.toggle('active', currentFilter === filter);
            }
        });
    }

// --- INÍCIO DA ADIÇÃO: LÓGICA DE CORES <MARK> ---
    // 1. Mapa de cores por TÍTULO
    const titleColorMap = {
      "Representação Integral": "#90EE90",       // Verde claro
      "Representação Extraordinária": "#DDA0DD", // Roxo claro
      "Entidade Extinta": "#F08080"              // Vermelho claro
    };

    // 2. Mapa de cores por TEXTO específico (Fundo e Fonte)
    const textConfigMap = {
        'DE 2026': { bg: '#FF7F50', color: '' }
    };

    function aplicarCoresMark() {
        document.querySelectorAll('#tabela mark').forEach(mark => {
            const textContent = mark.innerText.trim();

            if (textConfigMap[textContent]) {
                mark.style.backgroundColor = textConfigMap[textContent].bg;
                if (textConfigMap[textContent].color) {
                    mark.style.color = textConfigMap[textContent].color;
                }
            }
            else {
                const titleColor = titleColorMap[mark.title];
                if (titleColor) {
                    mark.style.backgroundColor = titleColor;
                }
            }
        });
    }
    // --- FIM DA ADIÇÃO: LÓGICA DE CORES <MARK> ---

    // --- NOVA LÓGICA: DESTAQUE TEXTO COLUNA DIÁRIO ---
    function destacarDiariosAtipicos() {
        const table = document.getElementById('tabela');
        if (!table) return;

        let diarioIndex = -1;
        const headers = table.querySelectorAll('thead th');
        headers.forEach((th, index) => {
            if (th.innerText.trim() === 'Diário') {
                diarioIndex = index;
            }
        });

        if (diarioIndex === -1) return;

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.cells.length > diarioIndex) {
                const cell = row.cells[diarioIndex];
                const text = cell.innerText.trim();

                if (text !== '[TRT4]' && text !== '[TRT4DJEN]') {
                    if (!cell.querySelector('.diario-alert')) {
                        cell.innerHTML = `
                            <span class="diario-alert" style="
                                background-color: #ffcccc;
                                color: #8b0000;
                                font-weight: bold;
                                padding: 2px 4px;
                                border-radius: 4px;
                            ">
                                ${text}
                            </span>
                        `;
                    }
                }
            }
        });
    }

    // --- NOVA LÓGICA: DESTAQUE DO TRECHO "INTIMADO(S) / CITADO(S)" ... "|||" ---
    const RE_INICIO = /INTIMADO\(S\)\s*\/\s*CITADO\(S\)/i;
    const TERMINADOR = '|||';

    /**
     * Envolve o intervalo [start, end) de um nó de texto em um <span> roxo.
     * Retorna o nó de texto restante (após o trecho destacado) ou null.
     */
    function destacarTrechoNode(node, start, end) {
        const alvo = (start > 0) ? node.splitText(start) : node;
        const tamanho = end - start;
        let resto = null;
        if (tamanho < alvo.nodeValue.length) {
            resto = alvo.splitText(tamanho);
        }
        const span = document.createElement('span');
        span.className = 'intimado-highlight';
        alvo.parentNode.replaceChild(span, alvo);
        span.appendChild(alvo);
        return resto;
    }

    function destacarIntimados() {
        const table = document.getElementById('tabela');
        if (!table) return;

        table.querySelectorAll('tbody tr').forEach(row => {
            // Evita reprocessar linhas já tratadas (DataTables recria o HTML a cada draw)
            if (row.querySelector('.intimado-highlight')) return;

            // Coleta os nós de texto da linha, na ordem do documento
            const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, {
                acceptNode: n => (n.parentNode && n.parentNode.closest('.intimado-highlight'))
                    ? NodeFilter.FILTER_REJECT
                    : NodeFilter.FILTER_ACCEPT
            });
            const nodes = [];
            let n;
            while ((n = walker.nextNode())) nodes.push(n);

            let capturando = false;

            for (let i = 0; i < nodes.length; i++) {
                let node = nodes[i];
                if (!node.parentNode) continue;

                while (node) {
                    const texto = node.nodeValue;

                    if (!capturando) {
                        const m = texto.match(RE_INICIO);
                        if (!m) break;

                        const inicio = m.index + m[0].length;
                        const fim = texto.indexOf(TERMINADOR, inicio);

                        if (fim !== -1) {
                            // Início e fim no mesmo nó
                            const resto = destacarTrechoNode(node, inicio, fim);
                            node = resto; // continua procurando novas ocorrências no restante
                            continue;
                        } else {
                            destacarTrechoNode(node, inicio, texto.length);
                            capturando = true;
                            break;
                        }
                    } else {
                        const fim = texto.indexOf(TERMINADOR);
                        if (fim !== -1) {
                            const resto = destacarTrechoNode(node, 0, fim);
                            capturando = false;
                            node = resto; // pode haver outra ocorrência depois do |||
                            continue;
                        } else {
                            destacarTrechoNode(node, 0, texto.length);
                            break;
                        }
                    }
                }
            }
        });
    }

    // --- Execução ---
    const observer = new MutationObserver(function (mutations, obs) {
        if (document.getElementById('tabela_wrapper')) {
            if (window.myTable && window.myTable.datatable) {
                const table = window.myTable.datatable;

                table.off('draw.dt'); // Evita múltiplos listeners
                table.on('draw.dt', function() {
                    createAndInsertButtons();
                    updateFilterCounts();
                    updateActiveButtonState();
                    aplicarCoresMark();
                    destacarDiariosAtipicos();
                    destacarIntimados();
                });

                // Execução inicial
                createAndInsertButtons();
                updateFilterCounts();
                updateActiveButtonState();
                aplicarCoresMark();
                destacarDiariosAtipicos();
                destacarIntimados();
            }
            obs.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
