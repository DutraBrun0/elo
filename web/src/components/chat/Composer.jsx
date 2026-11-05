import { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

const MAX_LENGTH = 4000;
const TYPING_IDLE_MS = 2000;

/**
 * Campo de mensagem. Enter envia, Shift+Enter quebra linha.
 * Emite "typing:start" uma vez ao começar a digitar e "typing:stop" após 2s parado
 * (ou ao enviar) — e não um evento por tecla.
 */
export function Composer({ onSend, onTyping, disabled }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const typingRef = useRef({ active: false, timer: null });

  const stopTyping = () => {
    clearTimeout(typingRef.current.timer);
    if (typingRef.current.active) onTyping(false);
    typingRef.current.active = false;
  };

  const handleChange = (event) => {
    setText(event.target.value);
    if (!typingRef.current.active) {
      typingRef.current.active = true;
      onTyping(true);
    }
    clearTimeout(typingRef.current.timer);
    typingRef.current.timer = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const submit = (event) => {
    event?.preventDefault();
    const content = text.trim();
    if (!content || disabled) return;
    onSend(content);
    setText('');
    stopTyping();
    textareaRef.current?.focus();
  };

  // Cresce com o texto até ~6 linhas.
  useEffect(() => {
    const el = textareaRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  // Ao trocar de conversa (desmontar), avisa que parou de digitar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => stopTyping, []);

  return (
    <form
      onSubmit={submit}
      className="shrink-0 border-t border-line px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <label className="flex-1">
          <span className="sr-only">Mensagem</span>
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            maxLength={MAX_LENGTH}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
            }}
            placeholder="Escreva uma mensagem"
            className="block max-h-40 min-h-11 w-full resize-none rounded-md border border-line bg-canvas px-3.5 py-2.5 text-[15px] text-body placeholder:text-faint transition-colors duration-150 hover:border-subtle focus:border-iris focus:outline-none"
          />
        </label>
        <Button
          type="submit"
          size="icon"
          className="h-11 w-11"
          disabled={!text.trim() || disabled}
          aria-label="Enviar"
        >
          <SendHorizontal size={18} strokeWidth={1.5} />
        </Button>
      </div>
    </form>
  );
}
