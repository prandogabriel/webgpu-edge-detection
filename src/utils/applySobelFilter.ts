/// <reference types="@webgpu/types" />

/**
 * Função que aplica o filtro de Sobel para detecção de bordas em uma imagem.
 * Utiliza a API WebGPU para realizar processamento paralelo na GPU.
 * 
 * @param inputImage - A imagem de entrada como objeto `ImageData`.
 * @returns `Promise<ImageData>` - A imagem processada com bordas detectadas.
 */
export async function applySobelFilter(inputImage: ImageData): Promise<ImageData> {
  // Verifica se o navegador suporta WebGPU
  if (!navigator.gpu) {
    alert('WebGPU não é suportado pelo navegador. \n Por favor, verifique se a API WebGPU é compatível com seu navegador e se está habilitada.');
    window.location.href = '/webgpu-edge-detection'; // Redireciona para uma página de instruções
    throw new Error('WebGPU não é suportado pelo navegador.');
  }

  // Obtém o adaptador e o dispositivo WebGPU
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    alert('Falha ao obter o dispositivo WebGPU. \n Por favor, verifique se a API WebGPU está habilitada no navegador.');
    window.location.href = '/webgpu-edge-detection'; // Redireciona para uma página de instruções
    throw new Error('Falha ao obter o dispositivo WebGPU.');
  }

  // Dimensões da imagem
  const width = inputImage.width;
  const height = inputImage.height;

  // Normaliza os valores da imagem de entrada para o intervalo [0, 1]
  const pixels = new Float32Array(inputImage.data.length / 4);
  for (let i = 0; i < inputImage.data.length; i += 4) {
    pixels[i / 4] = inputImage.data[i] / 255; // Utiliza apenas o canal de intensidade (grayscale)
  }

  // Cria um buffer de entrada e armazena os dados normalizados
  const inputBuffer = device.createBuffer({
    size: pixels.byteLength,
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  });
  new Float32Array(inputBuffer.getMappedRange()).set(pixels); // Copia os dados normalizados para o buffer
  inputBuffer.unmap(); // Desmapeia o buffer para liberar para a GPU

  // Cria um buffer de saída para armazenar os resultados
  const outputBuffer = device.createBuffer({
    size: pixels.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  // Cria um buffer uniforme para armazenar as dimensões da imagem
  const uniformBuffer = device.createBuffer({
    size: 8, // 2 valores de 32 bits (width e height)
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  new Uint32Array(uniformBuffer.getMappedRange()).set([width, height]); // Define as dimensões
  uniformBuffer.unmap();

  // Carrega o shader WGSL do filtro de Sobel
  const shaderModule = device.createShaderModule({
    code: await fetch('/webgpu-edge-detection/shaders/sobel.wgsl').then((res) => res.text()),
  });

  // Define o layout de bindings para os buffers e o pipeline
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  // Configura o pipeline de computação
  const pipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    compute: { module: shaderModule, entryPoint: 'main' }, // O shader usa a função `main`
  });

  // Cria um bind group para conectar os buffers ao pipeline
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: inputBuffer } }, // Buffer de entrada
      { binding: 1, resource: { buffer: outputBuffer } }, // Buffer de saída
      { binding: 2, resource: { buffer: uniformBuffer } }, // Buffer de parâmetros
    ],
  });

  // Configura o encoder de comandos para enviar as tarefas à GPU
  const commandEncoder = device.createCommandEncoder();
  const computePass = commandEncoder.beginComputePass();
  computePass.setPipeline(pipeline);
  computePass.setBindGroup(0, bindGroup);
  
  // Para uma imagem de 1024x1024 pixels, seriam necessários: 1024/16=64
  // numGroupsX=1024/16=64
  // numGroupsY=1024/16=64
  // A GPU processará a imagem usando 64×64=4096 workgroups.
  computePass.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16)); // Divide a imagem em workgroups 16x16
  computePass.end();

  // Cria um buffer de leitura para capturar os resultados
  const readBuffer = device.createBuffer({
    size: pixels.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  // Copia os dados do buffer de saída para o buffer de leitura
  commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, pixels.byteLength);
  device.queue.submit([commandEncoder.finish()]); // Envia os comandos para a GPU

  // Aguarda a GPU finalizar o mapeamento do buffer de leitura
  await readBuffer.mapAsync(GPUMapMode.READ);
  const outputPixels = new Float32Array(readBuffer.getMappedRange()); // Obtém os resultados

  // Converte os resultados para uma nova imagem
  const outputImageData = new ImageData(width, height);
  for (let i = 0; i < outputPixels.length; i++) {
    const value = Math.min(255, Math.max(0, outputPixels[i] * 255)); // Reescala os valores para [0, 255]
    outputImageData.data.set([value, value, value, 255], i * 4); // Define os valores RGBA
  }

  return outputImageData; // Retorna a imagem processada
}
