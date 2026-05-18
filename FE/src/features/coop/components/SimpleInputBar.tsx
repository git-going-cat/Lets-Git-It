import SharedCommandInput from '@/shared/components/CommandInput';

import { useCoopInput } from '../hooks/useCoopInput';

export default function SimpleInputBar() {
  const {
    inputRef,
    inputValue,
    history,
    isInputDisabled,
    isShaking,
    activeBranch,
    handleInputChange,
    handleKeyDown,
    setIsShaking,
  } = useCoopInput();

  return (
    <div
      className={`relative z-20 w-full h-full ${isShaking ? 'animate-screen-shake' : ''}`}
      onAnimationEnd={() => setIsShaking(false)}
    >
      <SharedCommandInput
        inputRef={inputRef}
        value={inputValue}
        history={history}
        isPlaying={!isInputDisabled}
        activeBranch={activeBranch}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
