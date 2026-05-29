/** Vercel / AWS Lambda など書き込み不可の実行環境 */
function isServerless() {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.FUNCTIONS_WORKER_RUNTIME
  );
}

function canWriteToDisk() {
  return !isServerless();
}

module.exports = { isServerless, canWriteToDisk };
