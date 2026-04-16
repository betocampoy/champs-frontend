# ⚙️ Champs Core JS

Micro-framework JavaScript modular para padronização de comportamentos
de interface (JS puro).

Funcionalidades:
- Realizar requisições Ajax sem a necessidade de escrever código, usando somente atributos data (AjaxForm)
- Pesquisar cep e preencher formulários automáticamente (ZipcodeSearch)
- Ocultar/Visualizar informações sensíveis (VisibilityToogle)
- Alterar o campo e preencher outros dinamicamente (FormPopulate)
- etc

------------------------------------------------------------------------

# 📥 Instalação

1)  Copie a pasta `champs-core-js` para dentro do seu projeto (exemplo:
    `/assets/champs-core-js/`).

2)  Crie um arquivo de inicialização JS no seu projeto (ex:
    `app-init.js`) com o conteúdo abaixo:

``` js
import { initCore } from '/assets/champs-core-js/src/init.js';

document.addEventListener('DOMContentLoaded', () => {
  initCore(document);
});
```

3)  Inclua esse arquivo no seu layout HTML com `type="module"`:

``` html
<script type="module" src="/assets/app-init.js"></script>
```

4)  Link o CSS do módulo no seu projeto:

``` html
<link rel="stylesheet" href="/assets/champs-core-js/src/styles/champs-core-js.css">
```

------------------------------------------------------------------------

## ✅ Módulos Disponíveis

Legenda: - ✅ Refatorado (em `src/modules/`) - 🕘 Legado (ainda fora de
`src/modules/`)

| Módulo principal      | Status | Responsabilidade
|-----------------------|--------| --- |
| `InputSanitize.js`    | ✅      | Sanitização e normalização de texto
| `InputMask.js`        | ✅      | Máscaras simples (telefone, CPF, data etc.)
| `DynamicColspan.js`   | ✅      | Ajuste automático de colspan em tabelas
| `ZipcodeSearch.js`    | ✅      | Busca CEP via ViaCEP com data-attributes              
| `VisibilityToggle.js` | ✅      | Alterna visualização de campos sensíveis              
| `CheckboxGroup.js`    | ✅      | Controle de checkboxes em grupo com contadores e soma 
| `CopyText.js`         | ✅      | Cópia de texto com múltiplos modos e feedback visual 
| `AjaxForm.js`         | ✅      | Realiza o envio via ajax e manipula a resposta conforme a ação recebida 
| `AutoOpen.js`         | ✅      | Permite abrir automaticamente elementos que já possua comportamento declarativo 
| `ConsentManager.js`   | ✅      | Gerencia consentimento de cookies e categorias de rastreamento (LGPD). 
| `Validate.js`         | ✅      | Validação declarativa (via data-*) de documentos (CPF, CNPJ e IE)  

# 🧼 InputSanitize (✅)

Arquivo: `src/modules/InputSanitize.js`

Normaliza entradas de texto usando `data-champs-*`.

## Atributos

  ----------------------------------------------------------------------------
| Data Attribute | Descrição
|----|----
|`data-champs-sanitize` | Ativa o módulo
|`data-champs-sanitize-trim` | Remove espaços no início/fim (blur)
|`data-champs-sanitize-collapse-spaces` | Substitui múltiplos espaços por 1 (blur)
|`data-champs-sanitize-no-spaces` | Remove todos os espaços
|`data-champs-sanitize-normalize` | Remove acentos
|`data-champs-sanitize-upper` | Converte para maiúsculo
|`data-champs-sanitize-lower` | Converte para minúsculo
|`data-champs-sanitize-max="N"` | Limita a N caracteres

Evento disparado: champs:sanitized

------------------------------------------------------------------------

# 🎭 InputMask (✅)

Arquivo: `src/modules/InputMask.js`

Aplica máscaras simples usando `data-champs-mask`.

## Tokens Suportados

Token    Significado
  -------- -------------------
