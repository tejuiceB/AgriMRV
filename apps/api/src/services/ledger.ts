import pool from '../config/database';

/** MVP: pretend anchoring by storing a signed record */
export async function anchorHash(pkgId: string, hashHex: string) {
  // In real mode, send tx and get txId; here we simulate:
  const txId = `sim-${Date.now()}-${hashHex.slice(0,10)}`;
  
  await pool.query(
    `UPDATE "MRVPackage" SET "ledgerTxId" = $1 WHERE id = $2`,
    [txId, pkgId]
  );
  
  return { txId };
}
