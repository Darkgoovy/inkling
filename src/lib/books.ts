import type { Book, BooksIndex, Card } from "../types";

// Base relative gérée par Vite (import.meta.env.BASE_URL).
const base = import.meta.env.BASE_URL;

/** Charge l'index léger des livres (cf. spec §4.1). */
export async function loadBooksIndex(): Promise<BooksIndex> {
  const res = await fetch(`${base}books.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Impossible de charger books.json (${res.status})`);
  const data = (await res.json()) as BooksIndex;
  if (!data || !Array.isArray(data.books)) {
    throw new Error("books.json mal formé");
  }
  return data;
}

/**
 * Charge un livre et filtre les cartes invalides (cf. spec §4.3) :
 * une carte incomplète ou n'ayant pas exactement 3 tags est ignorée et journalisée.
 */
export async function loadBook(file: string): Promise<Book> {
  const res = await fetch(`${base}${file}`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Impossible de charger ${file} (${res.status})`);
  const raw = (await res.json()) as Book;

  const cards = (raw.cards ?? []).filter((c) => isValidCard(c, raw.id));
  cards.sort((a, b) => a.order - b.order);

  return { ...raw, cards };
}

function isValidCard(card: Card, bookId: string): boolean {
  const problems: string[] = [];
  if (!card || typeof card !== "object") return false;
  if (!card.id) problems.push("id manquant");
  if (typeof card.order !== "number") problems.push("order manquant/invalide");
  if (!card.title) problems.push("title manquant");
  if (!card.subtitle) problems.push("subtitle manquant");
  if (!Array.isArray(card.tags) || card.tags.length !== 3)
    problems.push("tags ≠ 3");
  if (!card.summary) problems.push("summary manquant");
  if (!card.keyIdea) problems.push("keyIdea manquant");
  if (!card.action) problems.push("action manquant");

  if (problems.length > 0) {
    console.warn(
      `[Inkling] Carte ignorée dans « ${bookId} » (${card?.id ?? "?"}) : ${problems.join(", ")}.`,
    );
    return false;
  }
  return true;
}