`9`      Dígito (0-9)
`A`      Letra (a-z / A-Z)
`*`      Alfanumérico
Outros   Literal fixo

Evento disparado: champs:masked

------------------------------------------------------------------------

# 📊 DynamicColspan (✅)

Arquivo: `src/modules/DynamicColspan.js`

Define automaticamente o atributo colspan para células marcadas com:

data-champs-dynamic-colspan

## Funcionamento

1.  Prioriza o thead, somando todos os th e respeitando colspan.
2.  Caso não exista thead, usa a primeira linha do tbody.
3.  Aplica o colspan calculado na célula alvo.
4.  Marca internamente para evitar reprocessamento.

Exemplo:

```{=html}
<td data-champs-dynamic-colspan>
```
Sem registros
```{=html}
</td>
```

------------------------------------------------------------------------

# 📍 ZipcodeSearch (✅)

Arquivo: `src/modules/ZipcodeSearch.js`

Busca dados do CEP usando a API ViaCEP e preenche campos automaticamente
via `data-champs-*`.

## 📌 Input do CEP

  ---------------------------------------------------------------------------------------
Atributo                                            Descrição
  --------------------------------------------------- -----------------------------------
`data-champs-zipcode`                               Ativa a busca de CEP

`data-champs-zipcode-group="grupo"`                 Agrupa campos relacionados

`data-champs-zipcode-trigger="change|blur|input"`   Define evento disparador (default:
change)
  ---------------------------------------------------------------------------------------

Exemplo:

`<input
type="text"
data-champs-zipcode
data-champs-zipcode-group="endereco1"
data-champs-zipcode-trigger="change"
>`{=html}

------------------------------------------------------------------------

## 🧾 Campos de Destino

Valor de `data-champs-zipcode-field`   Preenchido com
  -------------------------------------- ----------------------------
`street`                               logradouro
`neighborhood`                         bairro
`city`                                 localidade
`state`                                UF
`complement`                           complemento
`stateName`                            estado (quando disponível)
`region`                               região (quando disponível)
`ddd`                                  DDD
`error`                                Mensagem de erro
`json`                                 JSON completo formatado

------------------------------------------------------------------------

## 🔔 Evento Disparado

Após a execução:

champs:zipcode

Detalhes disponíveis em event.detail:

{ zip: "01001000", data: {...}, error: "invalid_zip" \| "not_found" }

------------------------------------------------------------------------

# 👁 VisibilityToggle (✅)

Arquivo: `src/modules/VisibilityToggle.js`

Alterna a visualização de campos sensíveis agrupados por:

data-champs-visibility-group="grupo"

## Botão Trigger

  -------------------------------------------------------------------------------------
Atributo                                          Descrição
  ------------------------------------------------- -----------------------------------
`data-champs-visibility-toggle`                   Define o botão de alternância

`data-champs-visibility-group="grupo"`            Grupo que será alternado

`data-champs-visibility-icon-show`                Ícone quando oculto

`data-champs-visibility-icon-hide`                Ícone quando visível

`data-champs-visibility-icon-mode="class|html"`   Define modo do ícone (default:
class)
  -------------------------------------------------------------------------------------

## Comportamento

-   INPUT type="password" → alterna entre password/text
-   Outros INPUTs → alterna para password preservando value (não altera
    submit)
-   Elementos não-input → alterna classe d-none
-   Grupo inicia sincronizado automaticamente com o estado do password

Evento disparado:

champs:visibility

------------------------------------------------------------------------

A cada novo módulo migrado para src/modules/, sua documentação será
adicionada abaixo mantendo os blocos anteriores intactos.

------------------------------------------------------------------------

# ☑️ CheckboxGroup (✅)

Arquivo: `src/modules/CheckboxGroup.js`

Controle de seleção em grupo para checkboxes (selecionar todos, contador
e soma total) usando `data-champs-*`.

