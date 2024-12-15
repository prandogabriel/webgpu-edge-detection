/// <reference types="@webgpu/types" />

export async function applySobelFilter(inputImage: ImageData): Promise<ImageData> {
  if (!navigator.gpu) {
    throw new Error('WebGPU não é suportado pelo navegador.');
  }
  
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    alert('Falha ao obter o dispositivo WebGPU. \n Por favor, verifique se a API WebGPU está habilitada no navegador.');
    throw new Error('Falha ao obter o dispositivo WebGPU.');
  }

  const width = inputImage.width;
  const height = inputImage.height;

  const pixels = new Float32Array(inputImage.data.length / 4);
  for (let i = 0; i < inputImage.data.length; i += 4) {
    pixels[i / 4] = inputImage.data[i] / 255; // Normalizar valores
  }

  const inputBuffer = device.createBuffer({
    size: pixels.byteLength,
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  });
  new Float32Array(inputBuffer.getMappedRange()).set(pixels);
  inputBuffer.unmap();

  const outputBuffer = device.createBuffer({
    size: pixels.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const uniformBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  new Uint32Array(uniformBuffer.getMappedRange()).set([width, height]);
  uniformBuffer.unmap();

  const shaderModule = device.createShaderModule({
    code: await fetch('/shaders/sobel.wgsl').then((res) => res.text()),
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  });

  const pipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    compute: { module: shaderModule, entryPoint: 'main' },
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: inputBuffer } },
      { binding: 1, resource: { buffer: outputBuffer } },
      { binding: 2, resource: { buffer: uniformBuffer } },
    ],
  });

  const commandEncoder = device.createCommandEncoder();
  const computePass = commandEncoder.beginComputePass();
  computePass.setPipeline(pipeline);
  computePass.setBindGroup(0, bindGroup);
  computePass.dispatchWorkgroups(Math.ceil(width / 16), Math.ceil(height / 16));
  computePass.end();

  const readBuffer = device.createBuffer({
    size: pixels.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, pixels.byteLength);
  device.queue.submit([commandEncoder.finish()]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  const outputPixels = new Float32Array(readBuffer.getMappedRange());

  const outputImageData = new ImageData(width, height);
  for (let i = 0; i < outputPixels.length; i++) {
    const value = Math.min(255, Math.max(0, outputPixels[i] * 255));
    outputImageData.data.set([value, value, value, 255], i * 4);
  }

  return outputImageData;
}
