export const isKrathongId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function krathongLink(id: string, base = window.location.href) {
  if (!isKrathongId(id)) throw Error("Invalid krathong ID");
  const url = new URL(base);
  url.search = "";
  url.hash = "";
  url.searchParams.set("krathong", id);
  return url.href;
}
export function bindShare(
  button: HTMLButtonElement,
  getItem: () => { id: string; name: string } | null,
  container: HTMLElement,
) {
  const status = container.querySelector<HTMLElement>("[data-share-status]")!;
  const manual =
    container.querySelector<HTMLInputElement>("[data-share-link]")!;
  button.addEventListener("click", async () => {
    const item = getItem();
    if (!item) return;
    const url = krathongLink(item.id);
    status.textContent = "";
    manual.hidden = true;
    button.disabled = true;
    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "คืนลอยกระทง · NAVAIT",
            text: `มาชมกระทงและคำอธิษฐานของ ${item.name}`,
            url,
          });
          status.textContent = "ส่งต่อคำอธิษฐานแล้ว";
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
        }
      }
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url);
          status.textContent = "คัดลอกลิงก์แล้ว ส่งให้คนสำคัญได้เลย";
          return;
        } catch {
          /* Offer a selectable URL when clipboard permission is unavailable. */
        }
      }
      manual.value = url;
      manual.hidden = false;
      manual.focus();
      manual.select();
      status.textContent = "คัดลอกลิงก์ด้านบนเพื่อส่งให้เพื่อน";
    } finally {
      button.disabled = false;
    }
  });
}