## Atributos do Parent (Selecionar todos)

  -----------------------------------------------------------------------------------
Atributo                                        Descrição
  ----------------------------------------------- -----------------------------------
`data-champs-checkbox-parent`                   Define o checkbox pai
(seleciona/desmarca todos)

`data-champs-checkbox-group="grupo"`            Identificador do grupo

`data-champs-checkbox-counter="CSS selector"`   (Opcional) Seletor do(s)
elemento(s) que receberão o total
de itens selecionados

`data-champs-checkbox-total="CSS selector"`     (Opcional) Seletor do(s)
elemento(s) que receberão a soma
dos valores selecionados
  -----------------------------------------------------------------------------------

## Atributos do Child (Itens do grupo)

  -----------------------------------------------------------------------------------
Atributo                                        Descrição
  ----------------------------------------------- -----------------------------------
`data-champs-checkbox-child`                    Define um checkbox filho

`data-champs-checkbox-group="grupo"`            Identificador do grupo

`data-champs-checkbox-value="10.50"`            (Opcional) Valor numérico do item
para somar no total (aceita vírgula
ou ponto)

`data-champs-checkbox-counter="CSS selector"`   (Opcional) Mesmo do parent (permite
o child atualizar contador)

`data-champs-checkbox-total="CSS selector"`     (Opcional) Mesmo do parent (permite
o child atualizar total)
  -----------------------------------------------------------------------------------

## Comportamento

-   Ao marcar/desmarcar o **parent**, todos os **children** do mesmo
    grupo serão marcados/desmarcados.
-   Ao marcar/desmarcar um **child**, o módulo recalcula:
    -   quantidade selecionada (count)
    -   soma total (total)
    -   e marca o parent automaticamente quando todos os children
        estiverem selecionados.
-   Se `counter` / `total` não forem informados, o módulo apenas
    controla a seleção (sem atualizar UI).

## Exemplo

``` html
<label class="form-check">
  <input
    type="checkbox"
    class="form-check-input"
    data-champs-checkbox-parent
    data-champs-checkbox-group="grupo1"
    data-champs-checkbox-counter="#contador"
    data-champs-checkbox-total="#soma"
  >
  <span class="form-check-label">Selecionar todos</span>
</label>

<div class="ms-3">
  <label class="form-check">
    <input
      type="checkbox"
      class="form-check-input"
      data-champs-checkbox-child
      data-champs-checkbox-group="grupo1"
      data-champs-checkbox-counter="#contador"
      data-champs-checkbox-total="#soma"
      data-champs-checkbox-value="10"
    >
    Item 1 (10)
  </label><br>

  <label class="form-check">
    <input
      type="checkbox"
      class="form-check-input"
      data-champs-checkbox-child
      data-champs-checkbox-group="grupo1"
      data-champs-checkbox-counter="#contador"
      data-champs-checkbox-total="#soma"
      data-champs-checkbox-value="20"
    >
    Item 2 (20)
  </label><br>

  <label class="form-check">
    <input
      type="checkbox"
      class="form-check-input"
      data-champs-checkbox-child
      data-champs-checkbox-group="grupo1"
      data-champs-checkbox-counter="#contador"
      data-champs-checkbox-total="#soma"
      data-champs-checkbox-value="30"
    >
    Item 3 (30)
  </label>
</div>

<p class="mt-2">Total selecionados: <span id="contador">0</span></p>
<p>Soma total: <span id="soma">0</span></p>
```

## Evento Disparado

Após qualquer alteração no grupo:

    champs:checkbox-group

Detalhes disponíveis em `event.detail`:

``` js
{
  group: "grupo1",
  count: 2,
  total: 30,
  allChecked: false
}
```

------------------------------------------------------------------------

# 📋 CopyText (✅)

Arquivo: `src/modules/CopyText.js`

Permite copiar texto para a área de transferência com um clique,
utilizando `data-champs-*`.

------------------------------------------------------------------------

