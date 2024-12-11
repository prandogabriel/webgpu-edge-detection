struct Params {
  width: u32,
  height: u32,
};

@group(0) @binding(0) var<storage, read> inputImage: array<f32>;
@group(0) @binding(1) var<storage, read_write> outputImage: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let x = global_id.x;
  let y = global_id.y;

  let width = params.width;
  let height = params.height;

  if (x >= width || y >= height) {
    return;
  }

  let index = x + y * width;

  // Sobel kernels
  let gx = array<i32, 9>(
    -1, 0, 1,
    -2, 0, 2,
    -1, 0, 1
  );
  let gy = array<i32, 9>(
    -1, -2, -1,
     0,  0,  0,
     1,  2,  1
  );

  var gradientX: f32 = 0.0;
  var gradientY: f32 = 0.0;

  for (var ky: i32 = -1; ky <= 1; ky++) {
    for (var kx: i32 = -1; kx <= 1; kx++) {
      let px = clamp(i32(x) + kx, 0, i32(width) - 1);
      let py = clamp(i32(y) + ky, 0, i32(height) - 1);
      let neighborIndex = px + py * i32(width);

      let kernelIndex = (kx + 1) + (ky + 1) * 3;
      gradientX += f32(gx[kernelIndex]) * inputImage[neighborIndex];
      gradientY += f32(gy[kernelIndex]) * inputImage[neighborIndex];
    }
  }

  let magnitude = sqrt(gradientX * gradientX + gradientY * gradientY);
  outputImage[index] = magnitude;
}
