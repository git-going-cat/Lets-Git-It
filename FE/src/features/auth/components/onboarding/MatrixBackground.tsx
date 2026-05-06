import { useEffect, useRef } from 'react';

const CHARS = '0123456789ABCDEFgit push pull merge branch commit rebase ABCDEF0123456789';

/**
 * Matrix 스타일의 낙하 문자 배경 캔버스.
 * 어두운 붉은 색조로 렌더링되어 에러/경고 분위기를 연출합니다.
 */
export default function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array.from({ length: columns }, () => Math.floor(Math.random() * -50));

    let animId: number;

    const draw = () => {
      // 페이드 효과: 반투명 검정으로 덮어씀
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 어두운 붉은 계열 문자 (너무 눈에 띄지 않도록 낮은 명도)
      ctx.fillStyle = 'rgba(120, 20, 20, 0.55)';
      ctx.font = `${fontSize}px monospace`;

      // columns가 canvas 크기 변경에 따라 달라질 수 있어 재계산
      columns = Math.floor(canvas.width / fontSize);
      while (drops.length < columns) drops.push(0);

      for (let i = 0; i < columns; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0" aria-hidden="true" />;
}
