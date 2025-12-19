// --- 1. VARIÁVEIS GLOBAIS E CONFIGURAÇÃO ---
let chart1 = null;

// Constantes Físicas
const h = 6.626e-34;
const c = 3.0e8;
const k = 1.38e-23;
const b_wien = 2.898e-3;
// --- CORES DAS ESTRELAS (Para Etapa 3) ---
const CORES_CLASSES = {
    'O': '#6b8cff', // Azul forte
    'B': '#9db4ff', // Azul claro
    'A': '#cad8ff', // Branco azulado
    'F': '#fff4e8', // Branco creme
    'G': '#ffd700', // Amarelo (Gold)
    'K': '#ff9d00', // Laranja
    'M': '#ff5533'  // Vermelho
};

// --- CORREÇÃO DE NITIDEZ ---

// 1. Força a resolução máxima (Isso tira o serrilhado das letras inclinadas)
Chart.defaults.devicePixelRatio = window.devicePixelRatio || 2;

// 2. Configura APENAS os Títulos dos Eixos (Vertical e Horizontal)
// Não mexe nos números nem nas legendas, só no "Intensidade Relativa", etc.
Chart.defaults.scale.title.font = {
    family: "'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif", // Fontes de sistema renderizam melhor
    size: 13,       // Tamanho sutil (padrão é 12, 13 ajuda na leitura sem ficar gigante)
    weight: '500',  // Peso médio (não é negrito, mas é mais firme que o normal)
    lineHeight: 1.2
};

// 3. Garante que a cor seja sólida (ajuda no contraste)
Chart.defaults.scale.title.color = '#e0e0e0';

// --- 2. FUNÇÕES DE FÍSICA ---

// Função de Planck
function planck(wavelength_nm, T_kelvin) {
    let wav_m = wavelength_nm * 1e-9;
    if (wav_m === 0 || T_kelvin === 0) return 0;
    
    let exp_val = (h * c) / (wav_m * k * T_kelvin);
    if (exp_val > 700) return 0; // Evita overflow
    
    let intensity = (2 * h * Math.pow(c, 2)) / (Math.pow(wav_m, 5) * (Math.exp(exp_val) - 1));
    return intensity;
}

function calcular_temp_por_pico(pico_nm) {
    let pico_m = pico_nm * 1e-9;
    if (pico_m === 0) return 0;
    return b_wien / pico_m;
}

function calcular_pico_wien(T_kelvin) {
    if (T_kelvin === 0) return 0;
    let lambda_max_m = b_wien / T_kelvin;
    return lambda_max_m * 1e9;
}

function get_classe_espectral(temp) {
    if (temp >= 30000) return "O";
    else if (temp >= 10000) return "B";
    else if (temp >= 7500) return "A";
    else if (temp >= 6000) return "F";
    else if (temp >= 5200) return "G";
    else if (temp >= 3700) return "K";
    else if (temp >= 2400) return "M";
    else return "M";
}

// Cria array de números (similar ao np.linspace do Python)
function linspace(start, end, num) {
    const step = (end - start) / (num - 1);
    const arr = [];
    for (let i = 0; i < num; i++) {
        arr.push(start + (step * i));
    }
    return arr;
}

// Gera cor RGBA baseada no comprimento de onda
// --- FUNÇÃO CORRIGIDA: Cores Vibrantes --- (saída em texto)
function wavelengthToColor(wavelength, alpha = 1.0) {
    let r, g, b;
    if (wavelength >= 380 && wavelength < 440) {
        r = -(wavelength - 440) / (440 - 380); g = 0.0; b = 1.0;
    } else if (wavelength >= 440 && wavelength < 490) {
        r = 0.0; g = (wavelength - 440) / (490 - 440); b = 1.0;
    } else if (wavelength >= 490 && wavelength < 510) {
        r = 0.0; g = 1.0; b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength >= 510 && wavelength < 580) {
        r = (wavelength - 510) / (580 - 510); g = 1.0; b = 0.0;
    } else if (wavelength >= 580 && wavelength < 645) {
        r = 1.0; g = -(wavelength - 645) / (645 - 580); b = 0.0;
    } else if (wavelength >= 645 && wavelength < 781) {
        r = 1.0; g = 0.0; b = 0.0;
    } else {
        return "rgba(0,0,0,0)";
    }
    
    // Retorna a cor com a opacidade solicitada (padrão 1.0 = totalmente vibrante)
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}


// --- FUNÇÃO AUXILIAR: CONVERTE COMPRIMENTO DE ONDA (nm) EM COR (RGB) ---
function wavelengthToRGB(Wavelength) {
    let Red, Green, Blue;

    if (Wavelength >= 380 && Wavelength < 440) {
        Red = -(Wavelength - 440) / (440 - 380);
        Green = 0.0;
        Blue = 1.0;
    } else if (Wavelength >= 440 && Wavelength < 490) {
        Red = 0.0;
        Green = (Wavelength - 440) / (490 - 440);
        Blue = 1.0;
    } else if (Wavelength >= 490 && Wavelength < 510) {
        Red = 0.0;
        Green = 1.0;
        Blue = -(Wavelength - 510) / (510 - 490);
    } else if (Wavelength >= 510 && Wavelength < 580) {
        Red = (Wavelength - 510) / (580 - 510);
        Green = 1.0;
        Blue = 0.0;
    } else if (Wavelength >= 580 && Wavelength < 645) {
        Red = 1.0;
        Green = -(Wavelength - 645) / (645 - 580);
        Blue = 0.0;
    } else if (Wavelength >= 645 && Wavelength <= 780) {
        Red = 1.0;
        Green = 0.0;
        Blue = 0.0;
    } else {
        Red = 0.0;
        Green = 0.0;
        Blue = 0.0;
    }

    // Fator de queda de intensidade nas bordas do espectro visível
    let factor;
    if (Wavelength >= 380 && Wavelength < 420) {
        factor = 0.3 + 0.7 * (Wavelength - 380) / (420 - 380);
    } else if (Wavelength >= 420 && Wavelength < 700) {
        factor = 1.0;
    } else if (Wavelength >= 700 && Wavelength <= 780) {
        factor = 0.3 + 0.7 * (780 - Wavelength) / (780 - 700);
    } else {
        factor = 0.0;
    }

    // Ajusta intensidade e converte para 0-255
    const R = Math.floor(Red * factor * 255);
    const G = Math.floor(Green * factor * 255);
    const B = Math.floor(Blue * factor * 255);

    return [R, G, B];
}
// --- 3. LÓGICA DO GRÁFICO (Etapa 1) ---

