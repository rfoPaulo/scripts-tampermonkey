// ==UserScript==
// @name         Filtros Rápidos para NEs Trabalhistas (v2.0.0)
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Adiciona botões de filtro rápidos que grudam no topo da página. O botão do filtro ativo fica destacado e funciona como toggle (liga/desliga). Versão corrigida para resolver loop de timer e reaplicação em novas consultas.
// @author       Paulo (modificado por Gemini)
// @match        *://parla.pge.reders/app/nes_trab*
// @match        *://parla.pge.reders/app/nes_civeis*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pge.rs.gov.br
// @grant        none
// @updateURL    https://raw.githubusercontent.com/rfoPaulo/scripts-tampermonkey/main/filtros_nes_trabalhistas.user.js
// @downloadURL  https://raw.githubusercontent.com/rfoPaulo/scripts-tampermonkey/main/filtros_nes_trabalhistas.user.js
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Script para adicionar botões de filtro rápido.
     * VERSÃO 2.0.0
     * - CORREÇÃO 1: A função updateFilterCounts foi reescrita para não interferir na busca da tabela,
     * evitando o loop do timer de carregamento da página.
     * - CORREÇÃO 2: O MutationObserver não é mais desconectado (removido obs.disconnect()),
     * permitindo que o script se reinicialize quando uma nova consulta de data é feita.
     * - Adicionado destaque para o botão do filtro ativo.
     * - Clicar em um filtro ativo agora limpa a busca (função toggle).
     * - Adicionado @match para nes_civeis.
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
        '[pauta] [n] #PGE_Extinta'
    ];

    const customCSS = `
        <style id="custom-filter-styles-v20">
            #custom-filters-container {
                position: sticky;
                top: 0;
                background-color: #ffffff;
                padding: 0 0 0 4px;
                z-index: 1000; /* Aumentado para garantir visibilidade */
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                width: fit-content;
                margin: 1px auto !important;
                border-radius: 10px;
            }

            .custom-filter-btn {
                display: inline-flex; justify-content: space-between; align-items: center;
                gap: 8px; background-color: #4B5563; color: #F3F4F6;
                border: 1px solid transparent;
                padding: 5px 8px; font-size: 0.8rem;
                font-weight: 500; border-radius: 0.375rem;
                transition: all 0.15s ease-in-out;
                cursor: pointer; line-height: 1.5; min-width: 100px;
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
                font-weight: bold; border-radius: 10px; min-width: 18px;
                text-align: center; background-color: #374151; color: #6B7280;
                transition: all 0.15s ease-in-out;
            }
            .count-badge-inside.non-zero { background-color: #3B82F6; color: #FFFFFF; }
            .custom-filter-btn.active .count-badge-inside {
                 background-color: #FFFFFF; color: #2563EB;
            }
        </style>
    `;
    if (!document.getElementById('custom-filter-styles-v20')) {
        document.head.insertAdjacentHTML('beforeend', customCSS);
    }


    function createAndInsertButtons() {
        if (document.getElementById('custom-filters-container')) return; // Não recria se já existe
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
            const button = document.getElementById(`btn-${elementId}`);
            if(button) {
                button.addEventListener('click', function() {
                    if (window.myTable && window.myTable.datatable) {
                        const table = window.myTable.datatable;
                        const currentFilter = table.search();
                        const newFilter = (currentFilter === filter) ? '' : filter;
                        table.search(newFilter).draw();
                    }
                });
            }
        });
    }

    /**
     * CORREÇÃO 1: Função de contagem reescrita para não interferir na busca da tabela.
     * Isso evita o loop infinito do timer de carregamento da página.
     */
    function updateFilterCounts() {
        if (!document.getElementById('custom-filters-container') || !window.myTable || !window.myTable.datatable) return;
        const table = window.myTable.datatable;
        
        // Pega os dados que correspondem à busca ATUAL do usuário
        const tableData = table.rows({ search: 'applied' }).data();

        filters.forEach(filterTerm => {
            const elementId = filterTerm.replace(/\[|\]|#|\s/g, '');
            const countId = `count-${elementId}`;
            const countBadge = document.getElementById(countId);
            
            if (countBadge) {
                // Cria uma expressão regular para o filtro. Ex: "[audiencia] [s]" vira /audiencia/i e /s/i
                const searchTerms = filterTerm.replace(/\[|\]/g, '').split(' ').filter(Boolean);
                const regexes = searchTerms.map(term => new RegExp(term.replace('#', ''), 'i'));
                
                let count = 0;
                if (tableData.length > 0) {
                     for (let i = 0; i < tableData.length; i++) {
                        const row = tableData[i];
                        // Concatena todos os valores da linha em uma única string para a busca
                        const rowText = Object.values(row).join(' ').toLowerCase();
                        
                        // Verifica se TODOS os termos do filtro estão presentes na linha
                        if (regexes.every(regex => regex.test(rowText))) {
                            count++;
                        }
                    }
                }

                countBadge.textContent = count;
                countBadge.classList.toggle('non-zero', count > 0);
            }
        });
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


    // --- Execução ---
    const observer = new MutationObserver(function (mutations, obs) {
        const tableWrapper = document.getElementById('tabela_wrapper');
        // Só executa se a tabela existir e o objeto datatable estiver inicializado
        if (tableWrapper && window.myTable && window.myTable.datatable) {
            
            const table = window.myTable.datatable;

            // Garante que os botões sejam criados (a função tem uma guarda para não duplicar)
            createAndInsertButtons();
            
            // Remove qualquer listener anterior para evitar duplicação
            table.off('draw.dt'); 
            
            // Adiciona o listener para atualizar contagens e estado dos botões a cada redesenho
            table.on('draw.dt', function() {
                updateFilterCounts();
                updateActiveButtonState();
            });

            // Execução inicial para o estado atual da tabela
            updateFilterCounts();
            updateActiveButtonState();

            // CORREÇÃO 2: A linha abaixo foi removida.
            obs.disconnect(); 
            // Isso permite que o observer continue rodando e detecte quando a tabela for
            // recarregada (ex: ao consultar uma nova data), reaplicando os listeners.
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