## 🎯 Modos de Uso

### 1️⃣ Copiar texto direto

Atributo                        Descrição
  ------------------------------- --------------------------------
`data-champs-copy-text="..."`   Texto literal que será copiado

Exemplo:

``` html
<button data-champs-copy-text="Pedido #12345">
  Copiar código
</button>
```

------------------------------------------------------------------------

### 2️⃣ Copiar de outro elemento

Atributo                             Descrição
  ------------------------------------ ------------------------------
`data-champs-copy-from="#seletor"`   Seletor CSS do elemento alvo

Prioridade de leitura:

-   `value`
-   `innerText`
-   `textContent`

Exemplo:

``` html
<span id="serial">ABC123XYZ</span>

<button data-champs-copy-from="#serial">
  Copiar
</button>
```

------------------------------------------------------------------------

### 3️⃣ Copiar o próprio elemento

Atributo             Descrição
  -------------------- ---------------------------------
`data-champs-copy`   Ativa cópia do próprio conteúdo

Exemplo:

``` html
<button data-champs-copy>
  0800 123 456
</button>
```

------------------------------------------------------------------------

## 🧩 Atributos Opcionais

  -----------------------------------------------------------------------
Atributo                          Descrição
  --------------------------------- -------------------------------------
`data-champs-check="#checkbox"`   Marca automaticamente um checkbox
após copiar

`data-champs-copied-text="..."`   Define o texto exibido no feedback
visual (default: "Copiado!")
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 🎨 Feedback Visual

O módulo aplica temporariamente:

-   Classe `.champs-copied` no elemento copiado
-   Atributo `data-champs-copied="1"` no trigger

O estilo padrão está em:

    src/styles/champs-core-js.css

Classe base:

``` css
.champs-copied {
  outline: 2px solid rgba(25, 135, 84, 0.5);
}
```

Você pode sobrescrever no seu projeto:

``` css
.champs-copied {
  background-color: #d1e7dd;
}
```

------------------------------------------------------------------------

## 🔔 Evento Disparado

    champs:copied

`event.detail`:

``` js
{
  source: "direct" | "from" | "self",
  text: "conteúdo copiado",
  ok: true | false
}
```

------------------------------------------------------------------------

------------------------------------------------------------------------

# 📘 Documentação Técnica --- AjaxForm e Pipeline

Esta seção documenta exclusivamente o módulo **AjaxForm** e todos os
atributos `data-champs-*` relacionados ao seu funcionamento.

Nenhuma seção anterior foi modificada.

------------------------------------------------------------------------

## 🔹 1. Ativação Base

  ------------------------------------------------------------------------------------------------------------------------
Atributo                            Obrigatório      Tipo                 Padrão    Função        Observações
  ----------------------------------- ---------------- -------------------- --------- ------------- ----------------------
`data-champs-ajax`                  ✅                flag                 ---       Ativa o       Elemento passa a
AjaxForm no   responder a eventos
elemento      configurados

`data-champs-ajax-route`            ✅                string               ---       Define a URL  Sem este atributo o
da requisição AjaxForm não executa

`data-champs-ajax-method`           ❌                string               POST      Método HTTP   Convertido para
da requisição uppercase

`data-champs-ajax-trigger`          ❌                click/change/input   click     Define o      
evento que    
dispara o     
Ajax

`data-champs-ajax-disable-button`   ❌                boolean              true      Desabilita o  Evita double submit
elemento      
durante       
execução

`data-champs-ajax-confirm`          ❌                string               ---       Exibe modal   Usa
de            ModalManager.confirm
confirmação   
automático

`data-champs-ajax-form`             ❌                string               form mais Define qual   Busca por name do form
próximo   form será     
usado
  ------------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

## 🔹 2. Controle de Gatilho (Trigger = input)

  -----------------------------------------------------------------------------------------------
