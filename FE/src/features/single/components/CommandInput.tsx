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
    <div
      className="flex flex-col gap-4 p-4 w-full h-full max-w-2xl mx-auto"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      <div className={`nes-container is-dark with-title ${isError ? 'is-error' : ''}`}>
        {historyText ? (
          <p className={`text-lg ${isError ? 'text-red-400' : 'text-green-400'}`}>{historyText}</p>
        ) : (
          <p className="text-gray-500 text-sm">Waiting for input...</p>
        )}
      </div>
      <div className="nes-field relative">
        <input
          ref={inputRef}
          type="text"
          id="command_input"
          className="nes-input is-dark w-full text-sm"
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
