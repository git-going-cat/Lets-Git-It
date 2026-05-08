import { useCommandInput } from '../hooks/useCommandInput';

export default function CommandInput() {
  const {
    inputRef,
    inputValue,
    historyText,
    isError,
    isPlaying,
    handleInputChange,
    handleKeyDown,
  } = useCommandInput();

  return (
    // overflow-hidden으로 영역 제한, padding 4px 8px로 NES.css 4px box-shadow 확장 공간 확보
    <div className="font-pixel mx-auto flex h-full w-full flex-col justify-center gap-2 overflow-hidden px-2 py-1">
      {/* box-sizing: border-box → border 4px가 width 안에 포함 → 100%가 부모 기준으로 정확히 맞음 */}
      <div
        className={`nes-container is-dark box-border w-full px-2.5 py-1.5 ${isError ? 'is-error' : ''}`}
      >
        {historyText ? (
          <p className={`m-0 !text-2xl ${isError ? 'text-red-400' : 'text-green-400'}`}>
            {historyText}
          </p>
        ) : (
          <p className="m-0 !text-2xl text-gray-500">Waiting for input...</p>
        )}
      </div>

      <div className="nes-field w-full">
        <input
          ref={inputRef}
          type="text"
          id="command_input"
          className="nes-input is-dark box-border w-full !text-2xl"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCopy={(e) => e.preventDefault()}
          onPaste={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          disabled={!isPlaying}
          autoComplete="off"
          spellCheck="false"
          autoFocus
        />
      </div>
    </div>
  );
}
