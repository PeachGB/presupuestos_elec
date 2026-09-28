export type Notify = (message: string) => void;

export function createToast(el: HTMLElement, durationMs = 2400): Notify {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (message) => {
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('is-visible'), durationMs);
  };
}
