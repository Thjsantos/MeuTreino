// Valida o openapi.yaml. Requer @apidevtools/swagger-parser (no CI: npm install --no-save @apidevtools/swagger-parser@10).
const fs = require('node:fs');
const path = require('node:path');
const SwaggerParser = require('@apidevtools/swagger-parser');

const arquivo = path.join(__dirname, '..', 'openapi.yaml');
const resumo = linha => { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, linha + '\n'); };

SwaggerParser.validate(arquivo)
  .then(api => {
    const msg = `OpenAPI válido: ${Object.keys(api.paths).length} caminhos`;
    console.log(msg);
    resumo(`\n### ✅ openapi.yaml válido\n${Object.keys(api.paths).length} caminhos documentados.\n`);
  })
  .catch(e => {
    console.error('openapi.yaml inválido:\n' + e.message);
    resumo(`\n### ❌ openapi.yaml inválido\n\`\`\`\n${e.message}\n\`\`\`\n`);
    process.exit(1);
  });
