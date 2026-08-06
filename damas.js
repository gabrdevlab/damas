    // ═══════════════════════════════════════════════
    //  Damas Internacional — 10x10
    // ═══════════════════════════════════════════════

    const N = 10; // tamanho do tabuleiro

    // ── Estado global ────────────────────────────────
    let board = [];          // board[l][c] = null | { cor:'b'|'p', dama:bool }
    let vez = 'b';           // 'b' = brancas, 'p' = pretas
    let selecionada = null;  // { l, c }
    let movimentosValidos = [];
    let capturadas = { b: [], p: [] };
    let pilha = [];          // histórico para desfazer
    let jogoAtivo = true;
    let ultimoMov = null;   // { de:{l,c}, para:{l,c} }

    // ── Referências DOM ──────────────────────────────
    const elTabuleiro  = document.getElementById('tabuleiro');
    const elVez        = document.getElementById('vez');
    const elMsg        = document.getElementById('msg');
    const elCapB       = document.getElementById('capB');
    const elCapP       = document.getElementById('capP');
    const btnNovo      = document.getElementById('btnNovo');
    const btnDesfazer  = document.getElementById('btnDesfazer');

    // ════════════════════════════════════════════════
    //  INICIALIZAÇÃO
    // ════════════════════════════════════════════════

    function novoJogo() {
    board = Array.from({ length: N }, () => Array(N).fill(null));

    // Pretas: linhas 0-3, casas escuras (l+c ímpar)
    for (let l = 0; l < 4; l++)
        for (let c = 0; c < N; c++)
        if ((l + c) % 2 === 1) board[l][c] = { cor: 'p', dama: false };

    // Brancas: linhas 6-9, casas escuras
    for (let l = 6; l < N; l++)
        for (let c = 0; c < N; c++)
        if ((l + c) % 2 === 1) board[l][c] = { cor: 'b', dama: false };

    vez = 'b';
    selecionada = null;
    movimentosValidos = [];
    capturadas = { b: [], p: [] };
    pilha = [];
    jogoAtivo = true;
    ultimoMov = null;

    render();
    setMsg('Selecione uma peça.');
    atualizarCapturadas();
    btnDesfazer.disabled = true;
    }

    // ════════════════════════════════════════════════
    //  LÓGICA DE MOVIMENTOS
    // ════════════════════════════════════════════════

    const oponente = cor => cor === 'b' ? 'p' : 'b';

    function dentro(l, c) {
    return l >= 0 && l < N && c >= 0 && c < N;
    }

    /**
     * Retorna todas as sequências de captura disponíveis para a peça em (l,c).
     * Cada resultado: { l, c, capturas: [{l,c}] }
     */
    function capturasDe(l, c, b, jaCapturadas = []) {
    const peca = b[l][c];
    if (!peca) return [];

    const op = oponente(peca.cor);
    const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const resultados = [];

    for (const [dl, dc] of dirs) {
        if (peca.dama) {
        // Dama voa: encontra inimigo na diagonal, aterrissa após ele
        let nl = l + dl, nc = c + dc;
        let inimL = -1, inimC = -1;

        while (dentro(nl, nc)) {
            const alvo = b[nl][nc];

            if (alvo) {
            const jaContada = jaCapturadas.some(v => v.l === nl && v.c === nc);
            if (alvo.cor === op && inimL === -1 && !jaContada) {
                inimL = nl; inimC = nc; // marcou o inimigo, continua buscando aterrissagem
            } else {
                break; // bloqueado
            }
            } else if (inimL !== -1) {
            // Casa livre após inimigo: aterrissagem válida
            const nb = clonar(b);
            nb[inimL][inimC] = null;
            nb[nl][nc] = nb[l][c];
            nb[l][c] = null;

            const novasCapt = [...jaCapturadas, { l: inimL, c: inimC }];
            const continuacoes = capturasDe(nl, nc, nb, novasCapt);

            if (continuacoes.length > 0) {
                for (const cont of continuacoes)
                resultados.push({ l: nl, c: nc, capturas: [{ l: inimL, c: inimC }, ...cont.capturas] });
            } else {
                resultados.push({ l: nl, c: nc, capturas: [{ l: inimL, c: inimC }] });
            }
            }

            nl += dl; nc += dc;
        }
        } else {
        // Peão: salta exatamente 1 inimigo, aterrissa 2 casas à frente
        const ml = l + dl,   mc = c + dc;   // casa do inimigo
        const al = l + 2*dl, ac = c + 2*dc; // aterrissagem

        if (!dentro(ml, mc) || !dentro(al, ac)) continue;

        const meio = b[ml][mc];
        const jaContada = jaCapturadas.some(v => v.l === ml && v.c === mc);

        if (meio && meio.cor === op && !jaContada && !b[al][ac]) {
            const nb = clonar(b);
            nb[ml][mc] = null;
            nb[al][ac] = nb[l][c];
            nb[l][c] = null;

            const novasCapt = [...jaCapturadas, { l: ml, c: mc }];
            const continuacoes = capturasDe(al, ac, nb, novasCapt);

            if (continuacoes.length > 0) {
            for (const cont of continuacoes)
                resultados.push({ l: al, c: ac, capturas: [{ l: ml, c: mc }, ...cont.capturas] });
            } else {
            resultados.push({ l: al, c: ac, capturas: [{ l: ml, c: mc }] });
            }
        }
        }
    }

    return resultados;
    }

    /**
     * Movimentos simples (sem captura).
     */
    function movimentosSimples(l, c) {
    const peca = board[l][c];
    if (!peca) return [];
    const movs = [];

    if (peca.dama) {
        for (const [dl, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        let nl = l + dl, nc = c + dc;
        while (dentro(nl, nc) && !board[nl][nc]) {
            movs.push({ l: nl, c: nc, capturas: [] });
            nl += dl; nc += dc;
        }
        }
    } else {
        // Peão só avança (brancas sobem = dl:-1, pretas descem = dl:+1)
        const frente = peca.cor === 'b' ? -1 : 1;
        for (const dc of [-1, 1]) {
        const nl = l + frente, nc = c + dc;
        if (dentro(nl, nc) && !board[nl][nc])
            movs.push({ l: nl, c: nc, capturas: [] });
        }
    }

    return movs;
    }

    /**
     * Verifica se qualquer peça da cor tem captura disponível.
     */
    function temCaptura(cor) {
    for (let l = 0; l < N; l++)
        for (let c = 0; c < N; c++)
        if (board[l][c]?.cor === cor && capturasDe(l, c, board).length > 0)
            return true;
    return false;
    }

    /**
     * Retorna os movimentos legais para (l,c), respeitando captura obrigatória.
     */
    function movimentosLegais(l, c) {
    const peca = board[l][c];
    if (!peca || peca.cor !== vez) return [];

    const capturas = capturasDe(l, c, board);
    if (capturas.length > 0) return capturas;      // há capturas: só capturas
    if (temCaptura(vez)) return [];                 // outro pode capturar: bloqueia
    return movimentosSimples(l, c);
    }

    // ════════════════════════════════════════════════
    //  APLICAR MOVIMENTO
    // ════════════════════════════════════════════════

    function clonar(b) {
    return b.map(row => row.map(p => p ? { ...p } : null));
    }

    function snapshot() {
    return {
        board: clonar(board),
        vez,
        capturadas: { b: [...capturadas.b], p: [...capturadas.p] },
        ultimoMov: ultimoMov ? { ...ultimoMov } : null,
        jogoAtivo,
    };
    }

    function restaurar(s) {
    board     = clonar(s.board);
    vez       = s.vez;
    capturadas = { b: [...s.capturadas.b], p: [...s.capturadas.p] };
    ultimoMov = s.ultimoMov ? { ...s.ultimoMov } : null;
    jogoAtivo = s.jogoAtivo;
    selecionada = null;
    movimentosValidos = [];
    }

    function aplicarMov(l, c, mv) {
    pilha.push(snapshot());

    const peca = board[l][c];

    // Remove peças capturadas do tabuleiro
    for (const cap of mv.capturas) {
        capturadas[vez].push(board[cap.l][cap.c]);
        board[cap.l][cap.c] = null;
    }

    // Move a peça
    board[mv.l][mv.c] = peca;
    board[l][c] = null;

    // Promoção a dama ao atingir a última linha
    const linhaFinal = vez === 'b' ? 0 : N - 1;
    if (!peca.dama && mv.l === linhaFinal)
        board[mv.l][mv.c].dama = true;

    ultimoMov = { de: { l, c }, para: { l: mv.l, c: mv.c } };
    vez = oponente(vez);
    selecionada = null;
    movimentosValidos = [];
    }

    // ════════════════════════════════════════════════
    //  FIM DE JOGO
    // ════════════════════════════════════════════════

    function verificarFim() {
    let temMov = false;
    for (let l = 0; l < N && !temMov; l++)
        for (let c = 0; c < N && !temMov; c++)
        if (board[l][c]?.cor === vez && movimentosLegais(l, c).length > 0)
            temMov = true;

    if (!temMov) {
        jogoAtivo = false;
        const venc = vez === 'b' ? 'VERMELHAS' : 'BRANCAS';
        setMsg(`🏆 Vitória das ${venc}!`);
        return;
    }

    const nomeVez = vez === 'b' ? 'Brancas' : 'Vermelhas';
    const obrig   = temCaptura(vez) ? ' (captura obrigatória)' : '';
    setMsg(`Vez de ${nomeVez}${obrig}.`);
    }

    // ════════════════════════════════════════════════
    //  INTERAÇÃO — CLIQUE
    // ════════════════════════════════════════════════

    function handleClick(l, c) {
    if (!jogoAtivo) return;

    // Clicou em destino válido → executa o movimento
    const mv = movimentosValidos.find(m => m.l === l && m.c === c);
    if (selecionada && mv) {
        aplicarMov(selecionada.l, selecionada.c, mv);
        render();
        verificarFim();
        atualizarCapturadas();
        btnDesfazer.disabled = pilha.length === 0;
        return;
    }

    // Clicou em peça própria → seleciona
    const peca = board[l][c];
    if (peca && peca.cor === vez) {
        selecionada = { l, c };
        movimentosValidos = movimentosLegais(l, c);
        render();
        return;
    }

    // Clicou em lugar inválido → desseleciona
    selecionada = null;
    movimentosValidos = [];
    render();
    }

    // ════════════════════════════════════════════════
    //  RENDERIZAÇÃO
    // ════════════════════════════════════════════════

    function render() {
    elTabuleiro.innerHTML = '';

    for (let l = 0; l < N; l++) {
        for (let c = 0; c < N; c++) {
        const casa = document.createElement('div');
        casa.className = 'casa ' + ((l + c) % 2 === 0 ? 'clara' : 'escura');

        // Peça selecionada
        if (selecionada?.l === l && selecionada?.c === c)
            casa.classList.add('destaque');

        // Último movimento
        if (ultimoMov) {
            const { de, para } = ultimoMov;
            if ((de.l === l && de.c === c) || (para.l === l && para.c === c))
            casa.classList.add('ultimo');
        }

        // Destinos válidos
        const mv = movimentosValidos.find(m => m.l === l && m.c === c);
        if (mv)
            casa.classList.add(mv.capturas.length > 0 ? 'pode-capturar' : 'pode-mover');

        // Peça
        const peca = board[l][c];
        if (peca) {
            const el = document.createElement('div');
            el.className = 'peca ' + (peca.cor === 'b' ? 'branca' : 'preta') + (peca.dama ? ' dama' : '');
            casa.appendChild(el);
        }

        casa.addEventListener('click', () => handleClick(l, c));
        elTabuleiro.appendChild(casa);
        }
    }

    // Atualiza indicador de vez
    elVez.textContent = vez === 'b' ? 'BRANCAS' : 'VERMELHAS';
    elVez.className   = 'vez-valor ' + (vez === 'b' ? 'brancas' : 'pretas');
    }

    // ════════════════════════════════════════════════
    //  UTILITÁRIOS DE UI
    // ════════════════════════════════════════════════

    function setMsg(texto) {
    elMsg.textContent = texto;
    }

    function atualizarCapturadas() {
    elCapB.textContent = capturadas.b.map(p => p.dama ? '♛' : '●').join(' ') || '—';
    elCapP.textContent = capturadas.p.map(p => p.dama ? '♛' : '●').join(' ') || '—';
    }

    // ════════════════════════════════════════════════
    //  EVENTOS
    // ════════════════════════════════════════════════

    btnNovo.addEventListener('click', novoJogo);

    btnDesfazer.addEventListener('click', () => {
    if (pilha.length === 0) return;
    restaurar(pilha.pop());
    jogoAtivo = true;
    render();
    atualizarCapturadas();
    setMsg('Jogada desfeita.');
    btnDesfazer.disabled = pilha.length === 0;
    });

    // ── Inicia ──────────────────────────────────────
    novoJogo();