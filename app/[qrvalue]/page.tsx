import { redirect } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────
// Tahle stránka odchytí VŠECHNY jednoúrovňové adresy, které neodpovídají
// žádné jiné stránce (Next.js dá vždy přednost pevným routám jako /join,
// /intro, /admin, /profile, /leaderboard, /story – takže je nijak
// neovlivní).
//
// Typicky sem spadne třeba /q1, /q2, … /q10 – tedy přesně to, co je
// zakódované v QR kódu na stanovišti. Pokud takovou adresu otevře někdo
// mimo hru (naskenuje si to vlastním fotoaparátem místo tlačítka „QR kód“
// ve hře), nemá smysl mu cokoliv ukazovat – jednoduše ho pošleme na úvodní
// stránku hry.
//
// Uvnitř hry se stejná hodnota (např. „q3“) NIKDY nenačítá přes tuto routu –
// scanner v app/story/questions/[qrcode]/page.tsx čte QR kód přes kameru
// (getUserMedia + jsQR) a porovnává přečtenou hodnotu s tou, kterou už má
// z databáze, aniž by prohlížeč kamkoliv navigoval. Proto tahle stránka
// nemusí (a nemá) nic kontrolovat – jen přesměrovává.
// ─────────────────────────────────────────────────────────────────────────
export default function CatchAllRedirect() {
  redirect("/");
}
