// Estrutura para armazenar os parâmetros da imagem: largura (width) e altura (height)
struct Params {
  width: u32,   // Largura da imagem
  height: u32,  // Altura da imagem
};

// Declaração dos recursos que serão usados no shader

// Buffer de entrada contendo os pixels da imagem original em escala de cinza
@group(0) @binding(0) var<storage, read> inputImage: array<f32>;

// Buffer de saída para armazenar os pixels processados (resultado da detecção de bordas)
@group(0) @binding(1) var<storage, read_write> outputImage: array<f32>;

// Buffer uniforme que armazena os parâmetros de largura e altura da imagem
@group(0) @binding(2) var<uniform> params: Params;

// Declaração da função principal do shader de computação
// Define um tamanho de workgroup de 16x16 threads para paralelismo
@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  // Obtém as coordenadas do pixel atual a partir do ID global da thread
  let x = global_id.x;
  let y = global_id.y;

  // Recupera as dimensões da imagem a partir do buffer uniforme
  let width = params.width;
  let height = params.height;

  // Verifica se o pixel atual está fora dos limites da imagem
  if (x >= width || y >= height) {
    return; // Encerra a execução se o pixel estiver fora da imagem
  }

  // Calcula o índice linear do pixel atual no buffer (row-major order)
  let index = x + y * width;

  // Declaração dos kernels de Sobel
  // gx: Kernel para calcular o gradiente na direção horizontal
  let gx = array<i32, 9>(
    -1, 0, 1,
    -2, 0, 2,
    -1, 0, 1
  );

  // gy: Kernel para calcular o gradiente na direção vertical
  let gy = array<i32, 9>(
    -1, -2, -1,
     0,  0,  0,
     1,  2,  1
  );

  // Variáveis para acumular os gradientes horizontal (gradientX) e vertical (gradientY)
  var gradientX: f32 = 0.0;
  var gradientY: f32 = 0.0;

  // Iteração pelos 8 vizinhos do pixel (matriz 3x3)
  for (var ky: i32 = -1; ky <= 1; ky++) {         // Itera sobre as linhas do kernel
    for (var kx: i32 = -1; kx <= 1; kx++) {      // Itera sobre as colunas do kernel
      // Calcula as coordenadas do vizinho atual com clamp para evitar acessos fora dos limites
      let px = clamp(i32(x) + kx, 0, i32(width) - 1);
      let py = clamp(i32(y) + ky, 0, i32(height) - 1);

      // Converte as coordenadas 2D para índice linear no buffer
      let neighborIndex = px + py * i32(width);

      // Calcula o índice do elemento correspondente no kernel 3x3
      let kernelIndex = (kx + 1) + (ky + 1) * 3;

      // Acumula os gradientes horizontal (gx) e vertical (gy)
      gradientX += f32(gx[kernelIndex]) * inputImage[neighborIndex];
      gradientY += f32(gy[kernelIndex]) * inputImage[neighborIndex];
    }
  }

  // Calcula a magnitude do gradiente combinando gradientX e gradientY
  let magnitude = sqrt(gradientX * gradientX + gradientY * gradientY);

  // Escreve o valor resultante (magnitude) no buffer de saída
  outputImage[index] = magnitude;
}
