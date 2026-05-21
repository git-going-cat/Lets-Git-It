import SharedCommandInput from '@/shared/components/CommandInput';

import { useCommandInput } from '../hooks/useCommandInput';

export default function CommandInput() {
  const {
    inputRef,
    inputValue,
    history,
    isInputDisabled,
    activeBranch,
    handleInputChange,
    handleKeyDown,
  } = useCommandInput();

  return (
    <SharedCommandInput
      inputRef={inputRef}
      value={inputValue}
      history={history}
      isPlaying={!isInputDisabled}
      activeBranch={activeBranch}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
    />
  );
}
