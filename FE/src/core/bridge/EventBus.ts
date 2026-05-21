// 전역 이벤트 버스 진입점.
// 도메인별 이벤트는 각 feature의 bridge 디렉터리에서 TypedEventBus<TMap>을 인스턴스화해 사용합니다.
// 현재 싱글 플레이 이벤트는 features/single/bridge/singleBus.ts로 이전되었습니다.
export { TypedEventBus } from './TypedEventBus';
