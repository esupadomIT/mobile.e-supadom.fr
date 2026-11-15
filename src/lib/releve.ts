import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Reglement } from '@/lib/api';

/**
 * « Relevé de paiements » en PDF, même contenu que le bouton « Export PDF »
 * de « Mes règlements » sur le site : tableau Date / Objet / Montant / Statut / Référence,
 * puis total et nombre de paiements réussis, en attente et échoués.
 */

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const euros = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n).replace(/ | /g, ' ');

const date = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR');
};

const statut = (s: string) => (s === 'Approved' ? 'Payé' : s === 'Pending' ? 'En attente' : 'Échoué');

export function releveHtml(paiements: Reglement[], who: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
  const total = paiements.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const approved = paiements.filter((p) => p.status === 'Approved').length;
  const pending = paiements.filter((p) => p.status === 'Pending').length;
  const failed = paiements.length - approved - pending;
  const rows = paiements
    .map(
      (p) => `<tr>
        <td>${esc(date(p.createdAt))}</td>
        <td>${esc((p.subject ?? '').replace(/_/g, ' '))}</td>
        <td class="num">${esc(euros(Number(p.amount) || 0))}</td>
        <td>${esc(statut(p.status))}</td>
        <td class="ref">${esc(p.token || 'N/A')}</td>
      </tr>`,
    )
    .join('');
  const name = `${(who.firstName || 'N/A').toUpperCase()} ${(who.lastName || 'N/A').toUpperCase()}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  @page { margin: 18mm; }
  body { font-family: Helvetica, Arial, sans-serif; color: #212121; font-size: 11px; }
  h1 { text-align: center; font-size: 20px; margin: 0 0 18px; }
  .info { color: #646464; line-height: 1.7; border-bottom: 1px solid #c8c8c8; padding-bottom: 10px; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #2980b9; color: #fff; text-align: left; font-size: 10px; padding: 6px; border: 1px solid #c8c8c8; }
  td { padding: 5px 6px; border: 1px solid #c8c8c8; font-size: 9px; }
  tr:nth-child(even) td { background: #f5f5f5; }
  .num { white-space: nowrap; }
  .ref { word-break: break-all; }
  h2 { font-size: 13px; margin: 20px 0 8px; }
  .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; }
  .stats { line-height: 1.8; margin-top: 6px; }
  footer { margin-top: 28px; font-size: 8px; color: #969696; text-align: center; }
</style></head><body>
  <h1>RELEVÉ DE PAIEMENTS</h1>
  <div class="info">
    Étudiant : ${esc(name)}<br />
    Email : ${esc(who.email || 'N/A')}<br />
    Date de génération : ${esc(new Date().toLocaleDateString('fr-FR'))}
  </div>
  <table>
    <thead><tr><th>Date</th><th>Objet</th><th>Montant</th><th>Statut</th><th>Référence</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <h2>RÉSUMÉ</h2>
  <div class="total"><span>Total des paiements :</span><span>${esc(euros(total))}</span></div>
  <div class="stats">
    Paiements réussis : ${approved}<br />
    En attente : ${pending}<br />
    Échoués : ${failed}
  </div>
  <footer>e-Supadom · Relevé généré depuis l’application</footer>
</body></html>`;
}

/** Génère le PDF puis ouvre la feuille de partage (Enregistrer dans Fichiers, Mail…). */
export async function exportReleve(paiements: Reglement[], who: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
  const { uri } = await Print.printToFileAsync({ html: releveHtml(paiements, who) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Relevé de paiements' });
  } else {
    await Print.printAsync({ uri });
  }
}