Atributo                        Obrigatório      Tipo    Padrão    Função       Observações
  ------------------------------- ---------------- ------- --------- ------------ ---------------
`data-champs-ajax-min-length`   ❌                int     0         Mínimo de    Usado apenas
caracteres   com
antes de     trigger=input
disparar

`data-champs-ajax-debounce`     ❌                int     0         Delay antes  Usado apenas
(ms)              de executar  com
requisição   trigger=input
  -----------------------------------------------------------------------------------------------

------------------------------------------------------------------------

## 🔹 3. Controle de Payload

### 3.1 Inclusão de Inputs do Form

  -----------------------------------------------------------------------------------------------
Atributo                         Obrigatório      Tipo      Padrão    Função    Observações
  -------------------------------- ---------------- --------- --------- --------- ---------------
`data-champs-ajax-with-inputs`   ❌                boolean   false     Envia     Caso false,
todos os  envia apenas
inputs do data-fields +
form      valor do
trigger

  -----------------------------------------------------------------------------------------------

------------------------------------------------------------------------

### 3.2 Conflito Form x Data-Attr

  ---------------------------------------------------------------------------------------------------------
Atributo                                Obrigatório      Tipo    Padrão    Função       Observações
  --------------------------------------- ---------------- ------- --------- ------------ -----------------
`data-champs-ajax-priorize-data-attr`   ❌                CSV     ---       Força        Ex:
data-field   "campo1,campo2"
vencer       
conflito com
form

  ---------------------------------------------------------------------------------------------------------

Regra padrão:\
Form vence conflito, exceto campos listados neste atributo.

------------------------------------------------------------------------

### 3.3 Data Fields Sempre Enviados

  -------------------------------------------------------------------------------------------
Padrão                       Obrigatório         Tipo      Função       Observações
  ---------------------------- ------------------- --------- ------------ -------------------
`data-champs-ajax-field-*`   ❌                   string    Envia campo  Sempre enviados,
extra no     mesmo com
payload      with-inputs=false

  -------------------------------------------------------------------------------------------

Exemplo:

``` html
<button
  data-champs-ajax
  data-champs-ajax-route="/rota"
  data-champs-ajax-field-user-id="10"
>
```

------------------------------------------------------------------------

## 🔹 4. Estrutura Esperada do Backend

Formato recomendado:

``` json
{
  "actions": [
    { "type": "message", "text": "Salvo!" },
    { "type": "redirect", "url": "/dashboard" }
  ]
}
```

Compatível com:

-   `{ "action": {...} }`
-   Array direto

Porém, cada action pode receber informações diferentes, na tabela abaixo todas as informações que podem ser retornadas

------------------------------------------------------------------------

## 🔹 5. Pipeline de Actions

As actions são executadas sequencialmente.

### Actions Terminais

Interrompem o pipeline:

Action             Terminal
  ------------------ ----------
validation-error   ✅
redirect           ✅
reload             ✅

------------------------------------------------------------------------

## 🔹 6. Actions Disponíveis

| Action           | Terminal | Espera             | Data            | Módulo Envolvido | Função
|------------------|----------|--------------------|-----------------| -- | -- |
| message          | ❌        | text/html          | Message         | Exibe mensagem global
| validation-error | ✅        | fields             | ValidationError | Marca campos inválidos 
| formfiller       | ❌        | data               | FormFiller      | Preenche campos por classe
| populate         | ❌        | data_response      | FormPopulation  | Popula select/input filho
| modal            | ❌        | title/body/buttons | ModalManager    | Abre modal                                                         
| custom           | ❌        | function           | window global   | Executa função custom
| redirect         | ✅        | url                | window.location | Redireciona
| reload           | ✅        | ---                | window.location | Recarrega página
  ------------------------------------------------------------------------------------------

## 🔹 7. Atributos Relacionados à Action populate

| Atributo                     | Obrigatório | Função |
|------------------------------|-------------| --- |
| `data-champs-populate-child` | ✅           | (frontend) Define seletor do elemento filho a ser populado

