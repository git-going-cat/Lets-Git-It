import { useCoopInput } from '../hooks/useCoopInput';

export default function SimpleInputBar() {
  const {
    inputRef,
    inputValue,
    isDisabled,
    isShaking,
    placeholder,
    setInputValue,
    submitInput,
    handleKeyDown,
    setIsShaking,
  } = useCoopInput();

  return (
    <div
      className={`relative z-20 flex h-16 shrink-0 items-center gap-3 border-t-4 border-dotted border-[#05AFF2] bg-[#0d1117]/95 px-6 font-pixel text-white ${
        isShaking ? 'animate-screen-shake' : ''
      }`}
      onAnimationEnd={() => setIsShaking(false)}
    >
      <span className="select-none text-base text-[#76BF41]">(coop)</span>
      <span className="select-none text-xl text-[#76BF41]">$</span>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onCopy={(event) => event.preventDefault()}
        onPaste={(event) => event.preventDefault()}
        onCut={(event) => event.preventDefault()}
        disabled={isDisabled}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-lg text-white outline-none placeholder:text-gray-500 disabled:cursor-not-allowed"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="nes-btn is-primary !px-3 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isDisabled}
        onClick={submitInput}
      >
        ENTER
      </button>
    </div>
  );
}
