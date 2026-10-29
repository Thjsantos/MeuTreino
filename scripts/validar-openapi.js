// Valida o openapi.yaml e grava o resultado em resultado-openapi.json (lido pelo relatório).
// Requer @apidevtools/swagger-parser (no CI: npm install --no-save @apidevtools/swagger-parser@10).
const fs = require('node:fs');
const path = require('node:path');
const SwaggerParser = require('@apidevtools/swagger-parser');

const gravar = r => fs.writeFileSync('resultado-openapi.json', JSON.stringify(r));

SwaggerParser.validate(path.join(__dirname, '..', 'public', 'openapi.yaml'))
  .then(api => {
    const caminhos = Object.keys(api.paths).length;
    gravar({ ok: true, caminhos });
    console.log(`OpenAPI válido: ${caminhos} caminhos`);
  })
  .catch(e => {
    gravar({ ok: false, erro: e.message });
    console.error('openapi.yaml inválido:\n' + e.message);
    process.exit(1);
  });
