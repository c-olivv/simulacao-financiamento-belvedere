// Endpoint do SheetMonkey
const ENDPOINT_SHEETMONKEY = "https://api.sheetmonkey.io/form/v5HTKnEFHJkrhqmVCAhDi1";

// ==========================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO E MÁSCARAS
// ==========================================

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function converterMoedaParaFloat(texto) {
    if (!texto) return 0;
    const apenasNumeros = texto.replace(/\D/g, '');
    return parseFloat(apenasNumeros) / 100 || 0;
}

function aplicarMascaraMoeda(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor === '') {
        input.value = '';
        return;
    }
    const valorFloat = parseFloat(valor) / 100;
    input.value = valorFloat.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function aplicarMascaraTelefone(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.slice(0, 11);

    if (valor.length > 10) {
        input.value = valor.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (valor.length > 6) {
        input.value = valor.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (valor.length > 2) {
        input.value = valor.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    } else {
        input.value = valor;
    }
}

// ==========================================
// CÁLCULOS FINANCEIROS
// ==========================================

function calcularSAC(valorFinanciado, taxaMensal, prazoMeses) {
    const amortizacaoConstante = valorFinanciado / prazoMeses;
    const primeiraParcelaBase = amortizacaoConstante + (valorFinanciado * taxaMensal);
    const ultimaParcelaBase = amortizacaoConstante + (amortizacaoConstante * taxaMensal);

    return {
        primeiraParcela: primeiraParcelaBase,
        ultimaParcela: ultimaParcelaBase
    };
}

function calcularPrice(valorFinanciado, taxaMensal, prazoMeses) {
    const fator = Math.pow(1 + taxaMensal, prazoMeses);
    const parcelaFixa = valorFinanciado * ((taxaMensal * fator) / (fator - 1));

    return {
        primeiraParcela: parcelaFixa,
        ultimaParcela: parcelaFixa
    };
}

// ==========================================
// PROCESSAMENTO DO FORMULÁRIO
// ==========================================

async function processarSimulacao(e) {
    e.preventDefault();

    const imovelElemento = document.getElementById('imovelReferencia');
    const imovelReferencia = imovelElemento ? imovelElemento.value : 'Geral';

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const telefone = document.getElementById('telefone').value;
    
    const renda = converterMoedaParaFloat(document.getElementById('renda').value);
    const valorImovel = converterMoedaParaFloat(document.getElementById('valorImovel').value);
    const valorEntrada = converterMoedaParaFloat(document.getElementById('valorEntrada').value);
    
    const prazoAnos = parseInt(document.getElementById('prazoAnos').value, 10);
    const sistema = document.getElementById('sistema').value;
    const taxaAnual = parseFloat(document.getElementById('taxaAnual').value);

    // Validação da Entrada Mínima (20%)
    const entradaMinima = valorImovel * 0.20;
    const entradaAbaixoDoMinimo = valorEntrada < entradaMinima;

    let valorFinanciado = valorImovel - valorEntrada;
    if (valorFinanciado <= 0) valorFinanciado = 0;

    const prazoMeses = prazoAnos * 12;
    const taxaMensal = (taxaAnual / 100) / 12;

    const encargoEstimado = (valorFinanciado * 0.00025) + (valorImovel * 0.00005) + 25.00;

    let resultado;
    if (sistema === 'SAC') {
        resultado = calcularSAC(valorFinanciado, taxaMensal, prazoMeses);
    } else {
        resultado = calcularPrice(valorFinanciado, taxaMensal, prazoMeses);
    }

    const primeiraParcelaTotal = resultado.primeiraParcela + encargoEstimado;
    const ultimaParcelaTotal = resultado.ultimaParcela + encargoEstimado;

    const limiteRenda = renda * 0.30;
    const excedeRenda = primeiraParcelaTotal > limiteRenda;

    const cardsContainer = document.getElementById('cardsContainer');
    cardsContainer.innerHTML = `
        <div class="card">
            <div class="card-label">Valor Financiado</div>
            <div class="card-value">${formatarMoeda(valorFinanciado)}</div>
        </div>
        <div class="card">
            <div class="card-label">Sistema / Prazo</div>
            <div class="card-value" style="font-size: 1rem; margin-top: 5px;">${sistema} (${prazoMeses} meses)</div>
        </div>
        <div class="card" style="border-left-color: ${excedeRenda ? '#dc3545' : '#28a745'};">
            <div class="card-label">1ª Parcela Estimada</div>
            <div class="card-value" style="color: ${excedeRenda ? '#dc3545' : '#28a745'};">${formatarMoeda(primeiraParcelaTotal)}</div>
        </div>
        <div class="card">
            <div class="card-label">${sistema === 'SAC' ? 'Última Parcela Estimada' : 'Parcela Fixa Estimada'}</div>
            <div class="card-value">${formatarMoeda(ultimaParcelaTotal)}</div>
        </div>
    `;

    if (entradaAbaixoDoMinimo) {
        cardsContainer.innerHTML += `
            <div style="grid-column: 1 / -1; background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; padding: 12px 15px; border-radius: 6px; font-size: 0.9rem; margin-top: 10px;">
                ⚠️ <strong>Atenção:</strong> A entrada informada (${formatarMoeda(valorEntrada)}) é menor que os 20% recomendados pelas regras bancárias (${formatarMoeda(entradaMinima)}). Fale com nosso consultor no WhatsApp para analisar opções.
            </div>
        `;
    }

    if (excedeRenda) {
        cardsContainer.innerHTML += `
            <div style="grid-column: 1 / -1; background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; padding: 12px 15px; border-radius: 6px; font-size: 0.9rem; margin-top: 10px;">
                ⚠️ <strong>Atenção:</strong> A 1ª parcela excede 30% da renda informada (${formatarMoeda(limiteRenda)}). Fale com nosso consultor no WhatsApp para verificar composição de renda.
            </div>
        `;
    }

    const mensagemWhatsApp = encodeURIComponent(
        `Olá! Me chamo ${nome}. Fiz uma simulação para o ${imovelReferencia} no valor de ${formatarMoeda(valorImovel)} (Entrada: ${formatarMoeda(valorEntrada)}) e gostaria de prosseguir com a análise.`
    );
    document.getElementById('linkWhatsapp').href = `https://wa.me/5524988114415?text=${mensagemWhatsApp}`;

    document.getElementById('resultado').style.display = 'block';
    document.getElementById('resultado').scrollIntoView({ behavior: 'smooth' });

    const dadosLead = {
        imovelReferencia: imovelReferencia,
        nome: nome,
        email: email,
        telefone: telefone,
        renda: renda,
        valorImovel: valorImovel,
        valorEntrada: valorEntrada,
        valorFinanciado: valorFinanciado,
        prazoAnos: prazoAnos,
        sistema: sistema,
        primeiraParcela: primeiraParcelaTotal.toFixed(2),
        ultimaParcela: ultimaParcelaTotal.toFixed(2),
        entradaAbaixoDoMinimo: entradaAbaixoDoMinimo ? "SIM" : "NÃO",
        comprometeuRenda: excedeRenda ? "SIM" : "NÃO",
        dataHora: new Date().toLocaleString('pt-BR')
    };

    try {
        await fetch(ENDPOINT_SHEETMONKEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosLead)
        });
    } catch (err) {
        console.error("Erro ao salvar lead:", err);
    }
}