function atualizarGraficoEtapa1() {
    // Pegar valores dos inputs
    const pico_val = parseFloat(document.getElementById('pico_slider').value);
    const xmin = parseFloat(document.getElementById('xmin_slider').value);
    const xmax = parseFloat(document.getElementById('xmax_slider').value);

    // Atualizar textos na interface
    document.getElementById('val-pico').innerText = pico_val;
    document.getElementById('val-xmin').innerText = xmin;
    document.getElementById('val-xmax').innerText = xmax;

    // Cálculos
    const temperatura = calcular_temp_por_pico(pico_val);
    const classe = get_classe_espectral(temperatura);

    
    // Mostrar apenas Classe (Temperatura escondida para atividade)
    const spanClasse = document.getElementById('calc-classe');
    spanClasse.innerText = classe;



    // Gerar dados do gráfico
    const labels = linspace(xmin, xmax, 500); 
    const dadosFluxo = labels.map(wl => planck(wl, temperatura));
    const maxFluxo = Math.max(...dadosFluxo) || 1;
    const dadosNormalizados = dadosFluxo.map(v => v / maxFluxo);

    const ctx = document.getElementById('graficoEtapa1').getContext('2d');

    // Plugin para desenhar o espectro de cores no fundo
    const rainbowPlugin = {
        id: 'rainbowBackground',
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;
            
            // Limites da área de desenho (em pixels da tela)
            const xStart = xAxis.left;
            const xEnd = xAxis.right;
            const yTop = yAxis.top;
            const height = yAxis.bottom - yAxis.top;

            // Loop Pixel a Pixel (para suavidade infinita no zoom)
            for (let x = xStart; x <= xEnd; x++) {
                // 1. Descobre qual comprimento de onda está neste pixel X
                const wl = xAxis.getValueForPixel(x);
                
                // 2. Se for visível, desenha uma linha vertical de 1px
                if (wl >= 380 && wl <= 780) {
                    ctx.fillStyle = wavelengthToColor(wl, 0.85); // 0.85 = Cor vibrante
                    ctx.fillRect(x, yTop, 1, height);
                }
            }
        }
    };

    // Configuração das Letras (Classes Espectrais) no topo
    const classesTemp = [30000, 10000, 7500, 6000, 5200, 3700, 2400];
    const classesLabel = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
    const annotationsClasses = {};

    classesTemp.forEach((temp, i) => {
        const wl = calcular_pico_wien(temp);
        if (wl >= xmin && wl <= xmax) {
            // Letra
            annotationsClasses[`label${i}`] = {
                type: 'label',
                xValue: wl,
                yValue: 1.18, // Posição vertical acima do gráfico
                content: classesLabel[i],
                color: 'white',
                font: { size: 14, weight: 'bold' },
                position: 'center'
            };
            // Tracinho indicador
            annotationsClasses[`tick${i}`] = {
                type: 'line',
                xMin: wl, xMax: wl,
                yMin: 1.1, // Começa no topo do eixo Y
                yMax: 1.14, // Sobe um pouco
                borderColor: 'white', borderWidth: 1
            };
        }
    });

    // Linha pontilhada do Pico atual
    annotationsClasses['linePico'] = {
        type: 'line',
        xMin: pico_val, xMax: pico_val,
        yMin: 0, yMax: 1.1,
        borderColor: 'gold', borderWidth: 2,
        borderDash: [5, 5],
        label: { content: 'Pico', enabled: true, color: 'gold', position: 'start', yAdjust: -10 }
    };

    if (chart1) {
        chart1.data.labels = labels;
        chart1.data.datasets[0].data = dadosNormalizados;
        chart1.options.scales.x.min = xmin;
        chart1.options.scales.x.max = xmax;
        chart1.options.plugins.annotation.annotations = annotationsClasses;
        chart1.update();
    } else {
        chart1 = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Intensidade',
                    data: dadosNormalizados,
                    borderColor: 'white',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                // Espaço extra no topo para as letras não cortarem
                layout: {
                    padding: { top: 50 }
                },
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    x: { 
                        type: 'linear', position: 'bottom',
                        title: { display: true, text: 'Comprimento de Onda (nm)', color: '#fff' },
                        ticks: { color: '#fff' }, grid: { color: '#444' },
                        min: xmin, max: xmax
                    },
                    y: {
                        title: { display: true, text: 'Fluxo Normalizado', color: '#fff' },
                        ticks: { display: false }, grid: { color: '#444' },
                        min: -0.05, max: 1.1 // Teto do gráfico
                    }
                },
                plugins: {
                    legend: { display: false },
                    annotation: {
                        clip: false, // Permite desenhar fora da área
                        annotations: annotationsClasses
                    }
                }
            },
            plugins: [rainbowPlugin]
        });
    }
}

// --- 4. FUNÇÕES DE INTERFACE (Abas e Tabela) ---

function openTab(tabName) {
    const tabs = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabs.length; i++) tabs[i].classList.remove("active");
    const btns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < btns.length; i++) btns[i].classList.remove("active");
    
    document.getElementById(tabName).classList.add("active");
    // Adiciona active ao botão clicado (se houver evento)
    if(event) event.currentTarget.classList.add("active");
    if (tabName=='etapa2'){
      gerarAtlas();
    }
    if (tabName === 'etapa3') { atualizarGraficoEtapa3(); }
    if (tabName === 'etapa4') {
        setTimeout(atualizarGraficoEtapa4, 10);
        // Inicializa a tabela apenas se estiver vazia para não duplicar linha de exemplo
        const tbody = document.querySelector("#tabela-investigacao tbody");
        if (tbody.children.length === 0) initTabelaInvestigacao();
    }
    if (tabName === 'etapa5') {
        gerarCheckboxesEtapa5(); // Gera os botões apenas na primeira vez
        setTimeout(atualizarGraficoEtapa5, 10);
    }
}

function initTabela() {
    // Linha de exemplo inicial
    adicionarLinhaTabela("G (Exemplo)", 500, 5796, "Branco");
}

function adicionarLinhaTabela(classe = "", lmax = "", temp = "", cor = "") {
    const tbody = document.querySelector("#tabela-observacoes tbody");
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td><input type="text" class="obs-classe" value="${classe}" placeholder="Ex: A"></td>
        <td><input type="number" class="obs-lmax" value="${lmax}" placeholder="nm"></td>
        <td><input type="number" class="obs-temp" value="${temp}" placeholder="K"></td>
        <td><input type="text" class="obs-cor" value="${cor}" placeholder="Ex: Azul"></td>
        <td><button class="btn-remove" onclick="removerLinha(this)">X</button></td>
    `;
    
    tr.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", verificarProgresso);
    });

    tbody.appendChild(tr);
    verificarProgresso();
}

function removerLinha(btn) {
    const row = btn.parentNode.parentNode;
    row.parentNode.removeChild(row);
    verificarProgresso();
}

function verificarProgresso() {
    const inputsLmax = document.querySelectorAll(".obs-lmax");
    let count = 0;
    
    inputsLmax.forEach(input => {
        if (input.value && input.value.trim() !== "") {
            count++;
        }
    });

    document.getElementById("contador-obs").innerText = count;

    const areaGabarito = document.getElementById("area-gabarito");
    if (count >= 6) {
        areaGabarito.style.display = "block";
        gerarGabarito();
    } else {
        areaGabarito.style.display = "none";
    }
}

function gerarGabarito() {
    const tbodyGabarito = document.querySelector("#tabela-gabarito tbody");
    tbodyGabarito.innerHTML = "";

    const rows = document.querySelectorAll("#tabela-observacoes tbody tr");
    
    rows.forEach(row => {
        const lmaxVal = row.querySelector(".obs-lmax").value;
        const tempUserVal = row.querySelector(".obs-temp").value;

        if (lmaxVal) {
            const lmax = parseFloat(lmaxVal);
            const tempUser = parseFloat(tempUserVal) || 0;
            const tempCorreta = calcular_temp_por_pico(lmax);
            
            let erro = 0;
            if(tempCorreta > 0) erro = Math.abs((tempUser - tempCorreta) / tempCorreta) * 100;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${lmax} nm</td>
                <td>${tempUser} K</td>
                <td style="color: #4ea8de; font-weight:bold;">${tempCorreta.toFixed(0)} K</td>
                <td>${erro.toFixed(1)}%</td>
            `;
            tbodyGabarito.appendChild(tr);
        }
    });
}

function baixarCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Classe,Lambda_Max(nm),Temp_Usuario(K),Cor,Conclusao\n";

    const rows = document.querySelectorAll("#tabela-observacoes tbody tr");
    const conclusaoElement = document.getElementById("conclusao-txt");
    const conclusao = conclusaoElement ? conclusaoElement.value.replace(/,/g, ";").replace(/\n/g, " ") : "";

    rows.forEach(row => {
        const c = row.querySelector(".obs-classe").value;
        const l = row.querySelector(".obs-lmax").value;
        const t = row.querySelector(".obs-temp").value;
        const cor = row.querySelector(".obs-cor").value;
        csvContent += `${c},${l},${t},${cor},${conclusao}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "meu_relatorio_espectroscopia.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- 5. INICIALIZAÇÃO ---
document.getElementById('pico_slider').addEventListener('input', atualizarGraficoEtapa1);
document.getElementById('xmin_slider').addEventListener('input', atualizarGraficoEtapa1);
document.getElementById('xmax_slider').addEventListener('input', atualizarGraficoEtapa1);

window.onload = function() {
    atualizarGraficoEtapa1();
    initTabela();
};


// --- ETAPA 2: ATLAS ESPECTRAL ---

// 1. Dados dos Elementos (Traduzido do Python LINHAS_ATLAS)
const LINHAS_ATLAS = {
    "Si IV":  { linhas: [140.0, 155.0], cor: "peachpuff" }, // Fora do visível, mas mantido
    "He II":  { linhas: [468.58, 656.00], cor: "purple" },
    "Si III": { linhas: [455.26, 456.78, 457.47], cor: "darksalmon" },
    "He I":   { linhas: [388.84, 447.15, 587.56], cor: "#4444ff" }, // Azul ajustado
    "Mg II":  { linhas: [448.11], cor: "dodgerblue" },
    "Si II":  { linhas: [634.71, 637.14], cor: "deepskyblue" },
    "H":      { linhas: [388.90, 410.17, 434.05, 486.13, 656.28], cor: "cyan" },
    "Ca II":  { linhas: [393.40, 396.90], cor: "#00ff00" }, // Verde
    "Fe II":  { linhas: [492.4, 501.8, 516.9], cor: "limegreen" },
    "Fe I":   { linhas: [438.79, 526.95, 532.80], cor: "gold" },
    "Ca I":   { linhas: [422.67, 646.26, 649.38], cor: "orange" },
    "TiO":    { linhas: [668.9, 709.0], cor: "red" }
};

let atlasGerado = false; // Para não recriar os gráficos toda vez que troca de aba


// --- Função gerarAtlas Atualizada (Refinamentos Visuais) ---

function gerarAtlas() {
    if (atlasGerado) return;
    
    const container = document.getElementById("atlas-container");
    const tbody = document.querySelector("#tabela-atlas tbody");
    container.innerHTML = "";
    tbody.innerHTML = "";

    // Geramos pontos EXATAMENTE de 380 a 800 para preencher tudo
    const wavelengths = linspace(380, 800, 600); 

    for (const [nome, dados] of Object.entries(LINHAS_ATLAS)) {
        
        // --- A. DADOS DO GRÁFICO ---
        const dadosGrafico = wavelengths.map(wl => {
            let valor = 1.0;
            const largura = (nome === "TiO") ? 8.0 : 1.0;
            dados.linhas.forEach(linhaPos => {
                // Renderiza linhas mesmo que estejam nas bordas
                if (linhaPos >= 380 && linhaPos <= 800) {
                    const diff = wl - linhaPos;
                    const gaussiana = 0.8 * Math.exp(-(diff * diff) / (2 * largura * largura));
                    valor -= gaussiana;
                }
            });
            return { x: wl, y: Math.max(0, valor) };
        });

        // --- B. ELEMENTOS DOM ---
        const wrapper = document.createElement("div");
        wrapper.className = "atlas-item";
        wrapper.style.backgroundColor = "#000"; // Fundo preto para contraste (como imagem original)
        wrapper.style.border = "1px solid #333";
        wrapper.style.padding = "5px";
        wrapper.style.borderRadius = "4px";
        wrapper.style.marginBottom = "10px";

        // Título Pequeno e Colorido
        const titulo = document.createElement("div");
        titulo.innerText = `Elemento: ${nome}`;
        titulo.style.color = "#ccc";
        titulo.style.fontSize = "14px";
        titulo.style.marginBottom = "2px";
        titulo.style.marginLeft = "10px";

        const canvasContainer = document.createElement("div");
        canvasContainer.style.height = "160px"; 
        canvasContainer.style.position = "relative";
        
        const canvas = document.createElement("canvas");
        canvasContainer.appendChild(canvas);
        wrapper.appendChild(titulo);
        wrapper.appendChild(canvasContainer);
        container.appendChild(wrapper);

        // --- C. CHART.JS CONFIG ---
        new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                datasets: [{
                    data: dadosGrafico,
                    borderColor: dados.cor,
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { 
                        type: 'linear', 
                        position: 'bottom',
                        min: 380, // Início exato
                        max: 800, // Fim exato
                        title: { 
                            display: true, 
                            text: 'Comprimento de Onda (nm)', 
                            color: '#f4f4f4ff',
                            font: { size: 12 }
                        },
                        ticks: { 
                            color: "#888", 
                            stepSize: 50,
                            font: { size: 10 },
                            callback: function(val) { return Math.round(val); }
                        },
                        grid: { 
                            color: "#333",
                            borderColor: "#555"
                        } 
                    },
                    y: { 
                        display: true,
                        min: 0, max: 1.1,
                        title: { 
                            display: true, 
                            text: 'Absorção', // Rótulo vertical solicitado
                            color: '#f1f1f1ff',
                            font: { size: 12 }
                        },
                        ticks: { display: false }, // Remove números do eixo Y (limpeza visual)
                        grid: { display: false }   // Remove grades horizontais
                    } 
                },
                layout: { 
                    padding: { left: 0, right: 10, top: 5, bottom: 0 } // Ajuste fino para ocupar tudo
                }
            }
        });

        // --- D. TABELA (5 COLUNAS DE LINHAS) ---
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="color: ${dados.cor}; font-weight: bold;">${nome}</td>
            <td><input type="number" class="atlas-input" placeholder=""></td>
            <td><input type="number" class="atlas-input" placeholder=""></td>
            <td><input type="number" class="atlas-input" placeholder=""></td>
            <td><input type="number" class="atlas-input" placeholder=""></td>
            <td><input type="number" class="atlas-input" placeholder=""></td>
            <td><input type="text" class="atlas-obs" style="width: 100%;" placeholder="Obs..."></td>
        `;
        tbody.appendChild(tr);
    }

    atlasGerado = true;
}