------------------------------------------------------------------------
## 🔹 8. Segurança e Comportamento Interno

-   O valor do elemento gatilho é sempre enviado se possuir `name`.
-   Se houver `validation-error`, o botão é reabilitado automaticamente.
-   Se o backend não retornar JSON válido, é exibida mensagem de erro.
-   `validation-error`, `redirect` e `reload` interrompem execução
    subsequente.


------------------------------------------------------------------------

# 🔹 Módulo: AutoOpen

Permite abrir automaticamente qualquer elemento que já possua
comportamento declarativo (Bootstrap Modal, AjaxForm, etc.) sem
necessidade de JavaScript local.

O módulo executa `.click()` no elemento após o carregamento da página.

## ✅ Ativação

``` html
data-champs-auto-open="onload"
```

## 🔧 Atributos Disponíveis

| Atributo                      | Obrigatório | Função |
|-------------------------------|-------------| --- |
| `data-champs-auto-open`       | ✅           | Define quando abrir automaticamente. Atualmente suporta`onload`.
| `data-champs-auto-open-delay` | ❌           | Delay em milissegundos antes de disparar o clique.
| `data-champs-auto-open-once`  | ❌           | Se `true`, abre apenas uma vez (usa localStorage).
| `data-champs-auto-open-key`   | ❌           | Chave usada para controle de abertura única.
  ----------------------------------------------------------------------------

## 📌 Exemplos

### Abrir Modal Bootstrap automaticamente

``` html
<button
  class="d-none"
  data-champs-auto-open="onload"
  data-champs-auto-open-delay="300"
  data-bs-toggle="modal"
  data-bs-target="#meuModal">
</button>
```

------------------------------------------------------------------------

# 🔹 Módulo: ConsentManager (LGPD / Cookies)

Gerencia consentimento de cookies e categorias de rastreamento.

## ✅ Ativação

``` html
<body
  data-champs-consent
  data-champs-consent-version="2026-03-01"
  data-champs-consent-policy-url="/privacidade"
  data-champs-consent-categories="analytics,marketing"
  data-champs-consent-default-analytics="false"
  data-champs-consent-default-marketing="false"
>
```

## 🔧 Atributos de Configuração

| Atributo                                   | Obrigatório | Função                                            |
|--------------------------------------------|-------------|---------------------------------------------------| 
| `data-champs-consent`                      | ✅           | Ativa o módulo                                    
| `data-champs-consent-version`              | ✅           | Versão do consentimento (se mudar, reabre banner) |
| `data-champs-consent-policy-url`           | ❌           | Link para política de privacidade                 |
| `data-champs-consent-categories`           | ❌           | Lista de categorias separadas por vírgula 
| `data-champs-consent-default-{categoria}`  | ❌           | Valor padrão da categoria                         |
| `data-champs-consent-template`             | ❌           | Seletor de template customizado                   |
  ----------------------------------------------------------------------------------------

## 📌 Estrutura do Consentimento Armazenado

``` json
{
  "version": "2026-03-01",
  "categories": {
    "necessary": true,
    "analytics": false,
    "marketing": false
  },
  "updatedAt": "2026-03-01T12:00:00-03:00"
}
```

## 🔹 Eventos Disparados

### champs:consent:ready

``` javascript
document.addEventListener('champs:consent:ready', (e) => {
  const { consent } = e.detail;
});
```

### champs:consent:changed

``` javascript
document.addEventListener('champs:consent:changed', (e) => {
  const { consent } = e.detail;
});
```

## 🔹 API Pública

``` javascript
window.Champs.consent.get()
window.Champs.consent.has('analytics')
window.Champs.consent.openPreferences()
window.Champs.consent.reset()
```

------------------------------------------------------------------------

# 🔹 Módulo: Validate (CPF / CNPJ / IE)

Validação declarativa via `data-champs-*` para:

