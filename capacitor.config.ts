import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vladimirgronat.todolist',
  appName: 'TodoList',
  webDir: 'out',
  server: {
    url: 'https://todolist-demo-ecru.vercel.app',
    cleartext: false,
  },
};

export default config;
