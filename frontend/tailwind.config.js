/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F0D0A',
        surface: '#1A1712',
        surface2: '#24201A',
        tabbar: '#14120E',
        line: '#2E2920',
        line2: '#3E372B',
        ink: '#F6EEDF',
        soft: '#CDC3B0',
        muted: '#9C927F',
        dis: '#5F5747',
        accent: '#F59E0B',
        tint: '#2A1F0C',
        tint2: '#33250C',
        ok: '#5FD39A',
        okbg: '#14261D',
        warn: '#F2B84B',
        warnbg: '#2A2112',
        bad: '#F06A6A',
        badbg: '#2B1414',
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