-   CPF
-   CNPJ
-   CPF ou CNPJ automático
-   Inscrição Estadual (IE) -- todas as UFs
-   Dependência entre campos (ex.: IE depende de UF e Documento)

------------------------------------------------------------------------

## ✅ Ativação

``` html
data-champs-validate
```

------------------------------------------------------------------------

# 🔧 Atributos Disponíveis

  -------------------------------------------------------------------------------------
Atributo                               Obrigatório                 Função
  -------------------------------------- --------------------------- ------------------
`data-champs-validate`                 ✅                          Ativa o módulo no
elemento

`data-champs-validate-type`            ❌                          Tipo: `cpf`,
`cnpj`, `cpfcnpj`,
`ie` (default:
`cpfcnpj`)

`data-champs-validate-trigger`         ❌                          Evento que dispara
validação: `blur`,
`input`, `change`
(default: `blur`)

`data-champs-validate-message`         ❌                          Mensagem
customizada de
erro

`data-champs-validate-feedback`        ❌                          Seletor de onde
escrever a
mensagem de erro

`data-champs-validate-triggers`        ❌                          Lista de seletores
que devem ser
revalidados quando
este campo mudar

`data-champs-validate-uf-from`         ❌                          Seletor do campo
UF (usado para IE)

`data-champs-validate-doc-from`        ❌                          Seletor do campo
Documento (usado
para IE)

`data-champs-validate-requires`        ❌                          Exige tipo
específico de
documento (`cnpj`)

`data-champs-validate-disable-until`   ❌                          Desabilita o campo
até que o
documento seja do
tipo informado
  -------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 🔄 Dependência entre campos

## 🔹 Revalidar outro campo quando este mudar

``` html
<select id="uf"
        data-champs-validate-triggers="#ie">
</select>
```

------------------------------------------------------------------------

## 🔹 IE buscar UF de outro campo

``` html
<input id="ie"
       data-champs-validate
       data-champs-validate-type="ie"
       data-champs-validate-uf-from="#uf">
```

------------------------------------------------------------------------

## 🔹 IE depender do tipo de Documento

``` html
<input id="ie"
       data-champs-validate
       data-champs-validate-type="ie"
       data-champs-validate-doc-from="#doc"
       data-champs-validate-requires="cnpj">
```

Comportamento:

-   Documento = CPF → IE fica neutra
-   Documento = CNPJ → IE valida normalmente

------------------------------------------------------------------------

## 🔹 Desabilitar IE até Documento ser CNPJ

``` html
<input id="ie"
       data-champs-validate
       data-champs-validate-type="ie"
       data-champs-validate-uf-from="#uf"
       data-champs-validate-doc-from="#doc"
       data-champs-validate-requires="cnpj"
       data-champs-validate-disable-until="cnpj">
```

------------------------------------------------------------------------

# 🎨 Integração Visual

O módulo aplica automaticamente:

-   `is-valid`
-   `is-invalid`
-   `.invalid-feedback`

Compatível com Bootstrap 5.

------------------------------------------------------------------------

# 🔗 Integração com ValidationError global

Se existir:

``` js
window.Champs.validationError = function(el, message, context) {
   ...
}
```

O Validate chamará automaticamente essa função quando o campo ficar
inválido.

------------------------------------------------------------------------

# 📡 Evento Disparado

``` js
document.addEventListener('champs:validated', (e) => {
   console.log(e.detail);
});
```

Estrutura:

``` js
{
  el,
  valid,
  neutral,
  type,
  detected,
  value,
  message,
  context
}
```

------------------------------------------------------------------------

# 🧠 Fluxo Implementado

-   IE só valida se UF estiver informada
-   IE pode depender do tipo de documento
-   IE pode ficar desabilitada até documento correto
-   Campos podem revalidar outros automaticamente
-   Integração visual Bootstrap
-   Integração opcional com sistema global de erro
