/**
 * CONFLICT 미니게임 모달에 보여 줄 가짜 diff 시나리오.
 * 모달 진입 시 한 개를 랜덤 선택해 head/incoming 코드 비교 영역을 채웁니다.
 */
export interface ConflictScenario {
  head: string[];
  incoming: string[];
}

export const CONFLICT_SCENARIOS: ConflictScenario[] = [
  {
    head: ['function add(a, b) {', '  return a + b;', '}'],
    incoming: ['function add(a, b) {', '  console.log(a, b);', '  return a + b;', '}'],
  },
  {
    head: ['const PORT = 3000;', "const HOST = 'localhost';"],
    incoming: ['const PORT = 8080;', "const HOST = '0.0.0.0';"],
  },
  {
    head: ['const config = {', '  debug: false,', '  retry: 3,', '};'],
    incoming: ['const config = {', '  debug: true,', '  retry: 5,', '};'],
  },
  {
    head: ["import { Foo } from './foo';", '', 'export default Foo;'],
    incoming: [
      "import { Foo } from './foo';",
      "import { Bar } from './bar';",
      '',
      'export default { Foo, Bar };',
    ],
  },
];
