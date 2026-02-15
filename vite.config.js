import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@mediapipe/hands/*',
          dest: 'mediapipe/hands',
        },
        {
          src: 'node_modules/@mediapipe/face_detection/*',
          dest: 'mediapipe/face_detection',
        },
      ],
    }),
  ],
});