// --- Função de Download Atualizada (5 Colunas) ---

function baixarCSVAtlas() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Elemento,Linha 1(nm),Linha 2(nm),Linha 3(nm),Linha 4(nm),Linha 5(nm),Observacoes\n";

    const rows = document.querySelectorAll("#tabela-atlas tbody tr");
    rows.forEach(row => {
        const inputs = row.querySelectorAll("input");
        const el = row.cells[0].innerText;
        
        // Coleta os valores dos 5 inputs de linha + 1 de observação
        const l1 = inputs[0].value;
        const l2 = inputs[1].value;
        const l3 = inputs[2].value;
        const l4 = inputs[3].value;
        const l5 = inputs[4].value;
        const obs = inputs[5].value.replace(/,/g, ";"); // Evita quebrar CSV
        
        csvContent += `${el},${l1},${l2},${l3},${l4},${l5},${obs}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "minhas_anotacoes_atlas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}



// --- ETAPA 3: ESPECTRO COM ABSORÇÃO ---

// 1. Parâmetros de Física (Traduzidos do Python)
const PARAMETROS_INTENSIDADE = {
    // [Pico de Temperatura Ideal, Largura da Curva de Temperatura, Fator de Escala]
    "Si IV":  [40000, 2500, 0.30],
    "He II":  [35000, 4500, 0.60],
    "He I":   [22000, 6000, 0.75],
    "Si III": [17000, 2500, 0.35],
    "Si II":  [13500, 3000, 0.50],
    "Mg II":  [9500, 2000, 0.40],
    "H":      [10000, 3500, 1.00],
    "Fe II":  [7000, 1800, 0.50],
    "Ca II":  [5200, 1600, 1.00],
    "Fe I":   [4500, 2000, 0.75],
    "Ca I":   [3900, 1700, 0.85],
    "TiO":    [3200, 1000, 1.00]
};

const LINHAS_QUENTES = ["He II", "He I", "Si IV", "Si III", "Si II", "Mg II"];
const LINHAS_FRIAS = ["Fe I", "Ca I", "TiO"];

let chart3 = null;

// --- Função atualizarGraficoEtapa3 Atualizada (Alta Resolução) ---

// --- Função atualizarGraficoEtapa3 Atualizada e Corrigida ---

function atualizarGraficoEtapa3() {
    // 1. Capturar Inputs
    const temp = parseFloat(document.getElementById('temp_e3_slider').value);
    const log_g = parseFloat(document.getElementById('logg_e3_slider').value);
    const xmin = parseFloat(document.getElementById('xmin_e3_slider').value);
    const xmax = parseFloat(document.getElementById('xmax_e3_slider').value);

    // Atualizar displays de texto
    document.getElementById('val-temp-e3').innerText = temp;
    document.getElementById('val-logg-e3').innerText = log_g;
    document.getElementById('val-xmin-e3').innerText = xmin;
    document.getElementById('val-xmax-e3').innerText = xmax;
    
    // Cor Dinâmica da Classe
    const classe = get_classe_espectral(temp);
    const spanClasse3 = document.getElementById('calc-classe-e3');
    spanClasse3.innerText = classe;
    
    const corClasse = CORES_CLASSES[classe] || "#ffffff";
    spanClasse3.style.color = corClasse;
    spanClasse3.style.fontWeight = "bold";  
    spanClasse3.style.fontStyle = "normal"; 
    spanClasse3.style.textShadow = `0 0 10px ${corClasse}`;

    // 2. Gerar Dados (4000 pontos para alta resolução)
    const wavelengths = linspace(xmin, xmax, 4000); 

    // A. Fluxo Contínuo
    const fluxoContinuo = wavelengths.map(wl => planck(wl, temp));
    const maxFluxo = Math.max(...fluxoContinuo) || 1;
    const continuoNorm = fluxoContinuo.map(v => v / maxFluxo);

    // B. Fluxo com Absorção
    let fluxoFinal = [...fluxoContinuo]; 
    const larguraBase = 0.2 + (log_g - 1.0) * 0.3;

    for (const [nome, params] of Object.entries(PARAMETROS_INTENSIDADE)) {
        const [picoT, larguraT, fatorEscala] = params;

        if (LINHAS_QUENTES.includes(nome) && temp < 7500) continue;
        if (LINHAS_FRIAS.includes(nome) && temp > 8000) continue;
        if (nome === "Fe II" && temp < 4000) continue;

        let intensidadeRelativa = Math.exp( -Math.pow(temp - picoT, 2) / (2 * Math.pow(larguraT, 2)) );

        if (nome === "H" && temp >= 10000) intensidadeRelativa = Math.max(intensidadeRelativa, 0.15);
        if (nome === "TiO") intensidadeRelativa = 1 / (1 + Math.exp(0.005 * (temp - 3600)));

        if (intensidadeRelativa > 0.05) {
            const larguraLinha = (nome === "TiO") ? 8.0 : larguraBase;
            if (LINHAS_ATLAS[nome]) {
                LINHAS_ATLAS[nome].linhas.forEach(linhaPos => {
                    if (linhaPos >= xmin - 20 && linhaPos <= xmax + 20) {
                        for (let i = 0; i < wavelengths.length; i++) {
                            const wl = wavelengths[i];
                            if (Math.abs(wl - linhaPos) < larguraLinha * 4) { 
                                const continuoLocal = fluxoContinuo[i];
                                const profundidade = (0.95 * intensidadeRelativa * fatorEscala) * continuoLocal;
                                const gaussiana = profundidade * Math.exp( -Math.pow(wl - linhaPos, 2) / (2 * Math.pow(larguraLinha, 2)) );
                                fluxoFinal[i] -= gaussiana;
                            }
                        }
                    }
                });
            }
        }
    }

    const finalNorm = fluxoFinal.map(v => Math.max(0, v) / maxFluxo);

    // 3. Renderizar Gráfico
    const ctx = document.getElementById('graficoEtapa3').getContext('2d');
    const picoWien = calcular_pico_wien(temp);
    
    const annotationsE3 = {
        pico: {
            type: 'line',
            xMin: picoWien, xMax: picoWien,
            borderColor: 'gold', borderWidth: 2, borderDash: [5, 5],
            label: { content: 'Pico de Wien', enabled: true, color: 'gold', position: 'start' }
        }
    };

    if (chart3) {
        chart3.data.labels = wavelengths;
        chart3.data.datasets[0].data = continuoNorm;
        chart3.data.datasets[1].data = finalNorm;
        chart3.options.scales.x.min = xmin;
        chart3.options.scales.x.max = xmax;
        chart3.options.plugins.annotation.annotations = annotationsE3;
        
        // --- CORREÇÃO: Desliga animação para alinhamento instantâneo ---
        chart3.options.animation = false; 
        
        chart3.update();
    } else {
        chart3 = new Chart(ctx, {
            type: 'line',
            data: {
                labels: wavelengths,
                datasets: [
                    {
                        label: 'Corpo Negro Ideal',
                        data: continuoNorm,
                        borderColor: 'dimgray', borderWidth: 2, borderDash: [5, 5],
                        pointRadius: 0, tension: 0.4
                    },
                    {
                        label: 'Espectro com Absorção',
                        data: finalNorm,
                        borderColor: 'white', borderWidth: 2,
                        pointRadius: 0, tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // <--- IMPORTANTE: Desliga animação inicial

                // --- IMPORTANTE: Remove preenchimentos extras ---
                layout: {
                    padding: { left: 0, right: 0, top: 0, bottom: 0 }
                },

                interaction: { intersect: false, mode: 'index' },
                scales: {
                    x: { 
                        type: 'linear', position: 'bottom',
                        min: xmin, max: xmax,
                        offset: false, // <--- IMPORTANTE: Cola na borda
                        title: { display: true, text: 'Comprimento de Onda (nm)', color: '#fff' },
                        ticks: { color: '#fff' }, grid: { color: '#444' } 
                    },
                    y: {
                        min: 0.0, max: 1.1,
                        title: { display: true, text: 'Intensidade Relativa', color: '#fff' },
                        ticks: { 
                            color: '#fff', 
                            callback: function(value) { return value > 1.0 ? null : value; }
                        }, 
                        grid: { color: '#444' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } },
                    annotation: { annotations: annotationsE3 }
                }
            }
        });
    }

    // Desenha a faixa exatamente após o gráfico atualizar
    requestAnimationFrame(() => {
        desenharFaixaDinamica('faixaEspectralE3', wavelengths, finalNorm, chart3);
    });
}

// Inicialização dos Sliders da Etapa 3
document.getElementById('temp_e3_slider').addEventListener('input', atualizarGraficoEtapa3);
document.getElementById('logg_e3_slider').addEventListener('input', atualizarGraficoEtapa3);
document.getElementById('xmin_e3_slider').addEventListener('input', atualizarGraficoEtapa3);
document.getElementById('xmax_e3_slider').addEventListener('input', atualizarGraficoEtapa3);

// Atualizar função openTab para inicializar etapa 3 se necessário
// (Adicione este trecho dentro da sua função openTab existente)
// if (tabName === 'etapa3') { atualizarGraficoEtapa3(); }

// ... (código anterior da Etapa 3) ...

// --- ETAPA 4: INVESTIGAÇÃO ---

let chart4Top = null;
let chart4Bottom = null;
// --- Função atualizarGraficoEtapa4 Atualizada (Alta Resolução e Física Correta) ---

function atualizarGraficoEtapa4() {
    const temp = parseFloat(document.getElementById('temp_e4_slider').value);
    const log_g = parseFloat(document.getElementById('logg_e4_slider').value);
    const xmin = parseFloat(document.getElementById('xmin_e4_slider').value);
    const xmax = parseFloat(document.getElementById('xmax_e4_slider').value);

  // 2. Atualiza os textos antigos ao lado do slider (MANTENHA ISSO se ainda existirem)
    if(document.getElementById('val-temp-e4')) document.getElementById('val-temp-e4').innerText = temp;
    if(document.getElementById('val-logg-e4')) document.getElementById('val-logg-e4').innerText = log_g;
    if(document.getElementById('val-xmin-e4')) document.getElementById('val-xmin-e4').innerText = xmin;
    if(document.getElementById('val-xmax-e4')) document.getElementById('val-xmax-e4').innerText = xmax;

    // 3. --- NOVO: ATUALIZA O HUD DENTRO DO GRÁFICO ---
    // Verifica se o elemento existe antes de tentar atualizar para não dar erro
    const hudTemp = document.getElementById('hud-temp-e4');
    const hudLogg = document.getElementById('hud-logg-e4');
    const hudClasse = document.getElementById('hud-classe-e4');

    if (hudTemp) {
        hudTemp.innerText = temp + " K";
    }
    if (hudLogg) {
        hudLogg.innerText = log_g;
    }
    if (hudClasse) {
        // 1. Calcula a letra baseada na temperatura atual
        const classe = get_classe_espectral(temp);
        
        // 2. Define o texto
        hudClasse.innerText = classe;
        
        // 3. Busca a cor certa na nossa tabela global CORES_CLASSES
        const cor = CORES_CLASSES[classe] || "#ffffff";
        
        // 4. Aplica estilo e brilho neon
        hudClasse.style.color = cor;
        hudClasse.style.textShadow = `0 0 10px ${cor}`;
    }

    const wavelengths = linspace(xmin, xmax, 4000); 

    // --- CÁLCULOS (Corpo Negro) ---
    const fluxoContinuo = wavelengths.map(wl => planck(wl, temp));
    const maxFluxo = Math.max(...fluxoContinuo) || 1;
    
    // CORREÇÃO: Criar pares {x, y} para garantir alinhamento perfeito
    const dadosContinuo = wavelengths.map((wl, i) => {
        return { x: wl, y: fluxoContinuo[i] / maxFluxo };
    });

    // --- CÁLCULOS (Absorção) ---
    let fluxoAbsorcao = new Array(wavelengths.length).fill(1.0);
    const larguraBase = 0.2 + (log_g - 1.0) * 0.3;

    for (const [nome, params] of Object.entries(PARAMETROS_INTENSIDADE)) {
        const [picoT, larguraT, fatorEscala] = params;
        if (LINHAS_QUENTES.includes(nome) && temp < 7500) continue;
        if (LINHAS_FRIAS.includes(nome) && temp > 8000) continue;
        if (nome === "Fe II" && temp < 4000) continue;

        let intensidadeRelativa = Math.exp( -Math.pow(temp - picoT, 2) / (2 * Math.pow(larguraT, 2)) );
        if (nome === "H" && temp >= 10000) intensidadeRelativa = Math.max(intensidadeRelativa, 0.15);
        if (nome === "TiO") intensidadeRelativa = 1 / (1 + Math.exp(0.005 * (temp - 3600)));

        if (intensidadeRelativa > 0.05) {
            const larguraLinha = (nome === "TiO") ? 8.0 : larguraBase;
            if (LINHAS_ATLAS[nome]) {
                LINHAS_ATLAS[nome].linhas.forEach(linhaPos => {
                    if (linhaPos >= xmin - 20 && linhaPos <= xmax + 20) {
                        for (let i = 0; i < wavelengths.length; i++) {
                            const wl = wavelengths[i];
                            if (Math.abs(wl - linhaPos) < larguraLinha * 4) { 
                                const profundidade = (1.0 * intensidadeRelativa * fatorEscala); 
                                const gaussiana = profundidade * Math.exp( -Math.pow(wl - linhaPos, 2) / (2 * Math.pow(larguraLinha, 2)) );
                                fluxoAbsorcao[i] -= gaussiana;
                            }
                        }
                    }
                });
            }
        }
    }
    
    // CORREÇÃO: Criar pares {x, y} para absorção também
    const dadosAbsorcao = wavelengths.map((wl, i) => {
        return { x: wl, y: Math.max(0, Math.min(1, fluxoAbsorcao[i])) };
    });

    // --- GRÁFICOS ---
    const ctxTop = document.getElementById('graficoEtapa4_Top').getContext('2d');
    const picoWien = calcular_pico_wien(temp);
    
    const rainbowPluginTop = {
        id: 'rainbowTop',
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;
            const xStart = xAxis.left;
            const xEnd = xAxis.right;
            const yTop = yAxis.top;
            const height = yAxis.bottom - yAxis.top;
            for (let x = xStart; x <= xEnd; x++) {
                const wl = xAxis.getValueForPixel(x);
                if (wl >= 380 && wl <= 780) {
                    ctx.fillStyle = wavelengthToColor(wl, 0.85);
                    ctx.fillRect(x, yTop, 1, height);
                }
            }
        }
    };

    if (chart4Top) {
        // Atualiza usando os novos dados {x,y}
        chart4Top.data.datasets[0].data = dadosContinuo;
        chart4Top.options.scales.x.min = xmin; 
        chart4Top.options.scales.x.max = xmax;
        chart4Top.options.plugins.annotation.annotations.pico.xMin = picoWien;
        chart4Top.options.plugins.annotation.annotations.pico.xMax = picoWien;
        chart4Top.update();
    } else {
        chart4Top = new Chart(ctxTop, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Corpo Negro Ideal',
                    data: dadosContinuo, // Usa pares {x,y}
                    borderColor: 'white',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    x: { type: 'linear', display: false, min: xmin, max: xmax }, 
                    y: { 
                        min: 0.0, max: 1.1, 
                        title: { display: true, text: 'Intensidade Relativa', color: '#fff' }, 
                        grid: { color: '#444' }, 
                        ticks: { color: '#ccc', callback: function(val) { return val > 1.0 ? null : val; } } 
                    }
                },
                plugins: {
                    legend: { display: false },
                    annotation: {
                        annotations: {
                            pico: { type: 'line', xMin: picoWien, xMax: picoWien, borderColor: 'gold', borderWidth: 2, borderDash: [5, 5], label: { content: 'Pico de Wien', enabled: true, color: 'gold', position: 'start' } }
                        }
                    }
                }
            },
            plugins: [rainbowPluginTop]
        });
    }

    // Gráfico de Baixo
    const ctxBottom = document.getElementById('graficoEtapa4_Bottom').getContext('2d');
    
    if (chart4Bottom) {
        chart4Bottom.data.datasets[0].data = dadosAbsorcao;
        chart4Bottom.options.scales.x.min = xmin; 
        chart4Bottom.options.scales.x.max = xmax;
        chart4Bottom.update();
    } else {
        chart4Bottom = new Chart(ctxBottom, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Linhas de Absorção',
                    data: dadosAbsorcao, // Usa pares {x,y}
                    borderColor: 'white',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    x: { 
                        type: 'linear', position: 'bottom', min: xmin, max: xmax,
                        title: { display: true, text: 'Comprimento de Onda (nm)', color: '#fff' },
                        ticks: { color: '#fff' }, grid: { color: '#444' }
                    },
                    y: { 
                        min: 0, max: 1.1, 
                        title: { display: true, text: 'Intensidade Normalizada', color: '#fff' }, 
                        grid: { color: '#444' }, 
                        ticks: { color: '#ccc', callback: function(val) { return val > 1.0 ? null : val; } }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}
// --- LÓGICA DA TABELA (ETAPA 4) ---

function initTabelaInvestigacao() {
    // Linha de Exemplo conforme imagem do usuário
    adicionarLinhaInvestigacao("G (Exemplo)", "5800", "Ca II, H, Fe I", "Ca II (muito forte), Fe I, H", "As linhas do Cálcio II são muito proeminentes e ...");
}

function adicionarLinhaInvestigacao(classe="", temp="", elems="", int="", com="") {
    const tbody = document.querySelector("#tabela-investigacao tbody");
    const tr = document.createElement("tr");

    // Inputs correspondentes às colunas
    tr.innerHTML = `
        <td>
            <input type="text" class="inv-classe" value="${classe}" placeholder="Classe" style="width: 40%; margin-right:5px;">
            <input type="number" class="inv-temp" value="${temp}" placeholder="Temp(K)" style="width: 50%;">
        </td>
        <td><input type="text" class="inv-elems" value="${elems}" placeholder="Elementos..."></td>
        <td><input type="text" class="inv-int" value="${int}" placeholder="Intensidade..."></td>
        <td><input type="text" class="inv-com" value="${com}" placeholder="Obs..."></td>
        <td><button class="btn-remove" onclick="removerLinhaInv(this)">X</button></td>
    `;
    
    // Listeners para contar progresso
    tr.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", verificarProgressoInv);
    });

    tbody.appendChild(tr);
    verificarProgressoInv();
}

function removerLinhaInv(btn) {
    const row = btn.parentNode.parentNode;
    row.parentNode.removeChild(row);
    verificarProgressoInv();
}

function verificarProgressoInv() {
    // Conta linhas onde "Elementos Identificados" foi preenchido
    const inputs = document.querySelectorAll(".inv-elems");
    let count = 0;
    inputs.forEach(input => { if (input.value.trim() !== "") count++; });
    
    document.getElementById("contador-inv").innerText = count;

    // Lógica para revelar Cecilia Payne (após 6 linhas)
    const secaoPayne = document.getElementById("secao-payne");
    if (count >= 6) {
        secaoPayne.style.display = "block";
    } else {
        secaoPayne.style.display = "none";
    }
}

function baixarRelatorioE4() {
    let csv = "data:text/csv;charset=utf-8,";
    
    // Cabeçalho da Tabela
    csv += "Classe,Temp(K),Elementos,Intensidade(decrescente),Comentarios\n";
    
    document.querySelectorAll("#tabela-investigacao tbody tr").forEach(row => {
        const c = row.querySelector(".inv-classe").value;
        const t = row.querySelector(".inv-temp").value;
        const e = row.querySelector(".inv-elems").value.replace(/,/g, ";");
        const i = row.querySelector(".inv-int").value.replace(/,/g, ";");
        const o = row.querySelector(".inv-com").value.replace(/,/g, ";");
        csv += `${c},${t},${e},${i},${o}\n`;
    });

    csv += "\nPERGUNTAS DE ANALISE\n";
    csv += "1. Elementos Baixa Temp," + document.getElementById("resp1-e4").value.replace(/\n/g, " ").replace(/,/g, ";") + "\n";
    csv += "2. Elemento Comum," + document.getElementById("resp2-e4").value.replace(/\n/g, " ").replace(/,/g, ";") + "\n";
    csv += "3. Efeito Gravidade," + document.getElementById("resp3-e4").value.replace(/\n/g, " ").replace(/,/g, ";") + "\n";

    if (document.getElementById("secao-payne").style.display !== "none") {
        csv += "\nREFLEXAO CECILIA PAYNE\n";
        csv += document.getElementById("reflexao-payne").value.replace(/\n/g, " ").replace(/,/g, ";") + "\n";
    }

    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_investigacao_etapa4.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Inicializadores
document.getElementById('temp_e4_slider').addEventListener('input', atualizarGraficoEtapa4);
document.getElementById('logg_e4_slider').addEventListener('input', atualizarGraficoEtapa4);
document.getElementById('xmin_e4_slider').addEventListener('input', atualizarGraficoEtapa4);
document.getElementById('xmax_e4_slider').addEventListener('input', atualizarGraficoEtapa4);

// Adicionar na função openTab
// if (tabName === 'etapa4') { setTimeout(atualizarGraficoEtapa4, 10); initTabelaInvestigacao(); }
// ... (código anterior da Etapa 4) ...

// --- ETAPA 5: LINHAS DE REFERÊNCIA ---

let chart5Top = null;
let chart5Bottom = null;
let checkboxesGerados = false;

function gerarCheckboxesEtapa5() {
    if (checkboxesGerados) return;

    const container = document.getElementById("checkboxes-container");
    container.innerHTML = "";

    // Cria um checkbox para cada elemento
    for (const [nome, dados] of Object.entries(LINHAS_ATLAS)) {
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "5px";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.id = `chk_e5_${nome}`;
        input.value = nome;
        input.style.cursor = "pointer";
        // Recarrega o gráfico ao clicar
        input.addEventListener("change", atualizarGraficoEtapa5);

        const label = document.createElement("label");
        label.htmlFor = `chk_e5_${nome}`;
        label.innerText = nome;
        label.style.color = dados.cor; // Nome na cor do elemento
        label.style.fontWeight = "bold";
        label.style.cursor = "pointer";

        wrapper.appendChild(input);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    }
    checkboxesGerados = true;
}

function atualizarGraficoEtapa5() {
    const temp = parseFloat(document.getElementById('temp_e5_slider').value);
    const log_g = parseFloat(document.getElementById('logg_e5_slider').value);
    const xmin = parseFloat(document.getElementById('xmin_e5_slider').value);
    const xmax = parseFloat(document.getElementById('xmax_e5_slider').value);

    document.getElementById('val-temp-e5').innerText = temp;
    document.getElementById('val-logg-e5').innerText = log_g;
    document.getElementById('val-xmin-e5').innerText = xmin;
    document.getElementById('val-xmax-e5').innerText = xmax;

    const elementosMarcados = [];
    document.querySelectorAll("#checkboxes-container input[type='checkbox']").forEach(input => {
        if (input.checked) elementosMarcados.push(input.value);
    });

    const wavelengths = linspace(xmin, xmax, 4000); 

    // Dados Corpo Negro {x,y}
    const fluxoContinuo = wavelengths.map(wl => planck(wl, temp));
    const maxFluxo = Math.max(...fluxoContinuo) || 1;
    const dadosContinuo = wavelengths.map((wl, i) => {
        return { x: wl, y: fluxoContinuo[i] / maxFluxo };
    });

    // Dados Absorção {x,y}
    let fluxoAbsorcao = new Array(wavelengths.length).fill(1.0);
    const larguraBase = 0.2 + (log_g - 1.0) * 0.3;

    for (const [nome, params] of Object.entries(PARAMETROS_INTENSIDADE)) {
        const [picoT, larguraT, fatorEscala] = params;
        if (LINHAS_QUENTES.includes(nome) && temp < 7500) continue;
        if (LINHAS_FRIAS.includes(nome) && temp > 8000) continue;
        if (nome === "Fe II" && temp < 4000) continue;

        let intensidadeRelativa = Math.exp( -Math.pow(temp - picoT, 2) / (2 * Math.pow(larguraT, 2)) );
        if (nome === "H" && temp >= 10000) intensidadeRelativa = Math.max(intensidadeRelativa, 0.15);
        if (nome === "TiO") intensidadeRelativa = 1 / (1 + Math.exp(0.005 * (temp - 3600)));

        if (intensidadeRelativa > 0.05) {
            const larguraLinha = (nome === "TiO") ? 8.0 : larguraBase;
            if (LINHAS_ATLAS[nome]) {
                LINHAS_ATLAS[nome].linhas.forEach(linhaPos => {
                    if (linhaPos >= xmin - 20 && linhaPos <= xmax + 20) {
                        for (let i = 0; i < wavelengths.length; i++) {
                            const wl = wavelengths[i];
                            if (Math.abs(wl - linhaPos) < larguraLinha * 4) { 
                                const profundidade = (1.0 * intensidadeRelativa * fatorEscala); 
                                const gaussiana = profundidade * Math.exp( -Math.pow(wl - linhaPos, 2) / (2 * Math.pow(larguraLinha, 2)) );
                                fluxoAbsorcao[i] -= gaussiana;
                            }
                        }
                    }
                });
            }
        }
    }
    const dadosAbsorcao = wavelengths.map((wl, i) => {
        return { x: wl, y: Math.max(0, Math.min(1, fluxoAbsorcao[i])) };
    });

    const ctxTop = document.getElementById('graficoEtapa5_Top').getContext('2d');
    const picoWien = calcular_pico_wien(temp);
    
    const rainbowPluginTop = {
        id: 'rainbowTop5', 
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;
            const xStart = xAxis.left;
            const xEnd = xAxis.right;
            const yTop = yAxis.top;
            const height = yAxis.bottom - yAxis.top;
            for (let x = xStart; x <= xEnd; x++) {
                const wl = xAxis.getValueForPixel(x);
                if (wl >= 380 && wl <= 780) {
                    ctx.fillStyle = wavelengthToColor(wl, 0.85);
                    ctx.fillRect(x, yTop, 1, height);
                }
            }
        }
    };

    if (chart5Top) {
        chart5Top.data.datasets[0].data = dadosContinuo;
        chart5Top.options.scales.x.min = xmin; 
        chart5Top.options.scales.x.max = xmax;
        chart5Top.options.plugins.annotation.annotations.pico.xMin = picoWien;
        chart5Top.options.plugins.annotation.annotations.pico.xMax = picoWien;
        chart5Top.update();
    } else {
        chart5Top = new Chart(ctxTop, {
            type: 'line',
            data: {
                datasets: [{ 
                    label: 'Corpo Negro Ideal', 
                    data: dadosContinuo, // {x,y}
                    borderColor: 'white', borderWidth: 2, pointRadius: 0, tension: 0.4 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    x: { type: 'linear', display: false, min: xmin, max: xmax }, 
                    y: { 
                        min: -0.05, max: 1.1, title: { display: true, text: 'Intensidade Relativa', color: '#fff' }, 
                        grid: { color: '#444' }, 
                        ticks: { display: false, callback: function(val) { return val > 1.0 ? null : val; } } 
                    }
                },
                plugins: {
                    legend: { display: false },
                    annotation: {
                        annotations: {
                            pico: { type: 'line', xMin: picoWien, xMax: picoWien, borderColor: 'gold', borderWidth: 2, borderDash: [5, 5], label: { content: 'Pico de Wien', enabled: true, color: 'gold', position: 'start' } }
                        }
                    }
                }
            },
            plugins: [rainbowPluginTop]
        });
    }

    const ctxBottom = document.getElementById('graficoEtapa5_Bottom').getContext('2d');
    
    const annotationsMarkers = {};
    elementosMarcados.forEach((elem, index) => {
        if (LINHAS_ATLAS[elem]) {
            LINHAS_ATLAS[elem].linhas.forEach((linhaPos, i) => {
                if (linhaPos >= xmin && linhaPos <= xmax) {
                    annotationsMarkers[`${elem}_${i}`] = {
                        type: 'line', xMin: linhaPos, xMax: linhaPos,
                        borderColor: LINHAS_ATLAS[elem].cor, borderWidth: 1.5, borderDash: [4, 4],
                        label: {
                            content: elem, enabled: true, position: 'start',
                            backgroundColor: 'rgba(0,0,0,0.7)', color: LINHAS_ATLAS[elem].cor, font: { size: 10 }
                        }
                    };
                }
            });
        }
    });

    if (chart5Bottom) {
        chart5Bottom.data.datasets[0].data = dadosAbsorcao;
        chart5Bottom.options.scales.x.min = xmin; 
        chart5Bottom.options.scales.x.max = xmax;
        chart5Bottom.options.plugins.annotation.annotations = annotationsMarkers;
        chart5Bottom.update();
    } else {
        chart5Bottom = new Chart(ctxBottom, {
            type: 'line',
            data: {
                datasets: [{ 
                    label: 'Linhas de Absorção', 
                    data: dadosAbsorcao, // {x,y}
                    borderColor: 'white', borderWidth: 1.5, pointRadius: 0, tension: 0.2 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    x: { 
                        type: 'linear', position: 'bottom', min: xmin, max: xmax,
                        title: { display: true, text: 'Comprimento de Onda (nm)', color: '#fff' },
                        ticks: { color: '#fff' }, grid: { color: '#444' }
                    },
                    y: { 
                        min: 0, max: 1.1, title: { display: true, text: 'Intensidade Normalizada', color: '#fff' }, 
                        grid: { color: '#444' }, 
                        ticks: { color: '#ccc', callback: function(val) { return val > 1.0 ? null : val; } } 
                    }
                },
                plugins: { 
                    legend: { display: false },
                    annotation: { annotations: annotationsMarkers }
                }
            }
        });
    }
}

// Inicializadores Etapa 5
document.getElementById('temp_e5_slider').addEventListener('input', atualizarGraficoEtapa5);
document.getElementById('logg_e5_slider').addEventListener('input', atualizarGraficoEtapa5);
document.getElementById('xmin_e5_slider').addEventListener('input', atualizarGraficoEtapa5);
document.getElementById('xmax_e5_slider').addEventListener('input', atualizarGraficoEtapa5);

// ... (código anterior da Etapa 5) ...

// --- ETAPA 6: DADOS REAIS ---

function openSubTab(subTabId, btnElement) {
    // 1. Esconder todo o conteúdo das sub-abas
    const contents = document.getElementsByClassName("sub-tab-content");
    for (let i = 0; i < contents.length; i++) {
        contents[i].style.display = "none";
    }

    // 2. Remover classe 'active' de TODOS os botões de sub-aba
    const btns = document.getElementsByClassName("sub-tab-btn");
    for (let i = 0; i < btns.length; i++) {
        btns[i].classList.remove("active");
    }

    // 3. Mostrar o conteúdo desejado
    const selectedContent = document.getElementById(subTabId);
    if (selectedContent) {
        selectedContent.style.display = "block";
    }

    // 4. Adicionar classe 'active' APENAS ao botão clicado
    if (btnElement) {
        btnElement.classList.add("active");
    }
}

function baixarRelatorioE6() {
    const r1 = document.getElementById("analise-spec1").value.replace(/,/g, ";").replace(/\n/g, " ");
    const r2 = document.getElementById("analise-spec2").value.replace(/,/g, ";").replace(/\n/g, " ");
    const r3 = document.getElementById("analise-spec3").value.replace(/,/g, ";").replace(/\n/g, " ");

    let csv = "data:text/csv;charset=utf-8,";
    csv += "Espectro,Analise do Aluno\n";
    csv += `1. Sistema Binario,${r1}\n`;
    csv += `2. Estrela Tipo Solar,${r2}\n`;
    csv += `3. Supergigante,${r3}\n`;

    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "analise_espectros_reais.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// --- FUNÇÃO CORRIGIDA: Sincronização Perfeita com o Gráfico ---
function desenharFaixaDinamica(canvasId, wavelengths, fluxo, chartRef) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !chartRef) return; // Precisa do gráfico para alinhar

    const ctx = canvas.getContext('2d');

    // --- 1. CONFIGURAÇÃO DE ALTA RESOLUÇÃO (RETINA) ---
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Define tamanho interno maior para nitidez
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Normaliza para desenhar com coordenadas CSS
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    
    // Limpa tudo
    ctx.clearRect(0, 0, width, height);

    // --- 2. O SEGREDO DO ALINHAMENTO ---
    // Pegamos a escala X do gráfico de cima emprestada
    const scaleX = chartRef.scales.x;

    // Loop pelos comprimentos de onda
    for (let i = 0; i < wavelengths.length - 1; i++) {
        const wl = wavelengths[i];
        const wlNext = wavelengths[i+1];
        
        // Intensidade para brilho da cor (média entre os dois pontos)
        const intensidade = (fluxo[i] + fluxo[i+1]) / 2;

        // --- AQUI ESTÁ A CORREÇÃO ---
        // Em vez de calcular na mão, pedimos ao Chart.js a posição exata do pixel
        // Se o gráfico tiver margem do Eixo Y, essa função já considera!
        const xPixelStart = scaleX.getPixelForValue(wl);
        const xPixelEnd = scaleX.getPixelForValue(wlNext);
        
        // Se o pixel estiver fora da área visível, pula
        if (xPixelStart < 0 || xPixelStart > width) continue;

        // Calcular a Cor
        let [r, g, b] = wavelengthToRGB(wl);
        
        // Aplica a escuridão da linha de absorção
        // Se intensidade for 1 (topo), cor normal. Se for 0 (fundo), preto.
        // Adicionei um fator 0.8 para as linhas ficarem bem escuras e visíveis
        const fatorEscuro = Math.pow(intensidade, 1.5); // Exponencial para destacar as linhas
        
        r = Math.floor(r * fatorEscuro);
        g = Math.floor(g * fatorEscuro);
        b = Math.floor(b * fatorEscuro);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        
        // Desenha o retângulo exatamente onde o gráfico diz
        // O "+ 1" na largura é para evitar micro-linhas pretas entre as barras (anti-aliasing)
        const larguraBarra = Math.max(xPixelEnd - xPixelStart, 0.5); 
        ctx.fillRect(xPixelStart, 0, larguraBarra + 1, height);
    }
}


function abrirZoom(elementoImg) {
    const modal = document.getElementById("modalZoom");
    const modalImg = document.getElementById("imgExpandida");
    const captionText = document.getElementById("modalCaption");
    
    modal.style.display = "block";
    modalImg.src = elementoImg.src; // Pega a imagem clicada
    modalCaption.innerHTML = elementoImg.alt; // Usa o texto "alt" como legenda
    
    // Trava a rolagem da página de fundo
    document.body.style.overflow = "hidden";
}

function fecharZoom() {
    const modal = document.getElementById("modalZoom");
    modal.style.display = "none";
    
    // Destrava a rolagem
    document.body.style.overflow = "auto";
}

// Fecha com a tecla ESC
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        fecharZoom();
    }
});