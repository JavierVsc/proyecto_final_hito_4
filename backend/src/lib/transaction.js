export async function withTransaction(db, work) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { console.error('Error en rollback:', rollbackError); }
    throw error;
  } finally {
    client.release();
  }
}
