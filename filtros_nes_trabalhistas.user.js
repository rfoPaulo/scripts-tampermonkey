// ==UserScript==
// @name         Filtros Rápidos para NEs Trabalhistas (v1.8.2)
// @namespace    http://tampermonkey.net/
// @version      1.8.2
// @description  Adiciona botões de filtro que grudam no topo da página. Botão de rolagem removido.
// @author       Paulo (modificado por Gemini)
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
     * VERSÃO 1.8.2 - Removido o botão de rolagem para o topo.
     */

    const filters = [
        '#proc',
        '[exprovas] [n] #pge',
        '[corag]',
        'graficas]',
        '[audiencia] [s]',
        '[pauta] [s]',
        '[pauta] [n] #pge_repint',
        '[audiencia] [n] #pge_repint',
        '[audiencia] [n] #PGE_Extinta',
        '[pauta] [n] #PGE_Extinta'
    ];

    const customCSS = `
        <style id="custom-filter-styles-v18-2">
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
                gap: 8px; background-color: #4B5563; color: #F3F4F6;
                border: none; padding: 5px 8px; font-size: 0.8rem;
                font-weight: 500; border-radius: 0.375rem;
                transition: background-color 0.15s ease-in-out;
                cursor: pointer; line-height: 1.5; min-width: 100px;
            }
            .custom-filter-btn:hover { background-color: #6B7280; }
            .count-badge-inside {
                display: inline-block; padding: 1px 6px; font-size: 0.75rem;
                font-weight: bold; border-radius: 10px; min-width: 18px;
                text-align: center; background-color: #374151; color: #6B7280;
            }
            .count-badge-inside.non-zero { background-color: #3B82F6; color: #FFFFFF; }

            /* Estilos do botão flutuante removidos */

        </style>
    `;
    if (document.getElementById('custom-filter-styles-v18-2')) {
        document.getElementById('custom-filter-styles-v18-2').remove();
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
                    window.myTable.datatable.search(filter).draw();
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
        table.search(originalSearchTerm);
    }

    // --- FUNÇÃO "createAndManageScrollButton" REMOVIDA ---

    // --- Execução ---
    // A chamada para criar o botão de rolagem foi removida daqui.

    const observer = new MutationObserver(function (mutations, obs) {
        if (document.getElementById('tabela_wrapper')) {
            if (window.myTable && window.myTable.datatable) {
                const table = window.myTable.datatable;
                table.off('draw.dt');
                table.on('draw.dt', function() {
                    createAndInsertButtons();
                    updateFilterCounts();
                });
                createAndInsertButtons();
                updateFilterCounts();
            }
            obs.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();