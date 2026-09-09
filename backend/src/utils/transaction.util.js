const { pool } = require('../config/db');
async function transaction(work) {
  for (let intento = 0; ; intento++) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      if (error.code !== 'ER_LOCK_DEADLOCK' || intento >= 2) throw error;
    } finally { connection.release(); }
  }
}
module.exports = transaction;
