// ==UserScript==
// @name         Filtros Rápidos para NEs Cíveis (v2.3)
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Adiciona botões de filtro. O botão do filtro ativo fica destacado e funciona como toggle. Adicionado espaçamento para agrupar filtros.
// @author       Paulo (modificado por Gemini)
// @match        *://parla.pge.reders/app/nes_civeis*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pge.rs.gov.br
// @grant        none
// @updateURL    https://raw.githubusercontent.com/rfoPaulo/scripts-tampermonkey/main/filtros_nes_civeis.user.js
// @downloadURL  https://raw.githubusercontent.com/rfoPaulo/scripts-tampermonkey/main/filtros_nes_civeis.user.js
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Script para adicionar botões de filtro rápido na página 'nes_civeis'.
     * VERSÃO 2.3
     * - Cores Mark
     */

    const filters = [
        '#proc',
        '#PGE_RepInt [f]',
        '#PGE_RepInt [n]',
        '#PGE_Ext [f]',
        '#PGE_RepExtra [s] [f]',
        '[f] audiencia', // <-- A separação visual ocorrerá antes deste item
        '[f] oitiva',
        '#pge_repint audiencia',
        '#pge_repint oitiva'
    ];

    const customCSS = `
        <style id="custom-filter-styles-v21-civeis">
            #custom-filters-container {
                position: sticky;
                top: 0;
                background-color: #ffffff;
                padding: 0 0 0 4px;
                z-index: 1;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                width: fit-content;
                margin: 1px auto !important;
                border-radius: 10px;
            }

            .custom-filter-btn {
                display: inline-flex; justify-content: space-between; align-items: center;
                gap: 8px; background-color: #4B5563; color: #F3F4F6;
                border: 1px solid transparent; /* Evita pulo de layout no hover/active */
                padding: 5px 8px; font-size: 0.8rem;
                font-weight: 500; border-radius: 0.375rem;
                transition: all 0.15s ease-in-out;
                cursor: pointer; line-height: 1.5; min-width: 100px;
            }
            .custom-filter-btn:hover { background-color: #6B7280; }

            /* NOVO: Estilo para o botão quando o filtro está ativo */
            .custom-filter-btn.active {
                background-color: #047857; /* Tom de verde escuro */
                color: #FFFFFF;
                border-color: #34D399;
                box-shadow: 0 0 5px rgba(16, 185, 129, 0.5);
            }

            .count-badge-inside {
                display: inline-block; padding: 1px 6px; font-size: 0.75rem;
                font-weight: bold; border-radius: 10px; min-width: 18px;
                text-align: center; background-color: #374151; color: #6B7280;
                transition: all 0.15s ease-in-out;
            }
            .count-badge-inside.non-zero {
                background-color: #059669; /* Tom de verde */
                color: #FFFFFF;
            }
            /* NOVO: Inverte as cores do contador quando o botão está ativo */
            .custom-filter-btn.active .count-badge-inside {
                 background-color: #FFFFFF; color: #047857;
            }
        </style>
    `;
    if (document.getElementById('custom-filter-styles-v21-civeis')) {
        document.getElementById('custom-filter-styles-v21-civeis').remove();
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

            // MELHORIA: Adiciona margem à esquerda para criar separação de grupo
            if (filter === '[f] audiencia') {
                buttonWrapper.style.marginLeft = '16px';
            }

            buttonWrapper.innerHTML = `
                <button id="btn-${elementId}" class="custom-filter-btn">
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
                    // NOVO: Lógica de toggle - se o filtro já for este, limpa. Senão, aplica.
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

    /**
     * NOVO: Função para atualizar o estado visual (ativo/inativo) dos botões
     */
    function updateActiveButtonState() {
        if (!window.myTable || !window.myTable.datatable) return;
        const currentFilter = window.myTable.datatable.search();

        filters.forEach(filter => {
            const elementId = filter.replace(/\[|\]|#|\s/g, '');
            const button = document.getElementById(`btn-${elementId}`);
            if (button) {
                // Adiciona ou remove a classe 'active' se o filtro do botão for o mesmo da busca
                button.classList.toggle('active', currentFilter === filter);
            }
        });
    }

    // --- INÍCIO DA ADIÇÃO: LÓGICA DE CORES <MARK> ---

    // 1. Mapa de cores por TÍTULO
    const titleColorMap = {
      "Representação Integral": "#90EE90",       // Verde claro
      "Representação Extraordinária": "#DDA0DD", // Roxo claro
      "Entidade Extinta": "#F08080"        // Vermelho claro
    };
    
    // 2. Cor para o TEXTO específico
    const textToFind = 'DE 2025';
    const textColor = '#FF7F50'; // Coral (como solicitado)
    
    /**
     * Aplica cores personalizadas às tags <mark> dentro da tabela
     */
    function aplicarCoresMark() {
        // Seleciona apenas as tags <mark> dentro da tabela para melhor performance
        document.querySelectorAll('#tabela mark').forEach(mark => {
            
            // 4. Verifica o texto primeiro
            if (mark.innerText.trim() === textToFind) {
                mark.style.backgroundColor = textColor;
            } 
            // 5. Se não for, verifica o title
            else {
                const titleColor = titleColorMap[mark.title];
                if (titleColor) {
                    mark.style.backgroundColor = titleColor;
                }
            }
        });
    }

    // --- FIM DA ADIÇÃO: LÓGICA DE CORES <MARK> ---


    const observer = new MutationObserver(function (mutations, obs) {
        if (document.getElementById('tabela_wrapper')) {
            if (window.myTable && window.myTable.datatable) {
                const table = window.myTable.datatable;
                table.off('draw.dt'); // Evita múltiplos listeners
                table.on('draw.dt', function() {
                    // Funções que rodam a cada redesenho da tabela
                    createAndInsertButtons();
                    updateFilterCounts();
                    updateActiveButtonState(); // NOVO: Atualiza destaque do botão
                    // --- INÍCIO DA ADIÇÃO: CHAMADA DA FUNÇÃO ---
                    aplicarCoresMark();
                    // --- FIM DA ADIÇÃO: CHAMADA DA FUNÇÃO ---
                });

                // Execução inicial
                createAndInsertButtons();
                updateFilterCounts();
                updateActiveButtonState(); // NOVO: Define o estado inicial do botão
                // --- INÍCIO DA ADIÇÃO: CHAMADA DA FUNÇÃO ---
                aplicarCoresMark();
                // --- FIM DA ADIÇÃO: CHAMADA DA FUNÇÃO ---
            }
            obs.disconnect(); // Para de observar após encontrar e configurar a tabela
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();


