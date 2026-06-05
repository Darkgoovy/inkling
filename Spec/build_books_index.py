#!/usr/bin/env python3
"""
build_books_index.py
--------------------
Génère l'index `books.json` en scannant un dossier de fichiers JSON de livres.

À lancer avant le déploiement (ou à la demande). Aucune dépendance externe.

Chaque fichier de livre attendu (cf. spec §4.2) :
    {
      "version": 1,
      "id": "...",
      "title": "...",
      "author": "...",
      "cover": "...",
      "accentColor": "#RRGGBB",
      "cards": [ { ... }, ... ]
    }

Index produit (cf. spec §4.1) :
    {
      "version": 1,
      "books": [
        { "id", "title", "author", "cover", "accentColor", "cardCount", "file" },
        ...
      ]
    }

Exemples :
    python build_books_index.py
    python build_books_index.py --books-dir public/books --output public/books.json
    python build_books_index.py --sort title
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

INDEX_VERSION = 1
REQUIRED_BOOK_FIELDS = ("id", "title", "author", "cover", "accentColor", "cards")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Génère l'index books.json à partir des fichiers JSON de livres."
    )
    parser.add_argument(
        "--books-dir",
        default="books",
        help="Dossier contenant les fichiers JSON de livres (défaut: books).",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Chemin du fichier index à écrire (défaut: <parent de books-dir>/books.json).",
    )
    parser.add_argument(
        "--sort",
        choices=("title", "id", "filename"),
        default="title",
        help="Ordre des livres dans l'index (défaut: title).",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Échoue (code retour 1) si un livre est invalide, au lieu de l'ignorer.",
    )
    return parser.parse_args()


def warn(message: str) -> None:
    print(f"  ⚠️  {message}", file=sys.stderr)


def load_book(path: Path) -> dict | None:
    """Lit un fichier de livre, le valide, et renvoie son entrée d'index (ou None)."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        warn(f"{path.name}: JSON invalide ({exc}). Ignoré.")
        return None
    except OSError as exc:
        warn(f"{path.name}: lecture impossible ({exc}). Ignoré.")
        return None

    if not isinstance(data, dict):
        warn(f"{path.name}: la racine n'est pas un objet JSON. Ignoré.")
        return None

    missing = [f for f in REQUIRED_BOOK_FIELDS if f not in data]
    if missing:
        warn(f"{path.name}: champs manquants {missing}. Ignoré.")
        return None

    if not isinstance(data["cards"], list) or not data["cards"]:
        warn(f"{path.name}: 'cards' doit être une liste non vide. Ignoré.")
        return None

    book_id = data["id"]
    expected_name = f"{book_id}.json"
    if path.name != expected_name:
        warn(
            f"{path.name}: le nom de fichier ne correspond pas à l'id "
            f"(attendu '{expected_name}'). L'app retrouve les livres via 'file', "
            f"donc l'index restera cohérent, mais aligne-les pour plus de clarté."
        )

    return {
        "id": book_id,
        "title": data["title"],
        "author": data["author"],
        "cover": data["cover"],
        "accentColor": data["accentColor"],
        "cardCount": len(data["cards"]),
        "file": f"books/{book_id}.json",
        # clé interne pour le tri par nom de fichier ; retirée avant écriture
        "_filename": path.name,
    }


def main() -> int:
    args = parse_args()

    books_dir = Path(args.books_dir)
    if not books_dir.is_dir():
        print(f"❌ Dossier introuvable : {books_dir}", file=sys.stderr)
        return 1

    output_path = (
        Path(args.output) if args.output else books_dir.parent / "books.json"
    )

    # On exclut un éventuel books.json présent dans le dossier scanné.
    files = sorted(
        p for p in books_dir.glob("*.json") if p.name != "books.json"
    )

    print(f"🔎 Scan de {books_dir} : {len(files)} fichier(s) JSON trouvé(s).")

    entries: list[dict] = []
    seen_ids: dict[str, str] = {}
    had_error = False

    for path in files:
        entry = load_book(path)
        if entry is None:
            had_error = True
            continue

        book_id = entry["id"]
        if book_id in seen_ids:
            warn(
                f"{path.name}: id en double '{book_id}' "
                f"(déjà vu dans {seen_ids[book_id]}). Cette version remplace la précédente."
            )
            entries = [e for e in entries if e["id"] != book_id]
            had_error = True

        seen_ids[book_id] = path.name
        entries.append(entry)
        print(f"  ✓ {path.name} → {entry['cardCount']} carte(s)")

    if args.strict and had_error:
        print("❌ Mode strict : des livres étaient invalides. Aucun index écrit.", file=sys.stderr)
        return 1

    # Tri déterministe
    if args.sort == "title":
        entries.sort(key=lambda e: e["title"].lower())
    elif args.sort == "id":
        entries.sort(key=lambda e: e["id"])
    else:  # filename
        entries.sort(key=lambda e: e["_filename"])

    # Nettoyage des clés internes
    for e in entries:
        e.pop("_filename", None)

    index = {"version": INDEX_VERSION, "books": entries}

    output_path.write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"✅ Index écrit : {output_path} ({len(entries)} livre(s)).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