// ==========================================
// VINCULAÇÃO DOS EVENTOS (DOM LOADED)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const camposMoeda = ['renda', 'valorImovel', 'valorEntrada'];
    camposMoeda.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // Se já contiver valor no HTML, aplica a formatação logo na carga
            if (input.value && !input.value.startsWith('R$')) {
                // Caso venha numérico puro
                let num = parseFloat(input.value) || 0;
                input.value = num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
            input.addEventListener('input', (e) => aplicarMascaraMoeda(e.target));
        }
    });

    const inputTelefone = document.getElementById('telefone');
    if (inputTelefone) {
        inputTelefone.addEventListener('input', (e) => aplicarMascaraTelefone(e.target));
    }
    
// ==========================================
// LÓGICA DO CARROSSEL E MODAL (CORRIGIDA)
// ==========================================

let slideIndex = 0;

function obterElementosCarrossel() {
    return {
        slides: document.getElementsByClassName("carousel-slide"),
        track: document.getElementById("carouselTrack"),
        dotsContainer: document.getElementById("carouselDots")
    };
}

function inicializarCarrossel() {
    const { slides, track, dotsContainer } = obterElementosCarrossel();
    if (!track || slides.length === 0) return;
    
    // Gera as bolinhas indicadoras
    if (dotsContainer) {
        dotsContainer.innerHTML = "";
        for (let i = 0; i < slides.length; i++) {
            const dot = document.createElement("span");
            dot.classList.add("dot");
            if (i === 0) dot.classList.add("active");
            dot.onclick = () => irParaSlide(i);
            dotsContainer.appendChild(dot);
        }
    }
    atualizarCarrossel();
}

function atualizarCarrossel() {
    const { slides, track } = obterElementosCarrossel();
    if (!track || slides.length === 0) return;

    // Garante que o índice fique dentro dos limites
    if (slideIndex >= slides.length) slideIndex = 0;
    if (slideIndex < 0) slideIndex = slides.length - 1;

    // Move o trilho de imagens
    track.style.transform = `translateX(-${slideIndex * 100}%)`;
    
    // Atualiza as bolinhas ativas
    const dots = document.getElementsByClassName("dot");
    for (let i = 0; i < dots.length; i++) {
        dots[i].classList.remove("active");
    }
    if (dots[slideIndex]) {
        dots[slideIndex].classList.add("active");
    }
}

// Declaradas no escopo global para o onclick do HTML encontrar
window.mudarSlide = function(direcao) {
    const { slides } = obterElementosCarrossel();
    if (slides.length === 0) return;
    
    slideIndex += direcao;
    atualizarCarrossel();
};

window.irParaSlide = function(index) {
    slideIndex = index;
    atualizarCarrossel();
};

window.abrirModal = function(src) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("imgModalExpanded");
    if (modal && modalImg) {
        modal.style.display = "flex";
        modalImg.src = src;
    }
};

window.fecharModal = function() {
    const modal = document.getElementById("imageModal");
    if (modal) {
        modal.style.display = "none";
    }
};

// ==========================================
// VINCULAÇÃO DOS EVENTOS (DOM LOADED)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o carrossel
    inicializarCarrossel();

    // Outras inicializações (Máscaras de Moeda e Telefone)
    const camposMoeda = ['renda', 'valorImovel', 'valorEntrada'];
    camposMoeda.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            if (input.value && !input.value.startsWith('R$')) {
                let num = parseFloat(input.value) || 0;
                input.value = num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
            input.addEventListener('input', (e) => aplicarMascaraMoeda(e.target));
        }
    });

    const inputTelefone = document.getElementById('telefone');
    if (inputTelefone) {
        inputTelefone.addEventListener('input', (e) => aplicarMascaraTelefone(e.target));
    }
});
